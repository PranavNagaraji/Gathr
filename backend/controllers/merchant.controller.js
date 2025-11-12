// routes for get and post requests related to merchant operations
// add_shop, add_items, get_items, check_shop_exists, get_shop
import supabase from "../db.js";
import cloudinary from "../cloudinary.js";
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

// add_shop function to create a new shop
export const add_shop = async (req, res) => {
  try {
    const { owner_id, Location, address, shop_name, contact, account_no, mobile_no, upi_id, image, category } = req.body;
    
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('id')
      .eq('clerk_id', owner_id)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }
    try {
      const cu = await clerk.users.getUser(owner_id);
      if (cu?.publicMetadata?.shop_banned) {
        return res.status(403).json({ message: "Your shop is banned" });
      }
    } catch {}
    // console.log(image);
    const { data: newShop, error } = await supabase.from("Shops").insert({
      owner_id: user.id,
      Location,
      address,
      shop_name,
      contact,
      account_no,
      mobile_no,
      upi_id,
      image: null,
      category
    }).select().single();
    if (error) throw error;

    res.status(200).json({ message: "Shop creation initiated successfully", shop: newShop });

    //Handle slow image upload in the background (fire-and-forget)
    if (image) {
      uploadShopImageAndUpdate(image, newShop.id);
    }

  } catch (error) {
    console.error("Error adding shop:", error);
    return res.status(500).json({ message: "Error adding shop", error });
  }
};

// Helper function for add_shop to run in the background
const uploadShopImageAndUpdate = async (image, shopId) => {
  try {
    console.log(`Starting background image upload for shop: ${shopId}`);
    const result = await cloudinary.uploader.upload(image, {
      folder: `shops/${shopId}` // Use the new shop ID for the folder
    });
    
    const imageData = { url: result.secure_url, public_id: result.public_id };

    await supabase
      .from("Shops")
      .update({ image: imageData })
      .eq('id', shopId);

    console.log(`Successfully updated image for shop: ${shopId}`);
  } catch (error) {
    console.error(`Background image upload failed for shop ${shopId}:`, error);
  }
};

// add_items function to create a new item
export const add_items = async (req, res) => {
  const { name, description, quantity, price, images, category, owner_id } = req.body;
  try {
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('id, role')
      .eq('clerk_id', owner_id)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "merchant") {
      return res.status(403).json({ message: "User is not a merchant" });
    }
    try {
      const cu = await clerk.users.getUser(owner_id);
      if (cu?.publicMetadata?.shop_banned) {
        return res.status(403).json({ message: "Your shop is banned" });
      }
    } catch {}
    
    const { data: shop, error: shopError } = await supabase
      .from("Shops")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (shopError || !shop) {
      return res.status(404).json({ message: "Shop not found for this user" });
    }

    const { data: newItem, error: itemError } = await supabase
      .from("Items")
      .insert({
        name,
        description,
        quantity,
        price,
        images: [], 
        category,
        shop_id: shop.id
      })
      .select()
      .single();

    if (itemError) throw itemError;

    res.status(200).json({ message: "Item added successfully, images are processing.", item: newItem });

    // Handle slow image uploads in the background
    uploadItemImagesAndUpdate(images, shop.id, newItem.id);

  } catch (error) {
    console.error("Error adding items:", error);
    res.status(500).json({ message: "Error adding items", error });
  }
};

// Helper function for add_items to run in the background
const uploadItemImagesAndUpdate = async (images, shopId, itemId) => {
    try {
        console.log(`Starting background image upload for item: ${itemId}`);
        const uploadedImages = await Promise.all(
            images.map(async (img) => {
                const result = await cloudinary.uploader.upload(img, {
                    folder: `shop_items/${shopId}`
                });
                return { url: result.secure_url, public_id: result.public_id };
            })
        );
        
        await supabase
            .from("Items")
            .update({ images: uploadedImages })
            .eq("id", itemId);
        
        console.log(`Successfully updated images for item: ${itemId}`);
    } catch (error) {
        console.error(`Background image upload failed for item ${itemId}:`, error);
    }
};

// checkShopExists function to verify if a shop exists for a given owner_id
export const checkShopExists = async (req, res) => {
  try {
    const { owner_id } = req.body;
    // console.log(owner_id);
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('id')
      .eq('clerk_id', owner_id)
      .single();
    
    if (userError || !user) { 
      return res.status(404).json({ message: "User not found" });
    }

    const { data: shop, error } = await supabase
      .from("Shops")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!shop || error) {
      return res.status(404).json({ message: "Shop not found for this user" });
    }
    res.status(200).json({ message: "Shop found", shop });
  } catch (error) {
    console.error("Error checking shop existence:", error);
    res.status(500).json({ message: "Error checking shop existence", error });
  }
}

