import express from "express";
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import supabase from "./db.js";
import merchantRoutes from "./routes/merchantRoute.js";
import customerRoutes from "./routes/customerRoute.js";
import orderRoutes from "./routes/orderRoute.js";
import stripeRoutes from "./stripeIntegration.js";
dotenv.config();

const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

const app = express();

app.use(cors());

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

app.use(clerkMiddleware());

//routes
app.use("/api/merchant", merchantRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/order", orderRoutes);
app.use("/stripe", stripeRoutes);
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

app.listen(5000, () => console.log("Backend listening running on http://localhost:5000"));