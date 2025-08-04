import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- TEMPORARY DEBUGGING LOGS ---
console.log("--- Supabase Connection Details ---");
console.log("URL Loaded:", supabaseUrl ? "Yes" : "No");
console.log("Service Key Loaded:", supabaseServiceRoleKey ? "Yes" : "No");
console.log("---------------------------------");
// --- END DEBUGGING LOGS ---

// If the logs above show "No", then dotenv is not working.
// You can temporarily hard-code them to isolate the problem:
// const supabaseUrl = "https://your-project-ref.supabase.co"; // PASTE URL HERE FOR TEST
// const supabaseServiceRoleKey = "your-long-service-role-key"; // PASTE KEY HERE FOR TEST

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default supabase;