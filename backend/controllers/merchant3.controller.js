import supabase from "../db.js";
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });
export const getPendingCarts = async (req, res) => {
    try {
        const { clerkId } = req.params; 
        const { data: user, error: userError } = await supabase
            .from('Users')
            .select('id, role')
            .eq('clerk_id', clerkId)
            .single();
        if (userError || !user) {
            return res.status(404).json({ message: "User not found." });
        }
        if (user.role !== "merchant") {
            return res.status(403).json({ message: "User is not a merchant." });
        }

        const { data: shop , error: shopError } = await supabase
            .from("Shops")
            .select("*")
            .eq("owner_id", user.id)
            .single();
        if (shopError || !shop) {
            return res.status(404).json({ message: "Shop not found for this user." });
        }

        const { data: carts, error } = await supabase
            .from("Orders")
            .select("*, Cart(* , Cart_items(* , Items(*))), Addresses(*)")
            .eq("status", "pending")
            .eq("shop_id", shop.id)
            .order("created_at", { ascending: false });
        if (error) {
            return res.status(500).json({ message: "Failed to fetch carts.", error: error.message });
        }
        return res.status(200).json({ carts });
    } catch (err) {
        return res.status(500).json({ message: "Internal server error", error: err.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { clerkId, orderId, status } = req.body;
        const { data: user, error: userError } = await supabase
            .from('Users')
            .select('id, role')
            .eq('clerk_id', clerkId)
            .single();
        if (userError || !user) {
            return res.status(404).json({ message: "User not found." });
        }
        if (user.role !== "merchant") {
            return res.status(403).json({ message: "User is not a merchant." });
        }
        const { data: order, error } = await supabase
            .from("Orders")
            .select("*")
            .eq("id", orderId)
            .single();
        if (error) {
            return res.status(500).json({ message: "Failed to fetch order.", error: error.message });
        }
        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }

        const { data: shop , error: shopError } = await supabase
            .from("Shops")
            .select("*")
            .eq("owner_id", user.id)
            .single();
        if (shopError || !shop) {
            return res.status(404).json({ message: "Shop not found for this user." });
        }
        if (shop.id !== order.shop_id) {
            return res.status(403).json({ message: "You are not authorized to update this order." });
        }

        await supabase.from("Orders").update({ status: status }).eq("id", orderId);
        return res.status(200).json({ message: "Order status updated successfully." });
    } catch (err) {
        return res.status(500).json({ message: "Internal server error", error: err.message });
    }
};

export const get_all_carts = async (req,res)=>{
    const { clerkId } = req.params;

    const { data: user, error: userError } = await supabase
        .from('Users')
        .select('id, role')
        .eq('clerk_id', clerkId)
        .single();

    if (userError || !user) {
        return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== 'merchant') {
        return res.status(403).json({ message: "Unauthorized: Only logged in users can get cart history" });
    }

    const { data: shop , error: shopError } = await supabase
            .from("Shops")
            .select("*")
            .eq("owner_id", user.id)
            .single();
    if (shopError || !shop) {
        return res.status(404).json({ message: "Shop not found for this user." });
    }

    const { data: carts, error } = await supabase
        .from("Orders")
        .select("*, Cart(* , Cart_items(* , Items(*))), Addresses(*), Users:carrier_id(*)")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false });
    if (error) {
        return res.status(500).json({ message: "Failed to fetch carts.", error: error.message });
    }
    return res.status(200).json({ carts });
        
}