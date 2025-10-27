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

        // Count categories (category may be a string or an array/json)
        const catCount = new Map();
        for (const ci of purchasedItems || []) {
          let cat = ci?.Items?.category;
          if (!cat) continue;
          const cats = Array.isArray(cat) ? cat : [cat];
          for (const c of cats) {
            if (!c) continue;
            catCount.set(c, (catCount.get(c) || 0) + 1);
          }
        }
        preferredCategories = Array.from(catCount.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([c]) => c);
      }
    }

    let recs = [];
    // Pull a candidate set ordered by rating and sold, then filter in JS to avoid JSON operator issues
    const { data: candidates, error: candErr } = await supabase
      .from('Items')
      .select('*')
      .gt('quantity', 0)
      .order('rating', { ascending: false, nullsFirst: false })
      .order('sold_qt', { ascending: false })
      .limit(Math.max(limit * 5, 100));

    if (candErr) throw candErr;

    const topCats = preferredCategories.slice(0, 3);
    const norm = (cat) => (Array.isArray(cat) ? cat : [cat]).filter(Boolean).map(String);
    const hasOverlap = (arr, cats) => {
      if (!arr || !cats || !cats.length) return false;
      const s = new Set(norm(arr));
      for (const c of cats) if (s.has(String(c))) return true;
      return false;
    };

    if (topCats.length) {
      recs = (candidates || []).filter((it) => hasOverlap(it.category, topCats)).slice(0, limit);
    }

    if (!recs.length) {
      // Fallback: top popular items globally
      recs = (candidates || []).slice(0, limit);
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

    const categories = Array.isArray(item.category) ? item.category : [item.category].filter(Boolean);
    // Fetch candidates and filter in JS to avoid JSON operator issues
    const { data: simCandidates, error: simCandErr } = await supabase
      .from('Items')
      .select('*')
      .gt('quantity', 0)
      .order('rating', { ascending: false, nullsFirst: false })
      .order('sold_qt', { ascending: false })
      .limit(300);

    if (simCandErr) throw simCandErr;

    const norm = (cat) => (Array.isArray(cat) ? cat : [cat]).filter(Boolean).map(String);
    const hasOverlap = (arr, cats) => {
      if (!arr || !cats || !cats.length) return false;
      const s = new Set(norm(arr));
      for (const c of cats) if (s.has(String(c))) return true;
      return false;
    };

    const similar = (simCandidates || [])
      .filter((it) => String(it.id) !== String(item.id))
      .filter((it) => hasOverlap(it.category, categories))
      .slice(0, limit);

    return res.status(200).json({ items: similar });
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
    const { data: rating, error: ratingErr } = await supabase
      .from('itemRating')
      .select('rating')
      .eq('item_id', itemId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (ratingErr) throw ratingErr;
    if (!rating) {
      return res.status(404).json({ message: "Rating not found" });
    }
    return res.status(200).json(rating);
  } catch (err) {
    console.error('Error in getRating:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};