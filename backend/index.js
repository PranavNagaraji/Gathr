import express from "express";
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import supabase from "./db.js";
import pg from "pg";
import merchantRoutes from "./routes/merchantRoute.js";
import customerRoutes from "./routes/customerRoute.js";
import orderRoutes from "./routes/orderRoute.js";
import stripeRoutes from "./stripeIntegration.js";
import deliveryRoutes from "./routes/deliveryRoute.js";
import otpRouter from "./routes/otpRoute.js";

dotenv.config();

const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

const app = express();


//cors policy security check
app.use(cors({
  origin: ["https://gathr-se.vercel.app" , "http://localhost:3000"], 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

// CRITICAL: Webhook route MUST come BEFORE express.json()
// Stripe needs raw body for signature verification
app.post("/stripe/webhook", express.raw({type: 'application/json'}), async (req, res, next) => {
  // Forward to stripe routes
  req.url = '/webhook';
  stripeRoutes(req, res, next);
});

// Now apply JSON parser for all other routes
app.use(express.json({ limit: "50mb"}));
app.use(express.urlencoded({ extended: true , limit: '50mb'}));

// Public routes (no Clerk auth)
app.use("/api/otp", otpRouter);

// Protected routes (Clerk auth required)
app.use(clerkMiddleware());

//routes
app.use("/api/merchant", merchantRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/order", orderRoutes);
app.use("/stripe", stripeRoutes);
app.use("/api/delivery", deliveryRoutes);
//test route
app.get("/", (req, res) => res.send("Hello from backend!"));


app.post("/set-role", async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ message: "Missing userId or role" });
  }

  try {
    console.log("Setting role for user", userId, "to", role);

    // Set role in Clerk's metadata
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });

    const user = await clerk.users.getUser(userId);
    console.log("User info from Clerk:", user);

    const email = user.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return res.status(400).json({ message: "User email not found in Clerk" });
    }

    const { data, error } = await supabase
      .from("Users")
      .upsert(
        {
          clerk_id: user.id,
          email,
          role,
          first_name: user.firstName,
          last_name: user.lastName,
        },
        {
          onConflict: "clerk_id",
        }
      )
      .select();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      message: "Role set and user data synced to Supabase successfully.",
      user: data, 
    });
  } catch (error) {
    console.error("Error in /set-role endpoint:", error);
    const errorMessage = error.errors?.[0]?.message || error.message || "An unknown error occurred.";
    return res.status(500).json({ message: errorMessage, error });
  }
});

async function ensureWishlistSchema() {
  const { SUPABASE_DB_URL } = process.env;
  if (!SUPABASE_DB_URL) {
    console.warn("[ensureWishlistSchema] SUPABASE_DB_URL not set; skipping migration");
    return;
  }
  const pool = new pg.Pool({ connectionString: SUPABASE_DB_URL, max: 1 });
  const sql = `
  create table if not exists public.wishlist (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    item_id uuid not null,
    shop_id uuid not null,
    created_at timestamptz default now(),
    unique (user_id, item_id)
  );
  alter table public.wishlist enable row level security;
  do $$
  begin
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'wishlist' and policyname = 'read own wishlist'
    ) then
      create policy "read own wishlist" on public.wishlist for select using (auth.uid() = user_id);
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'wishlist' and policyname = 'insert own wishlist'
    ) then
      create policy "insert own wishlist" on public.wishlist for insert with check (auth.uid() = user_id);
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'wishlist' and policyname = 'delete own wishlist'
    ) then
      create policy "delete own wishlist" on public.wishlist for delete using (auth.uid() = user_id);
    end if;
  end$$;`;
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('commit');
    console.log('[ensureWishlistSchema] wishlist schema ensured');
  } catch (e) {
    await client.query('rollback');
    console.error('[ensureWishlistSchema] migration failed:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

app.listen(5000, () => console.log("Backend listening running on http://localhost:5000"));