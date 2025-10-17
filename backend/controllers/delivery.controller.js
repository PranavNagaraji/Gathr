import supabase from '../db.js';
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";
import cloudinary from "../cloudinary.js";


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
        const { clerkId } = req.body;
        if (!clerkId) {
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
            .select("*, Shops(*), Addresses(*)").eq('carrier_id', user.id).eq('status', 'ontheway');
        if (error) {
            return res.status(403).json({ error });
        }
        return res.status(200).json({ ShopsAndAddresses: onethewayOrders });
    } catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const getCarrier = async (req, res) => {
    const { carrierId } = req.params;
    const { data, error } = await supabase
        .from('Users')
        .select('*')
        .eq('clerk_id', carrierId)
        .single();
    
    if(error) return res.status(500).json({ message: "Error fetching carrier", error });
    res.status(200).json({carrier:data});
}

export const createCarrier = async (req,res) => {
    try {
        const {carrierData, clerkId , profile} = req.body;
        const {data,error} = await supabase.from('Users').update({'delivery_details':carrierData}).eq('clerk_id', clerkId);
        if(error) return res.status(500).json({ message: "Error creating carrier", error });
        res.status(200).json(data);

        if(profile)
        {
            uploadImageAndUpdate(profile, clerkId);
        }
    } catch (error) {
        console.error("Error creating carrier:", error);
    }
}

const uploadImageAndUpdate = async (image, clerkId) => {
  try {
    console.log(`Starting background image upload for delivery guy: ${clerkId}`);

    // 1️⃣ Fetch existing delivery_details JSON
    const { data: userData, error: fetchError } = await supabase
      .from("Users")
      .select("delivery_details")
      .eq("clerk_id", clerkId)
      .single();

    if (fetchError) throw fetchError;

    const existingDetails = userData?.delivery_details || {};
    const existingProfile = existingDetails.profile || {};

    // 2️⃣ Check if the provided image is already a Cloudinary URL
    const isCloudinaryUrl = typeof image === "string" && image.includes("res.cloudinary.com");

    let imageData = existingProfile; // default: keep existing
    if (!isCloudinaryUrl) {
      // 3️⃣ If new image, delete the old one if it exists
      if (existingProfile?.public_id) {
        try {
          await cloudinary.uploader.destroy(existingProfile.public_id);
          console.log(`Deleted old Cloudinary image: ${existingProfile.public_id}`);
        } catch (delErr) {
          console.warn(`Failed to delete old Cloudinary image: ${delErr.message}`);
        }
      }

      // 4️⃣ Upload new image to Cloudinary
      const result = await cloudinary.uploader.upload(image, {
        folder: `delivery/${clerkId}`,
      });

      imageData = { url: result.secure_url, public_id: result.public_id };
    } else {
      console.log("Image is already a Cloudinary URL, skipping upload.");
    }

    // 5️⃣ Merge updated image data into delivery_details
    const updatedDetails = { ...existingDetails, profile: imageData };

    // 6️⃣ Update in Supabase
    const { error: updateError } = await supabase
      .from("Users")
      .update({ delivery_details: updatedDetails })
      .eq("clerk_id", clerkId);

    if (updateError) throw updateError;

    console.log(`✅ Successfully updated delivery_details for delivery guy: ${clerkId}`);
  } catch (error) {
    console.error(`❌ Background image upload failed for delivery guy ${clerkId}:`, error);
  }
};
