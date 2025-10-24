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

export const placeOrder = async (req, res) => {
  const { address_id, cart_id, shop_id, payment_method, amount, clerkId, payment_status } = req.body;
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
  const { data: cartItems, error: cartItemsError } = await supabase
    .from("Cart_items")
    .select("quantity, item_id")
    .eq("cart_id", cart_id);
  if (cartItemsError) {
    return res.status(500).json({ message: "Failed to fetch cart items" });
  }
  // Update sold quantity for all items in parallel
  await Promise.all(
    cartItems.map(({ item_id, quantity }) =>
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

