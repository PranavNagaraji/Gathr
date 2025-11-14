// Written entirely by Ankit Kumar
// Complete Stripe Payment Integration - All-in-One Backend File
import express from "express";
import Stripe from "stripe";
import supabase from "./db.js";
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });
const FRONTEND_URL = process.env.FRONTEND_URL;
console.log(FRONTEND_URL);

// Helper Functions
async function getUserByClerkId(clerkId) {
  const { data: user, error } = await supabase
    .from("Users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .single();

  if (error || !user) return null;
  return user;
}

async function getOrderById(orderId) {
  // First get the order details
  const { data: order, error: orderError } = await supabase
    .from("Orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error("Failed to get order:", orderId, "Error:", orderError);
    return null;
  }

  // Then get cart items through the cart_id
  const { data: cartItems, error: cartItemsError } = await supabase
    .from("Cart_items")
    .select("*, Items(*)")
    .eq("cart_id", order.cart_id);

  if (cartItemsError) {
    console.error("Failed to get cart items for order:", orderId, "Error:", cartItemsError);
    return null;
  }

  console.log("✓ Order fetched:", orderId, "Items:", cartItems?.length);

  // Transform the data
  return {
    ...order,
    items: cartItems?.map(item => ({
      id: item.Items.id,
      name: item.Items.name,
      description: item.Items.description,
      price: item.Items.price,
      quantity: item.quantity
    })) || []
  };
}

// Stripe Service Functions
async function createCheckoutSession({ lineItems, successUrl, cancelUrl, metadata }) {
  const basePayload = {
    line_items: lineItems,
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: metadata || {},
    currency: "inr",
  };

  // Prefer UPI if explicitly enabled via env; otherwise default to card-only
  const wantUpi = String(process.env.STRIPE_ENABLE_UPI || '').toLowerCase() === 'true';
  const withPMTypes = (types) => ({ ...basePayload, payment_method_types: types });

  try {
    const pmTypes = wantUpi ? ["card", "upi"] : ["card"];
    return await stripe.checkout.sessions.create(withPMTypes(pmTypes));
  } catch (error) {
    // If UPI or unsupported type caused failure, retry with card only
    const msg = (error && (error.message || error.toString())) || '';
    const shouldRetryCardOnly = msg.includes('payment_method_types') || msg.includes('parameter_unknown') || msg.includes('Invalid payment_method_types');
    if (wantUpi && shouldRetryCardOnly) {
      console.warn('Checkout: UPI not supported on this account/env. Falling back to card-only.');
      return await stripe.checkout.sessions.create(withPMTypes(["card"]));
    }
    console.error("Error creating Stripe checkout session:", error);
    throw new Error(`Failed to create checkout session: ${error.message}`);
  }
}

async function retrieveSession(sessionId) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
    return session;
  } catch (error) {
    console.error("Error retrieving Stripe session:", error);
    throw new Error(`Failed to retrieve session: ${error.message}`);
  }
}

