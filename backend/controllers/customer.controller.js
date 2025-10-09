import supabase from '../db.js';
import {Clerk} from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export const getLocalShops=async (req, res)=>{
    const {lat, long}=req.body;
    const distanceKm = 11;
    const latRad = lat * (Math.PI / 180);

    const deltaLat = distanceKm / 111; // ~1° lat ≈ 111 km
    const deltaLong = distanceKm / (111 * Math.cos(latRad)); // ~1° long ≈ 111 km * cos(lat)

    const minLat = lat - deltaLat;
    const maxLat = lat + deltaLat;
    const minLong = long - deltaLong;
    const maxLong = long + deltaLong;

    const { data: shops, error: shopError } = await supabase
        .from('Shops')
        .select('*')
        .gte('Location->>latitude', minLat.toString())
        .lte('Location->>latitude', maxLat.toString())
        .gte('Location->>longitude', minLong.toString())
        .lte('Location->>longitude', maxLong.toString());

    if(shopError){
        return res.status(500).json({ message: "Error fetching shops", error: shopError });
    }
    res.status(200).json({shops});
}

export const getShopItems=async (req, res)=>{
    const {shopId}=req.params;
    const {data: items, error:itemError}=await supabase.from("Items").select('*').eq('shop_id', shopId);
    if(itemError)
        return res.status(404).json({ message: "Error fetching items", error: itemError });
    res.status(200).json({items});
}

export const addComments=async (req, res)=>{
    const {itemId, clerkId, parentId, comment}=req.body;
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
    const { data, error } = await supabase
    .from('Comments')
    .insert([
        {
        item_id: itemId,
        user_id: user.id,
        parent_id: parentId,
        comment: comment,
        }
    ])
    .select();

    if (error) {
        console.error('Error inserting record:', error);
        return res.status(500).json({ message: "Failed to add comment.", error: error.message });
    } else {
        console.log('Record inserted successfully:', data);
        return res.status(201).json({
        message: "Comment added successfully!",
        comment: data[0]
        });
    }
}
export const fetchComments=async (req, res)=>{
    const {itemId}=req.params;
    const {data:comments, error:commentError}=await supabase.from("Comments").select("*").eq("item_id", itemId);
    if(commentError){
        console.log("Error while fetching comments");
        return res.status(500).json({message:"Failed to fetch Comments", error:commentError.message});
    }else{
        return res.status(200).json({comments});
    }
}

