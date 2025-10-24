import supabase from '../db.js';
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

// Personalized recommendations based on user's past orders (category preference) with popularity fallback
export const getRecommendations = async (req, res) => {
  try {
    const { clerkId } = req.params;
    const limit = Number(req.query.limit) || 20;

    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('id, role')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) return res.status(404).json({ message: 'User not found' });
    if (user.role !== 'customer') return res.status(403).json({ message: 'Unauthorized' });

    // Fetch recent orders for the user
    const { data: orders, error: ordersError } = await supabase
      .from('Orders')
      .select('id, cart_id')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (ordersError) throw ordersError;

    let preferredCategories = [];
    if (orders && orders.length) {
      const cartIds = orders.map(o => o.cart_id).filter(Boolean);
      if (cartIds.length) {
        // Get items purchased in those carts
        const { data: purchasedItems, error: itemsError } = await supabase
          .from('Cart_items')
          .select('item_id, Items(category)')
          .in('cart_id', cartIds);

        if (itemsError) throw itemsError;

        // Count categories
        const catCount = new Map();
        for (const ci of purchasedItems || []) {
          const cat = ci?.Items?.category;
          if (!cat) continue;
          catCount.set(cat, (catCount.get(cat) || 0) + 1);
        }
        preferredCategories = Array.from(catCount.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([c]) => c);
      }
    }

    let recs = [];
    if (preferredCategories.length) {
      // Pull items from top categories, prioritize rating then sold_qt, only in-stock
      const topCats = preferredCategories.slice(0, 3);
      const { data: catItems, error: catErr } = await supabase
        .from('Items')
        .select('*')
        .in('category', topCats)
        .gt('quantity', 0)
        .order('rating', { ascending: false, nullsFirst: false })
        .order('sold_qt', { ascending: false });

      if (catErr) throw catErr;
      recs = (catItems || []).slice(0, limit);
    }

    if (!recs.length) {
      // Fallback: popular items globally
      const { data: popular, error: popErr } = await supabase
        .from('Items')
        .select('*')
        .gt('quantity', 0)
        .order('rating', { ascending: false, nullsFirst: false })
        .order('sold_qt', { ascending: false })
        .limit(limit);

      if (popErr) throw popErr;
      recs = popular || [];
    }

    return res.status(200).json({ recommendations: recs });
  } catch (err) {
    console.error('Error in getRecommendations:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Similar items by category with rating/sales prioritization
export const getSimilarItems = async (req, res) => {
  try {
    const { itemId } = req.params;
    const limit = Number(req.query.limit) || 20;

    const { data: item, error: itemErr } = await supabase
      .from('Items')
      .select('id, category')
      .eq('id', itemId)
      .single();

    if (itemErr || !item) return res.status(404).json({ message: 'Item not found' });

    const { data: similar, error: simErr } = await supabase
      .from('Items')
      .select('*')
      .eq('category', item.category)
      .neq('id', item.id)
      .gt('quantity', 0)
      .order('rating', { ascending: false, nullsFirst: false })
      .order('sold_qt', { ascending: false })
      .limit(limit);

    if (simErr) throw simErr;

    return res.status(200).json({ items: similar || [] });
  } catch (err) {
    console.error('Error in getSimilarItems:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

export const getRating = async (req, res) => {
  try {
    const { clerkId, itemId } = req.body;
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
    const { itemId } = req.params;
    const { data: rating, error: ratingErr } = await supabase
      .from('itemRating')
      .select('rating')
      .eq('item_id', itemId)
      .single();

    if (ratingErr) throw ratingErr;

    return res.status(200).json({ rating });
  } catch (err) {
    console.error('Error in getRating:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};