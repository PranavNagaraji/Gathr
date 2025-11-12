import supabase from "../db.js";

export const createComplaint = async (req, res) => {
  try {
    const { name = "", email = "", message = "", clerkId } = req.body || {};
    const user_clerk_id = clerkId || req.user?.sub || null;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "Message is required" });
    }
    const payload = {
      user_clerk_id,
      name: name || null,
      email: email || null,
      message: String(message),
      status: "open",
    };
    const { data, error } = await supabase
      .from("Complaints")
      .insert([payload])
      .select("*")
      .single();
    if (error) return res.status(500).json({ message: "Failed to create complaint", error: error.message });
    return res.status(201).json({ complaint: data });
  } catch (e) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listComplaints = async (req, res) => {
  try {
    const { status, q, from, to } = req.query || {};
    let query = supabase.from("Complaints").select("*").order("created_at", { ascending: false });
    const s = String(status || "").toLowerCase();
    if (["open", "resolved"].includes(s)) {
      query = query.eq("status", s);
    }
    if (from) {
      const f = new Date(from);
      if (!isNaN(f.getTime())) query = query.gte("created_at", f.toISOString());
    }
    if (to) {
      const t = new Date(to);
      if (!isNaN(t.getTime())) query = query.lte("created_at", t.toISOString());
    }
    // For q, fetch a reasonable set then filter in JS to match multiple fields
    const { data, error } = await query.limit(1000);
    if (error) return res.status(500).json({ message: "Failed to fetch complaints", error: error.message });
    let out = data || [];
    const term = String(q || "").trim().toLowerCase();
    if (term) {
      out = out.filter((c) => {
        const name = String(c.name || "").toLowerCase();
        const email = String(c.email || "").toLowerCase();
        const uid = String(c.user_clerk_id || "").toLowerCase();
        const msg = String(c.message || "").toLowerCase();
        return name.includes(term) || email.includes(term) || uid.includes(term) || msg.includes(term);
      });
    }
    return res.status(200).json({ complaints: out });
  } catch (e) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!id) return res.status(400).json({ message: "Missing complaint id" });
    const s = String(status || "").toLowerCase();
    if (!["open", "resolved"].includes(s)) return res.status(400).json({ message: "Invalid status" });
    const { data, error } = await supabase
      .from("Complaints")
      .update({ status: s })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return res.status(500).json({ message: "Failed to update complaint", error: error.message });
    return res.status(200).json({ complaint: data });
  } catch (e) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
