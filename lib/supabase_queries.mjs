// lib/subabase_queries.mjs:

// Import necessary modules
import { connectToSupabaseClient } from "./establish_clients.mjs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config(); 

// Function: Get last stored Gmail message ID from Supabase gMailMessages table
export async function getLastStoredGMsgId(gUserId) {

    const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client

    // Retrieve the last stored message ID
    console.log("Retrieving last stored message ID...");
    try {
        var { data, error } = await supabaseClient
            .from("gmailMessages")
            .select("userId", "gMsgId", "receivedAt")
            .eq("gMsgUserId", gUserId)
            .order("receivedAt", { ascending: false })
            .limit(1);  
    } catch (error) {
        console.error("Error retrieving last stored message ID:", error.message);
        throw error;
    }

    if (data.length === 0) {
        return null;
    }

    // print the last stored message's date and time
    console.log("Last stored message received at:", data[0].receivedAt);

    return data[0].gMsgId; 
}

// Function: Get last stored Gmail history ID
export async function getLastGHistoryId(gUserId) {

    const supabaseClient = await createSupabaseClient(); // Create a new Supabase client

    // Retrieve the last stored message ID
    console.log("Retrieving last stored history ID...");
    try {
        var { data, error } = await supabaseClient
            .from("email_accounts")
            .select("gmailUserId", "lastGmailHistoryId", "syncedAt")
            .eq("gmailUserId", gUserId);  
    } catch (error) {
        console.error("Error retrieving last stored history ID:", error.message);
        throw error;
    }

    if (data.length === 0) {
        return null;
    }

    // print the last stored message's date and time
    console.log("Last sync occured at:", data[0].syncedAt);

    return data[0].lastGmailHistoryId; 
}

// Function: Update last stored Gmail history ID
export async function updateLastGHistoryId(gUserId, gHistoryId) {

    const supabaseClient = await createSupabaseClient(); // Create a new Supabase client

    // Update the last stored history ID
    console.log("Updating last stored history ID...");

    const synced_at = new Date().toISOString();
    try {
        var { data, error } = await supabaseClient
            .from("email_accounts")
            .update({ lastGmailHistoryId: gHistoryId, syncedAt: synced_at })
            .eq("gmailUserId", gUserId);  
        console.log("Last stored history ID updated.");
        return true;
    } catch (error) {
        console.error("Error updating last stored history ID:", error.message);
        throw error;
    }
}