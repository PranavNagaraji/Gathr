import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("--- Supabase Connection Details ---");
console.log("URL Loaded:", supabaseUrl ? "Yes" : "No");
console.log("Service Key Loaded:", supabaseServiceRoleKey ? "Yes" : "No");
console.log("---------------------------------");


const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default supabase;