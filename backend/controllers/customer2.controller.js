import supabase from '../db.js';
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

import { clerkClient } from "@clerk/clerk-sdk-node";
export const getComments = async (req, res) => {
  const { itemId } = req.params;

  try {
    // Fetch all comments for the item
    const { data: comments, error: commentError } = await supabase
      .from("Comments")
      .select("*")
      .eq("item_id", itemId);

    if (commentError) {
      console.log("Error while fetching comments:", commentError);
      return res
        .status(500)
        .json({ message: "Failed to fetch comments", error: commentError.message });
    }

    if (!comments || comments.length === 0) {
      return res.status(200).json({ comments: [] });
    }

    // Get unique user IDs from comments
    const userIds = [...new Set(comments.map((c) => c.user_id))];

    // Fetch user info from your Users table
    const { data: users, error: userError } = await supabase
      .from("Users")
      .select("id, first_name, last_name, clerk_id")
      .in("id", userIds);

    if (userError) {
      console.log("Error while fetching users:", userError);
      return res
        .status(500)
        .json({ message: "Failed to fetch users", error: userError.message });
    }

    // Fetch Clerk images for each user
    // We'll map clerk_id → imageUrl via Clerk API
    const clerkImages = {};
    await Promise.all(
      users.map(async (u) => {
        try {
          const clerkUser = await clerkClient.users.getUser(u.clerk_id);
          clerkImages[u.clerk_id] = clerkUser.imageUrl;
        } catch (err) {
          console.log(`Failed to get image for ${u.clerk_id}:`, err.message);
          clerkImages[u.clerk_id] = null; // fallback
        }
      })
    );

    // Combine comments + user data + image
    const commentsWithUsers = comments.map((c) => {
      const user = users.find((u) => u.id === c.user_id);
      return {
        ...c,
        username: user ? `${user.first_name} ${user.last_name}` : "Anonymous",
        imageUrl: user ? (clerkImages[user.clerk_id] || "https://via.placeholder.com/80") : "https://via.placeholder.com/80",
      };
    });

    // Send final response
    return res.status(200).json({ comments: commentsWithUsers });
  } catch (err) {
    console.error("Error in getComments:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteComment = async (req, res) => {
  const { commentId, clerkId } = req.body;

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
  const { data: commentUser, error: commentUserError } = await supabase.from("Comments").select("user_id").eq("id", commentId).single();
  if (commentUserError)
    return res.status(500).json({ message: "Failed to fetch the user of a comment", error: commentUserError.message });
  if (commentUser.user_id !== user.id) {
    return res.status(403).json({ commentUser: commentUser, userId: user.id, message: "Unauthorized: Only the user who posted the comment can delete it" });
  }

  const { error } = await supabase.from("Comments").delete().eq("id", commentId);
  if (error) {
    console.log("Error while deleting comment");
    return res.status(500).json({ message: "Failed to delete comment", error: error.message });
  } else {
    return res.status(200).json({ message: "Comment deleted successfully" });
  }
}

export const getWishlist = async (req, res) => {
  try {
    const { clerkId } = req.body || {};
    if (!clerkId) return res.status(400).json({ message: "Missing clerkId" });

    const { data: rows, error: wlErr } = await supabase
      .from("wishlist")
      .select("item_id")
      .eq("user_clerk_id", clerkId)
      .order("created_at", { ascending: false });
    if (wlErr) {
      console.error("[wishlist/list] select error:", wlErr);
      return res.status(500).json({ message: wlErr.message || "Failed to fetch wishlist" });
    }

    const ids = (rows || []).map(r => r.item_id);
    if (ids.length === 0) return res.status(200).json({ items: [] });

    const { data: items, error } = await supabase
      .from("Items")
      .select("*")
      .in("id", ids);
    if (error) {
      console.error("[wishlist/list] items fetch error:", error);
      return res.status(500).json({ message: error.message || "Failed to fetch items" });
    }

    return res.status(200).json({ items: items || [] });
  } catch (e) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

export const addToWishlist = async (req, res) => {
  try {
    const { clerkId, itemId } = req.body || {};
    if (!clerkId || !itemId) return res.status(400).json({ message: "Missing clerkId or itemId" });

    let shopId = null;
    const { data: item, error: itemErr } = await supabase
      .from("Items")
      .select("id, shop_id")
      .eq("id", itemId)
      .maybeSingle();
    if (itemErr || !item) return res.status(404).json({ message: "Item not found" });
    shopId = item.shop_id;

    const { error } = await supabase
      .from("wishlist")
      .upsert({ user_clerk_id: clerkId, item_id: itemId, shop_id: shopId }, { onConflict: "user_clerk_id,item_id" });
    if (error) {
      console.error("[wishlist/add] upsert error:", error);
      return res.status(500).json({ message: error.message || "Failed to add" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[wishlist/add] unhandled:", e);
    return res.status(500).json({ message: e.message || "Internal server error" });
  }
}

export const removeFromWishlist = async (req, res) => {
  try {
    const { clerkId, itemId } = req.body || {};
    if (!clerkId || !itemId) return res.status(400).json({ message: "Missing clerkId or itemId" });
    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_clerk_id", clerkId)
      .eq("item_id", itemId);
    if (error) {
      console.error("[wishlist/remove] delete error:", error);
      return res.status(500).json({ message: error.message || "Failed to remove" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[wishlist/remove] unhandled:", e);
    return res.status(500).json({ message: e.message || "Internal server error" });
  }
}

export const getWishlistCount = async (req, res) => {
  try {
    const { clerkId } = req.body || {};
    if (!clerkId) return res.status(400).json({ message: "Missing clerkId" });
    const { count, error } = await supabase
      .from("wishlist")
      .select("id", { count: "exact", head: true })
      .eq("user_clerk_id", clerkId);
    if (error) {
      console.error("[wishlist/count] count error:", error);
      return res.status(500).json({ message: error.message || "Failed to fetch count" });
    }
    return res.status(200).json({ count: count || 0 });
  } catch (e) {
    console.error("[wishlist/count] unhandled:", e);
    return res.status(500).json({ message: e.message || "Internal server error" });
  }
}

export const getitem = async (req, res) => {
  const { itemId } = req.params;
  const { data: item, error: itemError } = await supabase.from("Items").select("*").eq("id", itemId).single();
  if (itemError) {
    console.log("Error while fetching item");
    return res.status(500).json({ message: "Failed to fetch item", error: itemError.message });
  } else {
    return res.status(200).json({ item: item });
  }
}

export const getAddressesByUser = async (req, res) => {
  const { clerkId } = req.params;
  const { data: user, error: userError } = await supabase
    .from('Users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();
  if (userError || !user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.role !== 'customer') {
    return res.status(403).json({ message: "Unauthorized: Only logged in users can get Addresses" });
  }
  const { data, error } = await supabase.from("Addresses").select("*").eq("user_id", user.id);
  if (error) {
    console.log("Error while fetching addresses");
    return res.status(500).json({ message: "Failed to fetch addresses", error: error.message });
  }
  return res.status(200).json({ addresses: data });
}

export const addAddress = async (req, res) => {
  const { clerkId, address, title, desc, mobile, location } = req.body;
  const { data: user, error: userError } = await supabase
    .from('Users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();
  if (userError || !user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.role !== 'customer') {
    return res.status(403).json({ message: "Unauthorized: Only logged in users can get Addresses" });
  }
  const { data, error } = await supabase.from("Addresses").insert({ user_id: user.id, address: address, title: title, description: desc, mobile_no: mobile, location: location }).select("*");
  if (error) {
    console.log("Error while adding address");
    return res.status(500).json({ message: "Failed to add address", error: error.message });
  }
  return res.status(200).json({ address: data[0] });
}

export const deleteAddress = async (req, res) => {
  const { clerkId, addressId } = req.body;
  const { data: user, error: userError } = await supabase
    .from('Users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();
  if (userError || !user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.role !== 'customer') {
    return res.status(403).json({ message: "Unauthorized: Only logged in users can get Addresses" });
  }
  const { error } = await supabase.from("Addresses").delete().eq("id", addressId);
  if (error) {
    console.log("Error while deleting address");
    return res.status(500).json({ message: "Failed to delete address", error: error.message });
  }
  return res.status(200).json({ message: "Address deleted successfully" });
}

export const updateAddress = async (req, res) => {
  const { clerkId, addressId, address, title, desc, mobile, location } = req.body;
  const { data: user, error: userError } = await supabase
    .from('Users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();
  if (userError || !user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.role !== 'customer') {
    return res.status(403).json({ message: "Unauthorized: Only logged in users can get Addresses" });
  }
  const { error } = await supabase.from("Addresses").update({ user_id: user.id, address: address, title: title, description: desc, mobile_no: mobile, location: location }).eq("id", addressId);
  if (error) {
    console.log("Error while updating address");
    return res.status(500).json({ message: "Failed to update address", error: error.message });
  }
  return res.status(200).json({ message: "Address updated successfully" });
}

export const getcarthistory = async (req, res) => {
  const { clerkId } = req.params;

  const { data: user, error: userError } = await supabase
    .from('Users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();

  if (userError || !user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.role !== 'customer') {
    return res.status(403).json({ message: "Unauthorized: Only logged in users can get cart history" });
  }

  const { data: carts, error: cartsError } = await supabase.from('Orders ').select('*, Shops(*), Users:carrier_id(*)').eq('customer_id', user.id).order('created_at', { ascending: false });

  if (cartsError || !carts) {
    return res.status(404).json({ message: "Cart history not found" });
  }

  return res.status(200).json({ carts });
}

export const getcartitems = async (req, res) => {
  const { clerkId, cartId } = req.body;

  const { data: user, error: userError } = await supabase
    .from('Users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();

  if (userError || !user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.role !== 'customer') {
    return res.status(403).json({ message: "Unauthorized: Only logged in users can get cart history" });
  }

  const { data: items, error: itemsError } = await supabase.from('Cart_items').select('*, Items(*)').eq('cart_id', cartId);

  if (itemsError || !items) {
    return res.status(404).json({ message: "Cart history not found" });
  }

  return res.status(200).json({ items });
}

export const getItemsByIds = async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(200).json({ items: [] });
    }

    const { data: items, error } = await supabase
      .from("Items")
      .select("*")
      .in("id", ids);

    if (error) {
      console.error("Error fetching items by ids:", error);
      return res.status(500).json({ message: "Failed to fetch items" });
    }

    return res.status(200).json({ items: items || [] });
  } catch (e) {
    console.error("Unhandled error in getItemsByIds:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