export const addRating = async (req, res) => {
  try {
    const { itemId, clerkId, rating } = req.body;

    // 🧩 1. Verify user
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('id, role')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user)
      return res.status(404).json({ message: "User not found" });

    if (user.role !== 'customer')
      return res.status(403).json({ message: "Unauthorized: Only customers can post ratings" });

    // 🧩 2. Check if user already rated the item
    const { data: existingRating, error: existingError } = await supabase
      .from('itemRating')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .maybeSingle(); // safer than .single()

    if (existingError)
      throw existingError;

    // 🧩 3. Insert or update rating
    if (existingRating) {
      const { error: updateError } = await supabase
        .from('itemRating')
        .update({ rating })
        .eq('user_id', user.id)
        .eq('item_id', itemId);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('itemRating')
        .insert([{ rating, user_id: user.id, item_id: itemId }]);

      if (insertError) throw insertError;
    }

    // 🧩 4. Recalculate average rating
    const { data: allRatings, error: avgError } = await supabase
      .from('itemRating')
      .select('rating')
      .eq('item_id', itemId);

    if (avgError) throw avgError;

    const avg =
      allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
        : 0;

    // 🧩 5. Update average rating in Items table
    const { error: itemUpdateError } = await supabase
      .from('Items')
      .update({ rating: avg })
      .eq('id', itemId);

    if (itemUpdateError) throw itemUpdateError;

    // ✅ Done
    return res.status(202).json({ message: "Rating updated successfully", average: avg });

  } catch (err) {
    console.error("Error in addRating:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

const createCart=async (userId)=>{
    const {data:cart, error:cartError}=await supabase.from("Cart").insert({user_id: userId, status: "active"}).select("*");
    if(cartError) return { message: "Cart not found", error:cartError.message };
    return cart;
}

export const getCurrentCart=async (req, res)=>{
    const {clerkId}=req.body;
    const { data: user, error: userError } = await supabase
            .from('Users')
            .select('id, role')
            .eq('clerk_id', clerkId)
            .single();
    if (userError || !user) return res.status(404).json({ message: "User not found" });
    if (user.role !== 'customer') return res.status(403).json({ message: "Unauthorized: Only logged in users can visit cart" });
    const userId=user.id;
    const {data:cart, error:cartError}=await supabase.from("Cart").select("*").eq("user_id", userId).eq("status", "active");
    if(cart.length===0){
        createCart(userId);
    }
    return res.status(200).json({cart});
}

export const addToCart=async (req, res)=>{
    const {itemId, clerkId, quantity}=req.body;
    const { data: user, error: userError } = await supabase
            .from('Users')
            .select('id, role')
            .eq('clerk_id', clerkId)
            .single();

    if (userError || !user) return res.status(404).json({ message: "User not found" });
    if (user.role !== 'customer') return res.status(403).json({ message: "Unauthorized: Only logged in users can add to cart" });
    if(quantity<=0) return res.status(400).json({ message: "Quantity must be greater than 0" });
    const {data:cart, error:cartError}=await supabase.from("Cart").select("*").eq("user_id", user.id).eq("status", "active").single();
    if(cartError) return res.status(404).json({ message: "Cart not found", error:cartError.message });
    const cartId=cart.id;
    const { data: existingItem, error: existingError } = await supabase
      .from("Cart_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("item_id", itemId)
      .eq("cart_id", cartId)
      .single();
    if (existingItem) {
      const {data:cartItem, error:cartItemError}=await supabase
        .from("Cart_items")
        .update({ quantity: existingItem.quantity + quantity })
        .eq("id", existingItem.id)
        .select("*");
        return res.status(200).json({cartItem});
    }
    const {data:cartItem, error:cartItemError}=await supabase
      .from("Cart_items")
      .insert({
        user_id: user.id,
        item_id: itemId,
        quantity: quantity,
        cart_id: cartId,
      })
      .select("*");
      return res.status(200).json({cartItem});
}

export const deleteFromCart=async(req, res)=>{
  const {itemId, clerkId, quantity}=req.body;
    const { data: user, error: userError } = await supabase
            .from('Users')
            .select('id, role')
            .eq('clerk_id', clerkId)
            .single();

    if (userError || !user) return res.status(404).json({ message: "User not found" });
    if (user.role !== 'customer') return res.status(403).json({ message: "Unauthorized: Only logged in users can add to cart" });
    const {data:cart, error:cartError}=await supabase.from("Cart").select("*").eq("user_id", user.id).eq("status", "active").single();
    if(cartError) return res.status(404).json({ message: "Cart not found", error:cartError.message });
    const cartId=cart.id;
    const { data: existingItem, error: existingError } = await supabase
      .from("Cart_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("item_id", itemId)
      .eq("cart_id", cartId)
      .single();
    // if an item exists, delete it or update the quantity
    // else raise an error
    if (existingItem) {
      if(existingItem.quantity===quantity){
        const {data:cartItem, error:cartItemError}=await supabase
        .from("Cart_items")
        .delete()
        .eq("id", existingItem.id)
        .select("*");
        return res.status(200).json({cartItem});
      }
      const {data:cartItem, error:cartItemError}=await supabase
        .from("Cart_items")
        .update({ quantity: existingItem.quantity - quantity })
        .eq("id", existingItem.id)
        .select("*");
      return res.status(200).json({cartItem});
    } 
    return res.status(404).json({message: "Item not found in cart not found"});
}