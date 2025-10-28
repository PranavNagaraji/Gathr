import supabase from '../db.js';
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";
import cloudinary from "../cloudinary.js";
import fetch from "node-fetch";

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
            .select("*, Shops(*), Addresses(*) , Users:customer_id(*)").eq('carrier_id', user.id).eq('status', 'ontheway');
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

    const { data: userData, error: fetchError } = await supabase
      .from("Users")
      .select("delivery_details")
      .eq("clerk_id", clerkId)
      .single();

    if (fetchError) throw fetchError;

    const existingDetails = userData?.delivery_details || {};
    const existingProfile = existingDetails.profile || {};

    const isCloudinaryUrl = typeof image === "string" && image.includes("res.cloudinary.com");

    let imageData = existingProfile;
    if (!isCloudinaryUrl) {
      if (existingProfile?.public_id) {
        try {
          await cloudinary.uploader.destroy(existingProfile.public_id);
          console.log(`Deleted old Cloudinary image: ${existingProfile.public_id}`);
        } catch (delErr) {
          console.warn(`Failed to delete old Cloudinary image: ${delErr.message}`);
        }
      }

      const result = await cloudinary.uploader.upload(image, {
        folder: `delivery/${clerkId}`,
      });

      imageData = { url: result.secure_url, public_id: result.public_id };
    } else {
      console.log("Image is already a Cloudinary URL, skipping upload.");
    }

    const updatedDetails = { ...existingDetails, profile: imageData };

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

export const completeDelivery = async (req, res) => {
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
            return res.status(403).json({ message: "Unauthorized: Only carriers can accept deliveries" });
        }

        await supabase.from("Orders").update({ status: "delivered" , payment_status: "paid" }).eq("id", orderId);

        const { data: order, error: orderErr } = await supabase
          .from("Orders")
          .select("*")
          .eq("id", orderId)
          .single();
        if (!orderErr && order) {
          const { data: items, error: itemsErr } = await supabase
            .from("Cart_items")
            .select("quantity, Items(*)")
            .eq("cart_id", order.cart_id);
          if (!itemsErr && items && items.length) {
            const subtotal = items.reduce((s, ci) => s + (ci.Items?.price || 0) * (ci.quantity || 0), 0);
            const { data: shop, error: shopErr } = await supabase
              .from("Shops")
              .select("id, shop_name, Location")
              .eq("id", order.shop_id)
              .single();
            const { data: address, error: addrErr } = await supabase
              .from("Addresses")
              .select("address, location")
              .eq("id", order.address_id)
              .single();
            const gstRate = parseFloat(process.env.GST_RATE || "0.18");
            let deliveryFee = 0;
            let distanceKm = 0;
            if (!shopErr && !addrErr && shop && address) {
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
                distanceKm = getDistanceKm(Number(shopLat), Number(shopLong), Number(destLat), Number(destLong));
                const DELIVERY_BASE_KM = parseFloat(process.env.DELIVERY_BASE_KM || "2");
                const DELIVERY_BASE_FEE = parseFloat(process.env.DELIVERY_BASE_FEE || "30");
                const DELIVERY_PER_KM_FEE = parseFloat(process.env.DELIVERY_PER_KM_FEE || "10");
                const extraKm = Math.max(0, distanceKm - DELIVERY_BASE_KM);
                deliveryFee = DELIVERY_BASE_FEE + Math.ceil(extraKm) * DELIVERY_PER_KM_FEE;
              }
            }
            const gst = subtotal * gstRate;
            const total = subtotal + gst + deliveryFee;
            const { data: customer, error: custErr } = await supabase
              .from("Users")
              .select("email, first_name, last_name")
              .eq("id", order.customer_id)
              .single();
            if (!custErr && customer?.email) {
              const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer";
              const curr = (n) => `₹${Number(n || 0).toFixed(2)}`;
              const itemsRows = items.map(ci => {
                const line = (ci.Items?.price || 0) * (ci.quantity || 0);
                return `<tr><td style="padding:6px 8px;border:1px solid #eee;">${ci.Items?.name || "Item"}</td><td style=\"padding:6px 8px;border:1px solid #eee;\">${ci.quantity}</td><td style=\"padding:6px 8px;border:1px solid #eee;\">${curr(ci.Items?.price || 0)}</td><td style=\"padding:6px 8px;border:1px solid #eee;\">${curr(line)}</td></tr>`;
              }).join("");
              const addressLine = address?.address || "";
              const shopName = shop?.shop_name || "Shop";
              const subject = `Your Order Receipt #${order.id}`;
              const html = `
                <div style=\"font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;max-width:640px;margin:0 auto;padding:16px;color:#111\">
                  <h2 style=\"margin:0 0 12px\">Payment Receipt</h2>
                  <p style=\"margin:0 0 12px\">Hi ${name},</p>
                  <p style=\"margin:0 0 12px\">Thanks for ordering from ${shopName}. Your order has been delivered.</p>
                  <p style=\"margin:0 0 12px\">Order ID: <strong>#${order.id}</strong></p>
                  <p style=\"margin:0 0 12px\">Delivery Address: ${addressLine}</p>
                  <table style=\"border-collapse:collapse;width:100%;margin:12px 0 8px\">
                    <thead>
                      <tr>
                        <th style=\"text-align:left;padding:6px 8px;border:1px solid #eee;\">Item</th>
                        <th style=\"text-align:left;padding:6px 8px;border:1px solid #eee;\">Qty</th>
                        <th style=\"text-align:left;padding:6px 8px;border:1px solid #eee;\">Unit</th>
                        <th style=\"text-align:left;padding:6px 8px;border:1px solid #eee;\">Total</th>
                      </tr>
                    </thead>
                    <tbody>${itemsRows}</tbody>
                  </table>
                  <div style=\"margin-top:8px\">
                    <div style=\"display:flex;justify-content:space-between\"><span>Subtotal</span><span>${curr(subtotal)}</span></div>
                    <div style=\"display:flex;justify-content:space-between\"><span>GST</span><span>${curr(gst)}</span></div>
                    <div style=\"display:flex;justify-content:space-between\"><span>Delivery Fee${distanceKm?` (${distanceKm.toFixed(1)} km)`:''}</span><span>${curr(deliveryFee)}</span></div>
                    <div style=\"display:flex;justify-content:space-between;font-weight:600;margin-top:6px\"><span>Total Paid</span><span>${curr(total || order.amount_paid)}</span></div>
                  </div>
                  <p style=\"margin:16px 0 0;color:#444\">If you have any questions, reply to this email.</p>
                </div>
              `;
              try {
                const mjAuth = Buffer.from(`${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`).toString("base64");
                await fetch("https://api.mailjet.com/v3.1/send", {
                  method: "POST",
                  headers: { "Authorization": `Basic ${mjAuth}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    Messages: [
                      {
                        From: { Email: process.env.MJ_SENDER_EMAIL, Name: "Gathr" },
                        To: [{ Email: customer.email, Name: name }],
                        Subject: subject,
                        HTMLPart: html
                      }
                    ]
                  })
                });
              } catch (e) {
                console.error("receipt email error:", e.message);
              }
            }
          }
        }

        return res.status(200).json({ message: "Delivery accepted successfully" });
    } catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const getAllOrders = async (req,res)=>{
    const { clerkId } = req.params;
    if (!clerkId) {
        return res.status(400).json({ message: "Missing clerkId" });
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
      `).eq('carrier_id', user.id);
      console.log(acceptedOrders);
        if (error) {
            return res.status(403).json({ error });
        }
        return res.status(200).json({ ShopsAndAddresses: acceptedOrders });
} 