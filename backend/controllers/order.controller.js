import supabase from '../db.js';
import {Clerk} from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export const getOrders= async(req, res)=>{
    const {data, error}=await supabase
}