// getItems function to fetch items for a merchant
export const getItems = async (req, res) => {
  try {
    const { owner_id } = req.body;
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('id, role')
      .eq('clerk_id', owner_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role !== "merchant") {
      return res.status(403).json({ message: "User is not a merchant." });
    }
    try {
      const cu = await clerk.users.getUser(owner_id);
      if (cu?.publicMetadata?.shop_banned) {
        return res.status(403).json({ message: "Your shop is banned" });
      }
    } catch {}

    const { data: shop, error: shopError } = await supabase
      .from("Shops")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (shopError || !shop) {
      return res.status(404).json({ message: "Shop not found for this user." });
    }

    const { data: items, error: itemsError } = await supabase
      .from("Items")
      .select("*")
      .eq("shop_id", shop.id);

    if (itemsError) {
      throw itemsError;
    }

    res.status(200).json({ message: "Items fetched successfully", items });

  } catch (error) {
    console.error("Error fetching items:", error);
    return res.status(500).json({ message: "Error fetching items", error });
  }
};

// getShop function to fetch shop details for a merchant
export const getShop = async (req, res) => {
  const { owner_id } = req.body;
  try {
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('id, role')
      .eq('clerk_id', owner_id)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "merchant") {
      return res.status(403).json({ message: "User is not a merchant" });
    }
    
    const { data: shop, error: shopError } = await supabase
      .from("Shops")
      .select("*")
      .eq("owner_id", user.id)
      .single();
      
    if (shopError || !shop) {
      return res.status(404).json({ message: "Shop not found for this user" });
    }
    res.status(200).json({ message: "Shop fetched successfully", shop });
  } catch (error) {
    console.error("Error fetching shop:", error);
    return res.status(500).json({ message: "Error fetching shop", error });
  }
}

export const showOrders = async(req,res)=>{
  try {
    const { owner_id } = req.body;
    const  { data: user, error: userError } = await supabase
    .from('Users')
    .select('id, role')
    .eq('clerk_id', owner_id)
    .single()

    if(userError || !user)
      return res.status(404).json({message:"User Not Found"})
    if(user.role !== 'merchant')
      return res.status(403).json({message:"User is not a Merchant"})
    try {
      const cu = await clerk.users.getUser(owner_id);
      if (cu?.publicMetadata?.shop_banned) {
        return res.status(403).json({ message: "Your shop is banned" });
      }
    } catch {}

    const { data: shop, error: shopError } = await supabase
    .from('Shops')
    .select('*')
    .eq('owner_id',user.id)
    .single()

    if(shopError || !shop)
      return res.status(404).json({message:"Shop not found"})

    const {data: orders, error: orderError} = await supabase
    .from('Orders')
    .select('*')
    .eq('shop_id',shop.id)
    .eq('status','Ordered')
    .order('created_at', { ascending: false })
    

    if(orderError)
      throw orderError;
    
    return res.status(200).json({orders:orders})


  } catch (error) {
    console.error("Error showing orders:", error);
    return res.status(500).json({ message: "Error showing orders", error });
  }
}

export const updateorderStatus = async (req,res) =>{
  try {
    const {order_id, owner_id} = req.body;
    const { data: user, error: userError } = await supabase
    .from('Users')
    .select('id, role')
    .eq('clerk_id', owner_id)
    .single()

    if(userError || !user)
      return res.status(404).json({message:"User Not Found"})
    if(user.role !== 'merchant')
      return res.status(403).json({message:"User is not a Merchant"})
  
    const { data: order, error:orderError } = await supabase
    .from('Orders')
    .select('*')
    .eq('id',order_id)
    .single()

    if(orderError || !order)
      return res.status(404).json({message:"Order not found"})
  
    if(order.status !== 'Ordered')
      return res.status(400).json({message:"Order is already being processed"})

    await supabase
    .from('Orders')
    .update({status:'Accepted'})
    .eq('id',order_id)

    return res.status(200).json({message:"Order status updated to Accepted"});
    

  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ message: "Error updating order status", error });
  }
}

export const getItem = async (req, res) => {
  try {
    const { owner_id, item_id } = req.body;
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('id, role')
      .eq('clerk_id', owner_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role !== "merchant") {
      return res.status(403).json({ message: "User is not a merchant." });
    }

    const { data: shop, error: shopError } = await supabase
      .from("Shops")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (shopError || !shop) {
      return res.status(404).json({ message: "Shop not found for this user." });
    }

    const { data: item, error: itemsError } = await supabase
      .from("Items")
      .select("*")
      .eq("shop_id", shop.id)
      .eq('id',item_id).single();;

    if (itemsError) {
      throw itemsError;
    }

    res.status(200).json({ message: "Item fetched successfully", item });

  } catch (error) {
    console.error("Error fetching items:", error);
    return res.status(500).json({ message: "Error fetching items", error });
  }
};

