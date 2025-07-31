import express from "express";
import { Clerk } from "@clerk/clerk-sdk-node"; 
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const clerk = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY }); 

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => res.send("Hello from backend!"));

app.post("/set-role",async (req,res)=>{
    const { userId, role } = req.body;

    if(!userId || !role)
        return res.status(400).json({ message: "Missing userId or role" });

    try {
        await clerk.users.updateUserMetadata(userId, {
            publicMetadata : { role }
        });

        return res.status(200).json({ message: "Role set successfully" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
    }

})

app.listen(5000, () => console.log("Backend listening on port 3000!"));