import supabase from '../db.js';
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export const getDelivery = async (req, res) => {
    try {
        const { clerkId, lat, long } = req.body;
        if (!clerkId || lat == null || long == null) {
            return res.status(400).json({ message: "Missing clerkId, lat, or long" });
        }
        const { data: user, error: userError } = await supabase
            .from("Users")
            .select("id, role")
            .eq("clerk_id", clerkId)
            .single();
        if (userError || !user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== "carrier") {
            return res
                .status(403)
                .json({ message: "Unauthorized: Only carriers can get addresses" });
        }
        const { data: acceptedOrders, error } = await supabase
            .from("Orders")
            .select(`
        *,
        Addresses(*),
        Shops(*)
      `).eq('status', 'accepted');
        if (error) {
            return res.status(403).json({ error });
        }
        const toRad = (value) => (value * Math.PI) / 180;
        const getDistanceKm = (lat1, lon1, lat2, lon2) => {
            const R = 6371;
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(toRad(lat1)) *
                Math.cos(toRad(lat2)) *
                Math.sin(dLon / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };
        const radiusKm = 5;
        const nearbyOrders = acceptedOrders.filter(order => {
            const loc = order.Addresses?.location;
            if (!loc || loc.lat == null || loc.long == null) return false;
            const distance = getDistanceKm(lat, long, loc.lat, loc.long);
            return distance <= radiusKm;
        });
        return res.status(200).json({ ordersAndShop: nearbyOrders });
    } catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const acceptDelivery = async (req, res) => {
    try {
        const { clerkId, orderId } = req.body;
        if (!clerkId || !orderId) {
            return res.status(400).json({ message: "Missing clerkId or orderId" });
        }
        const { data: user, error: userError } = await supabase
            .from("Users")
            .select("id, role")
            .eq("clerk_id", clerkId)
            .single();
        if (userError || !user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== "carrier") {
            return res
                .status(403)
                .json({ message: "Unauthorized: Only carriers can accept deliveries" });
        }
        await supabase.from("Orders").update({ carrier_id: user.id, status: "ontheway" }).eq("id", orderId);
        return res.status(200).json({ message: "Delivery accepted successfully" });
    } catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getOnTheWay = async (req, res) => {
    try {
        const { clerkId, carrierId } = req.body;
        if (!clerkId || !carrierId) {
            return res.status(400).json({ message: "Missing clerkId or carrierId" });
        }
        const { data: user, error: userError } = await supabase
            .from("Users")
            .select("id, role")
            .eq("clerk_id", clerkId)
            .single();
        if (userError || !user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== "carrier") {
            return res
                .status(403)
                .json({ message: "Unauthorized: Only carriers can accept deliveries" });
        }
        const { data: onethewayOrders, error } = await supabase
            .from("Orders")
            .select("*, Shops(*), Addresses(*)").eq('carrier_id', carrierId);
        if (error) {
            return res.status(403).json({ error });
        }
        return res.status(200).json({ ShopsAndAddresses: onethewayOrders });
    } catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}