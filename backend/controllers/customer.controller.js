import supabase from '../db.js';
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export const getUserId = async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { data: user, error: userError } = await supabase.from('Users').select('*').eq('clerk_id', clerkId);
    if (userError) return res.status(500).json({ message: "Error fetching user", error: userError });
    res.status(200).json({ user_id: user[0].id });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Error fetching user", error: e });
  }
}

export const getLocalShops = async (req, res) => {
  const { lat, long } = req.body;
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

  if (shopError) {
    return res.status(500).json({ message: "Error fetching shops", error: shopError });
  }
  res.status(200).json({ shops });
}

export const getShopItems = async (req, res) => {
  const { shopId } = req.params;
  const { data: items, error: itemError } = await supabase.from("Items").select('*').eq('shop_id', shopId);
  if (itemError)
    return res.status(404).json({ message: "Error fetching items", error: itemError });
  res.status(200).json({ items });
}

export const addComments = async (req, res) => {
  const { itemId, clerkId, parentId, comment } = req.body;
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
    .select("*").single();

  if (error) {
    console.error('Error inserting record:', error);
    return res.status(500).json({ message: "Failed to add comment.", error: error.message });
  } else {
    console.log('Record inserted successfully:', data);
    return res.status(201).json({
      message: "Comment added successfully!",
      comment: data
    });
  }
}
export const fetchComments = async (req, res) => {
  const { itemId } = req.params;
  const { data: comments, error: commentError } = await supabase.from("Comments").select("*").eq("item_id", itemId);
  if (commentError) {
    console.log("Error while fetching comments");
    return res.status(500).json({ message: "Failed to fetch Comments", error: commentError.message });
  } else {
    return res.status(200).json({ comments });
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

const createCart = async (userId) => {
  const { data: cart, error: cartError } = await supabase.from("Cart").insert({ user_id: userId, status: "active" }).select("*").single();
  if (cartError) return { message: "Cart not found", error: cartError.message };
  return cart;
}

export const getCurrentCart = async (req, res) => {
  try {
    const { clerkId } = req.body;

    const { data: user, error: userError } = await supabase
      .from("Users")
      .select("id, role")
      .eq("clerk_id", clerkId)
      .single();

    if (userError || !user)
      return res.status(404).json({ message: "User not found" });

    if (user.role !== "customer")
      return res
        .status(403)
        .json({ message: "Unauthorized: Only customers can visit cart" });

    const userId = user.id;

    const { data: carts, error: cartsError } = await supabase
      .from("Cart")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active");


    let currentCart;

    if (!carts || carts.length === 0) {
      currentCart = await createCart(userId);
    } else {
      currentCart = carts[0];

      if (carts.length > 1) {
        // Archive duplicates
        for (let i = 1; i < carts.length; i++) {
          await supabase
            .from("Cart")
            .update({ status: "archived" })
            .eq("id", carts[i].id);
        }
      }
    }


    const { data: cartItems, error: cartItemsError } = await supabase
      .from("Cart_items")
      .select("*, Items(*)")
      .eq("cart_id", currentCart.id);

    if (cartItemsError)
      return res
        .status(500)
        .json({ message: "Failed to fetch cart items" });

    return res.status(200).json({
      cartId: currentCart.id,
      cartItems: cartItems || [],
    });
  } catch (err) {
    console.error("Error fetching cart:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addToCart = async (req, res) => {
  let { itemId, clerkId, quantity } = req.body;
  quantity = Number(quantity);
  console.log(quantity);
  if (quantity <= 0)
    return res.status(400).json({ message: "Quantity must be greater than 0" });

  const { data: user, error: userError } = await supabase
    .from("Users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .single();

  if (userError || !user)
    return res.status(404).json({ message: "User not found" });

  if (user.role !== "customer")
    return res.status(403).json({ message: "Unauthorized: Only customers can add to cart" });

  const { data: cartData, error: cartError } = await supabase
    .from("Cart")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  let cart = cartData;
  if (cartError || !cartData) {
    cart = await createCart(user.id);
    if (!cart) {
      console.error("Failed to create cart");
      return res.status(500).json({ message: "Failed to create cart" });
    }
  }

  const cartId = cart.id;
  const { data: item, error: itemError } = await supabase
    .from("Items")
    .select("*")
    .eq("id", itemId)
    .single();


  if (itemError || !item) {
    console.log("Error while fetching item");
    return res.status(404).json({ message: "Item not found" });
  }
  const { data: cartItemData, error: cartItemError } = await supabase.from("Cart_items").select("*,Items(*)").eq("cart_id", cartId).maybeSingle();
  if (cartItemError) {
    console.log("Error while fetching cart item");
    return res.status(500).json({ message: "Failed to fetch cart item" });
  }
  if (cartItemData) {
    if (cartItemData.Items.shop_id !== item.shop_id) {
      return res.status(400).json({ message: "Cannot add items from different shops to the same cart" });
    }
  }

  if (item.quantity < quantity)
    return res.status(400).json({ message: "Not enough stock available" }, { stock: item.quantity });

  const { data: existingItem } = await supabase
    .from("Cart_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .eq("cart_id", cartId)
    .single();

  let cartItem;

  if (existingItem) {
    // Update quantity
    const { data: updatedItem, error: updateError } = await supabase
      .from("Cart_items")
      .update({ quantity: existingItem.quantity + quantity })
      .eq("id", existingItem.id)
      .select("*");

    if (updateError) {
      console.error("Error updating cart item:", updateError);
      return res.status(500).json({ message: "Failed to update cart item" });
    }
    cartItem = updatedItem[0];
  } else {
    // Insert new cart item
    const { data: insertedItem, error: insertError } = await supabase
      .from("Cart_items")
      .insert({
        user_id: user.id,
        item_id: itemId,
        quantity,
        cart_id: cartId,
      })
      .select("*");

    if (insertError) {
      console.error("Error inserting cart item:", insertError);
      return res.status(500).json({ message: "Failed to add to cart" });
    }
    cartItem = insertedItem[0];
  }

  const { error: stockError } = await supabase
    .from("Items")
    .update({ quantity: item.quantity - quantity })
    .eq("id", itemId);

  if (stockError) return res.status(500).json({ message: "Failed to update item stock" });

  return res.status(200).json({ cartItem });
};

// deleteFromCart: remove items from cart and restore stock
export const deleteFromCart = async (req, res) => {
  const { itemId, clerkId, quantity } = req.body;

  if (!clerkId || !itemId || !quantity || quantity <= 0) {
    return res.status(400).json({ message: "Missing or invalid fields" });
  }

  // Get user
  const { data: user, error: userError } = await supabase
    .from("Users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .single();

  if (userError || !user) return res.status(404).json({ message: "User not found" });
  if (user.role !== "customer")
    return res.status(403).json({ message: "Unauthorized: Only customers can remove from cart" });

  // Get active cart
  const { data: cart, error: cartError } = await supabase
    .from("Cart")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (cartError || !cart) return res.status(404).json({ message: "Active cart not found" });

  const cartId = cart.id;

  // Get cart item
  const { data: existingItem } = await supabase
    .from("Cart_items")
    .select("*")
    .eq("cart_id", cartId)
    .eq("item_id", itemId)
    .single();

  if (!existingItem) return res.status(404).json({ message: "Item not found in cart" });
  if (quantity > existingItem.quantity)
    return res.status(400).json({ message: "Cannot remove more than exists in cart" });

  // Restore stock
  const { data: item, error: itemError } = await supabase
    .from("Items")
    .select("quantity")
    .eq("id", itemId)
    .single();

  if (!item || itemError) return res.status(404).json({ message: "Item not found" });

  const { error: stockError } = await supabase
    .from("Items")
    .update({ quantity: item.quantity + quantity })
    .eq("id", itemId);

  if (stockError) return res.status(500).json({ message: "Failed to update stock" });

  // Update or delete cart item
  let cartItem;
  if (existingItem.quantity === quantity) {
    const { data: deletedItem, error: deleteError } = await supabase
      .from("Cart_items")
      .delete()
      .eq("id", existingItem.id)
      .select("*");
    if (deleteError) return res.status(500).json({ message: "Failed to delete cart item" });
    cartItem = deletedItem[0];
  } else {
    const { data: updatedItem, error: updateError } = await supabase
      .from("Cart_items")
      .update({ quantity: existingItem.quantity - quantity })
      .eq("id", existingItem.id)
      .select("*");
    if (updateError) return res.status(500).json({ message: "Failed to update cart item" });
    cartItem = updatedItem[0];
  }

  return res.status(200).json({ message: "Item removed successfully", cartItem });
};
