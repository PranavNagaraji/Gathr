import express from "express";
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import supabase from "./db.js";
import merchantRoutes from "./routes/merchant.js";

dotenv.config();

const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true , limit: '50mb'}));

app.use(clerkMiddleware());

//routes
app.use("/api/merchant", merchantRoutes);


app.get("/", (req, res) => res.send("Hello from backend!"));


app.post("/set-role", async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ message: "Missing userId or role" });
  }

  try {
    console.log("Setting role for user", userId, "to", role);

    // 2. Set role in Clerk's metadata
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });

    // 3. Get the full user object from Clerk
    const user = await clerk.users.getUser(userId);
    console.log("User info from Clerk:", user);

    const email = user.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      // This is an important check for users who might sign up with phone numbers
      return res.status(400).json({ message: "User email not found in Clerk" });
    }

    // 4. Use `upsert` to either insert a new user or update an existing one in Supabase.
    // This prevents errors on subsequent calls for the same user.
    // We'll use the `clerk_id` as the conflict target, assuming it's a UNIQUE column.
    const { data, error } = await supabase
      .from("Users")
      .upsert(
        {
          clerk_id: user.id, // This should be the unique identifier
          email,
          role,
          first_name: user.firstName,
          last_name: user.lastName,
        },
        {
          onConflict: "clerk_id", // The column that causes a conflict
        }
      )
      .select(); // .select() is good practice to get the inserted/updated row back

    if (error) {
      // If there's a database-specific error, throw it to the catch block
      throw error;
    }

    return res.status(200).json({
      message: "Role set and user data synced to Supabase successfully.",
      user: data, // Return the data from Supabase
    });
  } catch (error) {
    console.error("Error in /set-role endpoint:", error);
    // Clerk errors often have a `errors` array with more details.
    const errorMessage = error.errors?.[0]?.message || error.message || "An unknown error occurred.";
    return res.status(500).json({ message: errorMessage, error });
  }
});

app.listen(5000, () => console.log("Backend listening on port 5000!"));