// Payment Controllers
async function createOrderFromCartHandler(req, res) {
  try {
    const { clerkId, addressId } = req.body;

    if (!clerkId) {
      return res.status(400).json({ error: "clerkId is required" });
    }

    if (!addressId) {
      return res.status(400).json({ error: "addressId is required" });
    }

    const user = await getUserByClerkId(clerkId);
    if (!user) {
      console.error("User not found for clerkId:", clerkId);
      return res.status(404).json({ error: "User not found" });
    }
    console.log("✓ User found:", user.id, "Role:", user.role);

    if (user.role !== "customer") {
      return res.status(403).json({ error: "Only customers can create orders" });
    }

    // Get user's active cart
    const { data: cart, error: cartError } = await supabase
      .from("Cart")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (cartError || !cart) {
      console.error("No active cart found for user:", user.id, "Error:", cartError);
      return res.status(404).json({ error: "No active cart found" });
    }
    console.log("✓ Active cart found:", cart.id);

    // Get cart items with item details (use same pattern as working cart)
    const { data: cartItems, error: itemsError } = await supabase
      .from("Cart_items")
      .select("*, Items(*)")
      .eq("cart_id", cart.id);

    // Add detailed error logging
    if (itemsError) {
      console.error("Failed to fetch cart items - Supabase error:", itemsError);
      return res.status(500).json({
        error: "Failed to fetch cart items",
        details: itemsError.message
      });
    }

    if (!cartItems || cartItems.length === 0) {
      console.error("Cart is empty for cart_id:", cart.id);
      return res.status(400).json({ error: "Cart is empty" });
    }
    console.log("✓ Cart items fetched:", cartItems.length, "items");

    // Group items by shop (assuming one shop per order)
    const shopId = cartItems[0].Items?.shop_id;
    console.log("✓ Shop ID extracted:", shopId);

    const subtotal = cartItems.reduce((sum, item) => {
      const itemPrice = item.Items?.price || 0;
      const itemQty = item.quantity || 0;
      console.log(`  Item: ${item.Items?.name}, Price: ${itemPrice}, Qty: ${itemQty}`);
      return sum + (itemPrice * itemQty);
    }, 0);
    console.log("✓ Subtotal calculated:", subtotal);

    // Validate that the provided address belongs to the user
    const { data: address, error: addressError } = await supabase
      .from("Addresses")
      .select("*")
      .eq("id", addressId)
      .eq("user_id", user.id)
      .single();

    if (addressError || !address) {
      console.error("Invalid address for user:", user.id, "Address:", addressId, "Error:", addressError);
      return res.status(400).json({
        error: "Invalid address",
        message: "The selected address is not valid"
      });
    }

    console.log("✓ Using address:", addressId);

    // Load shop location for distance-based delivery
    const { data: shop, error: shopError } = await supabase
      .from("Shops")
      .select("id, Location")
      .eq("id", shopId)
      .single();
    if (shopError || !shop) {
      return res.status(404).json({ error: "Shop not found for delivery computation" });
    }

    // Compute distance (Haversine)
    const toRad = (v) => (v * Math.PI) / 180;
    const getDistanceKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const shopLat = shop?.Location?.latitude ?? shop?.Location?.lat;
    const shopLong = shop?.Location?.longitude ?? shop?.Location?.long;
    const destLat = address?.location?.lat ?? address?.location?.latitude;
    const destLong = address?.location?.long ?? address?.location?.longitude;
    if ([shopLat, shopLong, destLat, destLong].some(v => v == null)) {
      return res.status(400).json({ error: "Missing coordinates for delivery computation" });
    }
    const distanceKm = getDistanceKm(Number(shopLat), Number(shopLong), Number(destLat), Number(destLong));

    // Compute GST and delivery fee (configurable via env)
    const GST_RATE = parseFloat(process.env.GST_RATE || '0.18');
    const DELIVERY_BASE_KM = parseFloat(process.env.DELIVERY_BASE_KM || '2');
    const DELIVERY_BASE_FEE = parseFloat(process.env.DELIVERY_BASE_FEE || '30');
    const DELIVERY_PER_KM_FEE = parseFloat(process.env.DELIVERY_PER_KM_FEE || '10');

    const extraKm = Math.max(0, distanceKm - DELIVERY_BASE_KM);
    const deliveryFee = DELIVERY_BASE_FEE + Math.ceil(extraKm) * DELIVERY_PER_KM_FEE;
    const gst = subtotal * GST_RATE;
    const totalAmount = subtotal + gst + deliveryFee;
    console.log("✓ Totals:", { subtotal, gst, deliveryFee, totalAmount, distanceKm });

    // Create the order
    console.log("Creating order:", {
      customer_id: user.id,
      shop_id: shopId,
      address_id: addressId,
      amount_paid: totalAmount,
      item_count: cartItems.length
    });

    const { data: order, error: orderError } = await supabase
      .from("Orders")
      .insert({
        customer_id: user.id,
        shop_id: shopId,
        cart_id: cart.id,
        address_id: addressId,
        amount_paid: totalAmount,
        payment_status: "pending",
        payment_method: "stripe"
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return res.status(500).json({
        error: "Failed to create order",
        details: orderError.message
      });
    }

    console.log("✓ Order created successfully:", order.id);

    // Link cart items to the order (update cart_items with order_id)
    await supabase
      .from("Cart_items")
      .update({ order_id: order.id })
      .eq("cart_id", cart.id);

    // Mark cart as completed
    await supabase
      .from("Cart")
      .update({ status: "completed" })
      .eq("id", cart.id);

    return res.json({ order });

  } catch (error) {
    console.error("Error creating order from cart:", error);
    return res.status(500).json({
      error: "Failed to create order from cart",
      details: error.message
    });
  }
}

async function createCheckoutSessionHandler(req, res) {
  try {
    const { orderId, clerkId } = req.body;

    if (!orderId || !clerkId) {
      return res.status(400).json({
        error: "Missing required fields: orderId and clerkId are required"
      });
    }

    const user = await getUserByClerkId(clerkId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "customer") {
      return res.status(403).json({ error: "Only customers can create checkout sessions" });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.customer_id !== user.id) {
      return res.status(403).json({ error: "You can only checkout your own orders" });
    }

    if (order.payment_status === "paid") {
      return res.status(400).json({ error: "Order is already paid" });
    }

    if (!order.items || order.items.length === 0) {
      return res.status(400).json({ error: "Order has no items" });
    }

    // Map order items to Stripe line items
    const itemSubtotal = order.items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0);
    const lineItems = order.items.map(item => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: item.name,
          description: item.description || "",
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // Recompute GST and delivery for the order
    let extraLineItems = [];
    try {
      const { data: shop, error: shopError } = await supabase
        .from('Shops')
        .select('id, Location')
        .eq('id', order.shop_id)
        .single();
      const { data: address, error: addrError } = await supabase
        .from('Addresses')
        .select('id, location')
        .eq('id', order.address_id)
        .single();
      if (!shopError && !addrError && shop && address) {
        const toRad = (v) => (v * Math.PI) / 180;
        const getDistanceKm = (lat1, lon1, lat2, lon2) => {
          const R = 6371;
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };
        const shopLat = shop?.Location?.latitude ?? shop?.Location?.lat;
        const shopLong = shop?.Location?.longitude ?? shop?.Location?.long;
        const destLat = address?.location?.lat ?? address?.location?.latitude;
        const destLong = address?.location?.long ?? address?.location?.longitude;
        if ([shopLat, shopLong, destLat, destLong].every(v => v != null)) {
          const distanceKm = getDistanceKm(Number(shopLat), Number(shopLong), Number(destLat), Number(destLong));
          const GST_RATE = parseFloat(process.env.GST_RATE || '0.18');
          const DELIVERY_BASE_KM = parseFloat(process.env.DELIVERY_BASE_KM || '2');
          const DELIVERY_BASE_FEE = parseFloat(process.env.DELIVERY_BASE_FEE || '30');
          const DELIVERY_PER_KM_FEE = parseFloat(process.env.DELIVERY_PER_KM_FEE || '10');
          const extraKm = Math.max(0, distanceKm - DELIVERY_BASE_KM);
          const deliveryFee = DELIVERY_BASE_FEE + Math.ceil(extraKm) * DELIVERY_PER_KM_FEE;
          const gst = itemSubtotal * GST_RATE;
          if (gst > 0) {
            extraLineItems.push({
              price_data: {
                currency: 'inr',
                product_data: { name: `GST (${Math.round(GST_RATE*100)}%)` },
                unit_amount: Math.round(gst * 100),
              },
              quantity: 1,
            });
          }
          if (deliveryFee > 0) {
            extraLineItems.push({
              price_data: {
                currency: 'inr',
                product_data: { name: `Delivery Fee (${distanceKm.toFixed(1)} km)` },
                unit_amount: Math.round(deliveryFee * 100),
              },
              quantity: 1,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to compute GST/delivery for Stripe session:', e.message);
    }

    // Create checkout session
    const session = await createCheckoutSession({
      lineItems: [...lineItems, ...extraLineItems],
      successUrl: `${FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${FRONTEND_URL}/payment-cancelled`,
      metadata: {
        orderId: String(order.id),
        userId: String(user.id),
        clerkId: clerkId
      },
    });

    // Update order with Stripe session ID
    await supabase
      .from("Orders")
      .update({
        stripe_session_id: session.id,
        payment_status: "pending"
      })
      .eq("id", orderId);

    return res.json({
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error("Error creating checkout session:", error);
    return res.status(500).json({
      error: "Failed to create checkout session",
      details: error.message
    });
  }
}

async function getPaymentStatusHandler(req, res) {
  try {
    const { sessionId, clerkId } = req.body;

    if (!sessionId || !clerkId) {
      return res.status(400).json({ error: "sessionId and clerkId are required" });
    }

    const user = await getUserByClerkId(clerkId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find order by Stripe session ID
    const { data: order, error } = await supabase
      .from("Orders")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: "Order not found for this session" });
    }

    if (order.customer_id !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Retrieve Stripe session to get current payment status
    const stripeSession = await retrieveSession(sessionId);

    // Update order if payment is completed
    if (stripeSession.payment_status === 'paid' && order.payment_status !== 'paid') {
      await supabase
        .from("Orders")
        .update({
          payment_status: "paid",
          amount_paid: stripeSession.amount_total / 100,
          stripe_payment_intent_id: stripeSession.payment_intent
        })
        .eq("id", order.id);

      // Update order with latest payment info
      order.payment_status = "paid";
      order.amount_paid = stripeSession.amount_total / 100;
      order.stripe_payment_intent_id = stripeSession.payment_intent;
    }

    return res.json({
      orderId: order.id,
      paymentStatus: order.payment_status,
      stripeSessionId: order.stripe_session_id,
      amountPaid: order.amount_paid,
      stripePaymentIntentId: order.stripe_payment_intent_id
    });

  } catch (error) {
    console.error("Error getting payment status:", error);
    return res.status(500).json({
      error: "Failed to get payment status",
      details: error.message
    });
  }
}

// Webhook Handler
async function handleWebhook(req, res) {
  try {
    const payload = req.body;
    const signature = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Webhook event received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log(`Payment successful for session ${session.id}`);
        console.log(`Payment intent ID from Stripe: ${session.payment_intent}`);
        console.log(`Amount total: ${session.amount_total / 100}`);

        // Update order status to paid with Stripe payment intent ID
        const { error: updateError } = await supabase
          .from("Orders")
          .update({
            payment_status: "paid",
            amount_paid: session.amount_total / 100,
            stripe_payment_intent_id: session.payment_intent
          })
          .eq("stripe_session_id", session.id);

        if (updateError) {
          console.error('❌ Error updating order:', updateError);
          console.error('Session ID that failed:', session.id);
        } else {
          console.log('✅ Order updated successfully to paid status');
        }
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        console.log(`PaymentIntent failed: ${failedIntent.id}`);

        // Update order to failed status
        await supabase
          .from("Orders")
          .update({ payment_status: "failed" })
          .eq("stripe_payment_intent_id", failedIntent.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

// Refund Handler
async function refundHandler(req, res) {
  try {
    const { orderId, clerkId, amount } = req.body;

    if (!orderId || !clerkId) {
      return res.status(400).json({
        error: "Missing required fields: orderId and clerkId are required"
      });
    }

    const user = await getUserByClerkId(clerkId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "merchant") {
      return res.status(403).json({ error: "Only merchants can process refunds" });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.payment_status !== "paid") {
      return res.status(400).json({
        error: "Can only refund paid orders",
        currentStatus: order.payment_status
      });
    }

    if (!order.stripe_payment_intent_id) {
      return res.status(400).json({ error: "No payment intent found for this order" });
    }

    // Create refund with Stripe
    let refundAmount = amount ? Math.round(amount * 100) : undefined;
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: refundAmount
    });

    // Update order status
    await supabase
      .from("Orders")
      .update({
        payment_status: "refunded",
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    return res.json({
      message: "Refund processed successfully",
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        created: refund.created
      }
    });

  } catch (error) {
    console.error("Error processing refund:", error);
    return res.status(500).json({
      error: "Failed to process refund",
      details: error.message
    });
  }
}

// Create Router
const router = express.Router();

// Routes
router.post("/create-order-from-cart", createOrderFromCartHandler);
router.post("/create-checkout-session", createCheckoutSessionHandler);
router.post("/payment-status", getPaymentStatusHandler);
router.post("/webhook", handleWebhook);
router.post("/refund", refundHandler);

export default router;
