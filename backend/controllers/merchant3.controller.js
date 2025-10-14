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
        const { data: carts, error } = await supabase
            .from("Orders")
            .select("*")
            .eq("status", "pending")
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
        await supabase.from("Orders").update({ status: status }).eq("id", orderId);
        return res.status(200).json({ message: "Order status updated successfully." });
    } catch (err) {
        return res.status(500).json({ message: "Internal server error", error: err.message });
    }
};