import supabase from "../db";
import cloudinary from "../cloudinary";
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export const add_shop = async (req, res) => {
  const { owner_id, Location, address, shop_name, contact, acconunt_no, mobile_no, upi_id } = req.body;
  
  try {
    const { error } = await supabase.from("Shops").insert({
      owner_id,
      Location,
      address,
      shop_name,
      contact,
      acconunt_no,
      mobile_no,
      upi_id
    });

    if (error) throw error;

    res.status(200).json({ message: "Shop added successfully" });
  } catch (error) {
    console.error("Error adding shop:", error);
    res.status(500).json({ message: "Error adding shop", error });
  }
};

export const add_items = async (req, res) => {
  const { name, description, quantity, price, images, category, user_id } = req.body;

  try {
    // 1️⃣ Check if user exists
    const user = await clerk.users.getUser(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.publicMetadata.role !== "merchant") {
      return res.status(403).json({ message: "User is not a merchant" });
    }

    // 2️⃣ Get shop ID
    const { data: shop, error: shopError } = await supabase
      .from("Shops")
      .select("id")
      .eq("owner_id", user_id)
      .single();

    if (shopError || !shop) {
      return res.status(404).json({ message: "Shop not found for this user" });
    }

    // 3️⃣ Upload all images in parallel
    const uploadedImages = await Promise.all(
      images.map(async (img) => {
        const result = await cloudinary.uploader.upload(img, {
          folder: `shop_items/${shop.id}`
        });
        return { url: result.secure_url, public_id: result.public_id };
      })
    );

    // 4️⃣ Insert item
    const { data: item, error: itemError } = await supabase
      .from("Items")
      .insert({
        name,
        description,
        quantity,
        price,
        images: uploadedImages,
        category,
        shop_id: shop.id
      })
      .select();

    if (itemError) throw itemError;

    res.status(200).json({ message: "Item added successfully", item });

  } catch (error) {
    console.error("Error adding items:", error);
    res.status(500).json({ message: "Error adding items", error });
  }
};
