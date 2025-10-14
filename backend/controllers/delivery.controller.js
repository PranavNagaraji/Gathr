import supabase from '../db.js';
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

import { clerkClient } from "@clerk/clerk-sdk-node";

export const getDelivery = async (req, res) => {
    const { clerkId, lat, long } = req.body;
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('id, role')
      .eq('clerk_id', clerkId)
      .single();
    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== 'carrier') {
      return res.status(403).json({ message: "Unauthorized: Only logged in users can get Addresses" });
    }
    const {data, error}=await supabase.from("Orders").select("*, Addresses(*)").eq("status", "accepted");
}