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
    const lat = req.query.lat ? Number(req.query.lat) : null;
    const long = req.query.long ? Number(req.query.long) : null;

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

    // Optional: Compute nearby shop IDs if lat/long provided (5km)
    let nearbyShopIds = [];
    if (lat != null && long != null && Number.isFinite(lat) && Number.isFinite(long)) {
      const distanceKm = 5;
      const latRad = lat * (Math.PI / 180);
      const deltaLat = distanceKm / 111;
      const deltaLong = distanceKm / (111 * Math.cos(latRad));
      const minLat = lat - deltaLat;
      const maxLat = lat + deltaLat;
      const minLong = long - deltaLong;
      const maxLong = long + deltaLong;

      const { data: shopsBox, error: shopsErr } = await supabase
        .from('Shops')
        .select('id')
        .gte('Location->>latitude', String(minLat))
        .lte('Location->>latitude', String(maxLat))
        .gte('Location->>longitude', String(minLong))
        .lte('Location->>longitude', String(maxLong));
      if (shopsErr) throw shopsErr;
      nearbyShopIds = (shopsBox || []).map(s => s.id);
    }

    let recs = [];
    let itemsQuery = supabase
      .from('Items')
      .select('*')
      .gt('quantity', 0)
      .order('rating', { ascending: false, nullsFirst: false })
      .order('sold_qt', { ascending: false });
    if (nearbyShopIds && nearbyShopIds.length) {
      itemsQuery = itemsQuery.in('shop_id', nearbyShopIds);
    }
    const { data: candidates, error: candErr } = await itemsQuery.limit(Math.max(limit * 5, 100));

    if (candErr) throw candErr;

    let filteredCandidates = candidates || [];
    if (filteredCandidates.length) {
      const shopIds = Array.from(new Set(filteredCandidates.map(it => it.shop_id).filter(Boolean)));
      if (shopIds.length) {
        const { data: shops, error: shopsErr } = await supabase
          .from('Shops')
          .select('id, owner_id')
          .in('id', shopIds);
        if (shopsErr) throw shopsErr;
        const ownerIds = Array.from(new Set((shops || []).map(s => s.owner_id).filter(Boolean)));
        let owners = [];
        if (ownerIds.length) {
          const { data: users, error: usersErr } = await supabase
            .from('Users')
            .select('id, clerk_id')
            .in('id', ownerIds);
          if (usersErr) throw usersErr;
          owners = users || [];
        }
        const ownerIdToClerk = new Map(owners.map(u => [u.id, u.clerk_id]));
        const bannedOwnerClerks = new Set();
        for (const clerkOwnerId of Array.from(new Set(owners.map(u => u.clerk_id).filter(Boolean)))) {
          try {
            const cu = await clerk.users.getUser(clerkOwnerId);
            if (cu?.publicMetadata?.shop_banned) bannedOwnerClerks.add(clerkOwnerId);
          } catch {}
        }
        const bannedShopIds = new Set(
          (shops || [])
            .filter(s => bannedOwnerClerks.has(ownerIdToClerk.get(s.owner_id)))
            .map(s => s.id)
        );
        filteredCandidates = filteredCandidates.filter(it => !bannedShopIds.has(it.shop_id));
      }
    }

    const topCats = preferredCategories.slice(0, 3);
    const norm = (cat) => (Array.isArray(cat) ? cat : [cat]).filter(Boolean).map(String);
    const hasOverlap = (arr, cats) => {
      if (!arr || !cats || !cats.length) return false;
      const s = new Set(norm(arr));
      for (const c of cats) if (s.has(String(c))) return true;
      return false;
    };

    if (topCats.length) {
      recs = (filteredCandidates || []).filter((it) => hasOverlap(it.category, topCats)).slice(0, limit);
    }

    if (!recs.length) {
      recs = (filteredCandidates || []).slice(0, limit);
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
    const lat = req.query.lat ? Number(req.query.lat) : null;
    const long = req.query.long ? Number(req.query.long) : null;

    const { data: item, error: itemErr } = await supabase
      .from('Items')
      .select('id, category')
      .eq('id', itemId)
      .single();

    if (itemErr || !item) return res.status(404).json({ message: 'Item not found' });

    const categories = Array.isArray(item.category) ? item.category : [item.category].filter(Boolean);
    // Fetch candidates and filter in JS to avoid JSON operator issues
    // Optional: build nearby shop ids (5km) if lat/long present
    let nearbyShopIds = [];
    if (lat != null && long != null && Number.isFinite(lat) && Number.isFinite(long)) {
      const distanceKm = 5;
      const latRad = lat * (Math.PI / 180);
      const deltaLat = distanceKm / 111;
      const deltaLong = distanceKm / (111 * Math.cos(latRad));
      const minLat = lat - deltaLat;
      const maxLat = lat + deltaLat;
      const minLong = long - deltaLong;
      const maxLong = long + deltaLong;

      const { data: shopsBox, error: shopsErr } = await supabase
        .from('Shops')
        .select('id')
        .gte('Location->>latitude', String(minLat))
        .lte('Location->>latitude', String(maxLat))
        .gte('Location->>longitude', String(minLong))
        .lte('Location->>longitude', String(maxLong));
      if (shopsErr) throw shopsErr;
      nearbyShopIds = (shopsBox || []).map(s => s.id);
    }

    let simQuery = supabase
      .from('Items')
      .select('*')
      .gt('quantity', 0)
      .order('rating', { ascending: false, nullsFirst: false })
      .order('sold_qt', { ascending: false });
    if (nearbyShopIds && nearbyShopIds.length) {
      simQuery = simQuery.in('shop_id', nearbyShopIds);
    }
    const { data: simCandidates, error: simCandErr } = await simQuery.limit(300);

    if (simCandErr) throw simCandErr;

    const norm = (cat) => (Array.isArray(cat) ? cat : [cat]).filter(Boolean).map(String);
    const hasOverlap = (arr, cats) => {
      if (!arr || !cats || !cats.length) return false;
      const s = new Set(norm(arr));
      for (const c of cats) if (s.has(String(c))) return true;
      return false;
    };

    let filteredSim = simCandidates || [];
    if (filteredSim.length) {
      const shopIds = Array.from(new Set(filteredSim.map(it => it.shop_id).filter(Boolean)));
      if (shopIds.length) {
        const { data: shops, error: shopsErr } = await supabase
          .from('Shops')
          .select('id, owner_id')
          .in('id', shopIds);
        if (shopsErr) throw shopsErr;
        const ownerIds = Array.from(new Set((shops || []).map(s => s.owner_id).filter(Boolean)));
        let owners = [];
        if (ownerIds.length) {
          const { data: users, error: usersErr } = await supabase
            .from('Users')
            .select('id, clerk_id')
            .in('id', ownerIds);
          if (usersErr) throw usersErr;
          owners = users || [];
        }
        const ownerIdToClerk = new Map(owners.map(u => [u.id, u.clerk_id]));
        const bannedOwnerClerks = new Set();
        for (const clerkOwnerId of Array.from(new Set(owners.map(u => u.clerk_id).filter(Boolean)))) {
          try {
            const cu = await clerk.users.getUser(clerkOwnerId);
            if (cu?.publicMetadata?.shop_banned) bannedOwnerClerks.add(clerkOwnerId);
          } catch {}
        }
        const bannedShopIds = new Set(
          (shops || [])
            .filter(s => bannedOwnerClerks.has(ownerIdToClerk.get(s.owner_id)))
            .map(s => s.id)
        );
        filteredSim = filteredSim.filter(it => !bannedShopIds.has(it.shop_id));
      }
    }

    const similar = (filteredSim || [])
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

// Check if user is eligible to rate (must have purchased the item in past orders)
export const canRate = async (req, res) => {
  try {
    const { clerkId, itemId } = req.body;
    if (!clerkId || !itemId) return res.status(400).json({ message: 'Missing fields' });

    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('id, role')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) return res.status(404).json({ message: 'User not found' });
    if (user.role !== 'customer') return res.status(403).json({ message: 'Unauthorized' });

    const { data: orders, error: ordersError } = await supabase
      .from('Orders')
      .select('cart_id, payment_status')
      .eq('customer_id', user.id)
      .eq('payment_status', 'paid');
    if (ordersError) throw ordersError;
    const cartIds = (orders || []).map(o => o.cart_id).filter(Boolean);
    if (!cartIds.length) return res.status(200).json({ eligible: false });

    const { data: purchasedRows, error: purchasedErr } = await supabase
      .from('Cart_items')
      .select('id')
      .in('cart_id', cartIds)
      .eq('item_id', itemId)
      .limit(1);
    if (purchasedErr) throw purchasedErr;
    return res.status(200).json({ eligible: !!(purchasedRows && purchasedRows.length) });
  } catch (err) {
    console.error('Error in canRate:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};