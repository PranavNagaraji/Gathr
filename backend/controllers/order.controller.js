import supabase from '../db.js';
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export const getCheckoutDetails = async (req, res) => {
  // console.log(0);
  try {
    // console.log(1);
    const { clerkId } = req.params;
    // console.log(2);
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('id, role')
      .eq('clerk_id', clerkId)
      .maybeSingle(); // ✅ use maybeSingle() to avoid throwing

    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== 'customer') {
      return res.status(403).json({ message: "Unauthorized: Only logged-in users can access checkout" });
    }

    const { data: cart, error: cartError } = await supabase
      .from("Cart")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(); // ✅ same fix

    if (cartError || !cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const { data: cartItems, error: cartItemError } = await supabase
      .from("Cart_items")
      .select("quantity, Items(*)")
      .eq("cart_id", cart.id);

    if (cartItemError || !cartItems?.length) {
      return res.status(404).json({ message: "Cart Items not found" });
    }

    let totalPrice = 0;
    for (let item of cartItems) {
      totalPrice += item.Items.price * item.quantity;
    }

    return res.status(200).json({
      totalPrice,
      shop_id: cartItems[0].Items.shop_id,
      cart_id: cart.id,
      cartItems,
    });
  } catch (err) {
    console.error("Server error in getCheckoutDetails:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Compute GST and delivery fee based on distance between shop and a selected address (no schema change)
export const getPriceBreakdown = async (req, res) => {
  try {
    const { clerkId, addressId } = req.body || {};
    if (!clerkId || !addressId) {
      return res.status(400).json({ message: "Missing clerkId or addressId" });
    }

    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('id, role')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== 'customer') {
      return res.status(403).json({ message: "Unauthorized: Only customers can get price breakdown" });
    }

    // Get active cart
    const { data: cart, error: cartError } = await supabase
      .from('Cart')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (cartError || !cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Get cart items with item details
    const { data: cartItems, error: itemsError } = await supabase
      .from('Cart_items')
      .select('quantity, Items(*)')
      .eq('cart_id', cart.id);

    if (itemsError || !cartItems?.length) {
      return res.status(404).json({ message: 'Cart items not found' });
    }

    const shopId = cartItems[0].Items.shop_id;

    // Fetch shop location
    const { data: shop, error: shopError } = await supabase
      .from('Shops')
      .select('id, Location')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Fetch address location
    const { data: address, error: addressError } = await supabase
      .from('Addresses')
      .select('id, location')
      .eq('id', addressId)
      .eq('user_id', user.id)
      .single();

    if (addressError || !address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Compute subtotal
    const subtotal = cartItems.reduce((sum, ci) => sum + (ci.Items?.price || 0) * (ci.quantity || 0), 0);

    // Haversine distance
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
      return res.status(400).json({ message: 'Missing coordinates to compute delivery distance' });
    }

    const distanceKm = getDistanceKm(Number(shopLat), Number(shopLong), Number(destLat), Number(destLong));

    // Fees (override with env if present)
    const GST_RATE = parseFloat(process.env.GST_RATE || '0.18');
    const DELIVERY_BASE_KM = parseFloat(process.env.DELIVERY_BASE_KM || '2');
    const DELIVERY_BASE_FEE = parseFloat(process.env.DELIVERY_BASE_FEE || '30');
    const DELIVERY_PER_KM_FEE = parseFloat(process.env.DELIVERY_PER_KM_FEE || '10');

    const extraKm = Math.max(0, distanceKm - DELIVERY_BASE_KM);
    const deliveryFee = DELIVERY_BASE_FEE + Math.ceil(extraKm) * DELIVERY_PER_KM_FEE;
    const gst = subtotal * GST_RATE;

    const total = subtotal + gst + deliveryFee;

    return res.status(200).json({
      cartId: cart.id,
      shop_id: shopId,
      cartItems,
      subtotal,
      gst,
      deliveryFee,
      total,
      distanceKm,
    });
  } catch (err) {
    console.error('Error in getPriceBreakdown:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

export const placeOrder = async (req, res) => {
  const { address_id, cart_id, shop_id, payment_method, clerkId, payment_status } = req.body;
  const { data: user, error: userError } = await supabase
    .from('Users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();
  if (userError || !user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.role !== 'customer') {
    return res.status(403).json({ message: "Unauthorized: Only logged in users can post comments" });
  }
  // Compute amounts securely on server
  const { data: cartItems, error: cartItemsError0 } = await supabase
    .from("Cart_items")
    .select("quantity, Items(*)")
    .eq("cart_id", cart_id);
  if (cartItemsError0 || !cartItems?.length) {
    return res.status(404).json({ message: "Cart Items not found" });
  }
  const subtotal = cartItems.reduce((sum, ci) => sum + (ci.Items?.price || 0) * (ci.quantity || 0), 0);
  const { data: shop, error: shopError } = await supabase
    .from('Shops')
    .select('id, Location')
    .eq('id', shop_id)
    .single();
  if (shopError || !shop) {
    return res.status(404).json({ message: 'Shop not found' });
  }
  const { data: address, error: addressError } = await supabase
    .from('Addresses')
    .select('id, location')
    .eq('id', address_id)
    .eq('user_id', user.id)
    .single();
  if (addressError || !address) {
    return res.status(404).json({ message: 'Address not found' });
  }
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
    return res.status(400).json({ message: 'Missing coordinates to compute delivery distance' });
  }
  const distanceKm = getDistanceKm(Number(shopLat), Number(shopLong), Number(destLat), Number(destLong));
  const GST_RATE = parseFloat(process.env.GST_RATE || '0.18');
  const DELIVERY_BASE_KM = parseFloat(process.env.DELIVERY_BASE_KM || '2');
  const DELIVERY_BASE_FEE = parseFloat(process.env.DELIVERY_BASE_FEE || '30');
  const DELIVERY_PER_KM_FEE = parseFloat(process.env.DELIVERY_PER_KM_FEE || '10');
  const extraKm = Math.max(0, distanceKm - DELIVERY_BASE_KM);
  const deliveryFee = DELIVERY_BASE_FEE + Math.ceil(extraKm) * DELIVERY_PER_KM_FEE;
  const gst = subtotal * GST_RATE;
  const amount = subtotal + gst + deliveryFee;
  const { data: orderData, error: orderError } = await supabase
    .from("Orders")
    .insert({
      customer_id: user.id,
      address_id: address_id,
      cart_id: cart_id,
      shop_id: shop_id,
      payment_method: payment_method,
      amount_paid: amount,
      payment_status
    })
    .select();

  if (orderError) {
    console.error("Insert failed:", orderError);
    return res.status(500).json({ message: "Failed to create order", error: orderError });
  }

  console.log("Order created:", orderData);
  const { data: cartItemsUpdate, error: cartItemsError } = await supabase
    .from("Cart_items")
    .select("quantity, item_id")
    .eq("cart_id", cart_id);
  if (cartItemsError) {
    return res.status(500).json({ message: "Failed to fetch cart items" });
  }
  // Update sold quantity for all items in parallel
  await Promise.all(
    cartItemsUpdate.map(({ item_id, quantity }) =>
      supabase
        .from("Items")
        .update({ sold_qt: supabase.rpc("increment", { column: "sold_qt", by: quantity }) })
        .eq("id", item_id)
    )
  );
  console.log("Cart updated");
  const { data: cart, error: cartError } = await supabase.from("Cart").update({ status: "inactive" }).eq("id", cart_id).single();
  if (cartError)
    return res.status(404).json({ message: "Cart not found" });
  if (cartItemsError)
    return res.status(404).json({ message: "Cart Items not found" });
  return res.status(200).json({ message: "Order placed successfully" });
  console.log("Cart updated2");
}

