// lib/subabase_queries.mjs:

// Import necessary modules
import { on } from "events";
import { connectToSupabaseClient } from "./establish_clients.mjs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config(); 

// Function: Get arbitrary future timestamp
export function getArbitraryFutureTimestamp() {
    const currentDate = new Date();
    const oneHourLater = new Date(currentDate.getTime() + 3600000);
    const futureTimestamp = oneHourLater.toISOString();
    return futureTimestamp;
}

// Function: Get last stored Gmail message ID from Supabase gMailMessages table
export async function getLastStoredGMsgId(gUserId) {

    const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client

    // Retrieve the last stored message ID
    console.log("Retrieving last stored message ID...");
    try {
        var { data, error } = await supabaseClient
            .from("gmailMessages")
            .select("userId, gMsgUserId, gMsgId, receivedAt")
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

    const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client
    const futureTimestamp = getArbitraryFutureTimestamp();

    // Retrieve the last stored message ID
    console.log("Retrieving last stored history ID...");
    var result = null;
    try {
        const { data, error } = await supabaseClient
            .from("email_accounts")
            .select("userId, gmailUserId, lastGmailHistoryId, syncedAt")
            .eq("gmailUserId", gUserId)
            .lt("createdAt", futureTimestamp);  
        result = data;
    } catch (error) {
        console.error("Error retrieving last stored history ID:", error.message);
        throw error;
    }

    if (result === null || result.length === 0) {
        return null;
    }

    // print the last stored message's date and time
    console.log("Last sync occured at:", result[0].syncedAt);

    return result[0].lastGmailHistoryId; 
}

// Function: Update last stored Gmail history ID
export async function updateLastGHistoryId(gUserId, gHistoryId) {

    const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client

    // Update the last stored history ID
    console.log("Updating last stored history ID...");

    console.log("gUserId: ", gUserId);
    console.log("gHistoryId: ", gHistoryId);
    const synced_at = new Date().toISOString();
    console.log("Synced at: ", synced_at);
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

// Function: Check if gmail message is already stored
export async function isGmailMsgStored(supabaseClient, gUserId, gMsgId) {
    
    
    const futureTimestamp = getArbitraryFutureTimestamp();

    // Check if the message is already stored
    var result = null;
    try {
        const { data, error } = await supabaseClient
            .from("gmailMessages")
            .select("gMsgId")
            .eq("gMsgId", gMsgId)
            .eq("gMsgUserId", gUserId)
            .lt("createdAt", futureTimestamp);   
        result = data;
        //console.log("Result: ", result);
    } catch (error) {
        console.error("Error checking if message is already stored:", error.message);
        throw error;
    }

    if ( result === null || result.length === 0) {
        console.log(`Message with ID ${gMsgId} is not stored.`);
        return false;
    }

    return true;
}

// Function: Get user's authId
export async function  getAuthId(userId) {

    const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client

    try {
      const { data, error } = await supabaseClient()
        .from('users')
        .select('authId')
        .eq('id', userId);
  
      if (error) {
        throw new Error(error.message);
      } else if (data === null) {
        throw new Error('Auth id not retrieved. Returned data is null.');
      } else {
        return data;
      }
    } catch (err) {
      console.error('Retrieval of auth id failed. Unexpected error:', err);
      return null;
    }
}

// Function: Get user's email account IDs
export async function getEmailAccountIds(userId) {

    const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client
    
    try {
      const { data, error } = await supabaseClient
        .from('emailAccounts')
        .select('id')
        .eq('userId', userId);
  
      if (error) {
        throw new Error(error.message);
      } else if (data === null) {
        throw new Error('Email account ids not retrieved. Returned data is null.');
      } else {
        return data;
      }
    } catch (err) {
      console.error('Retrieval of email account ids failed. Unexpected error:', err);
      return null;
    }
}

// Function: Get user's refresh token
export async function getGoogleRefreshToken(emailAccountId) {

    try {
        const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client

        const key = `GMAIL_REFRESH_TOKEN_${emailAccountId}`;

        console.log("Retrieving secret refresh token...");
        const { data, error } = await supabaseClient.rpc('get_secret', { secret_name: key });

        if (error) {
            throw new Error(error.message);
        } else if (data === null) {
            throw new Error('Retrieval of users gmail refresh token failed, returning null.')
        } else {
            return data;
        }

    } catch (e) {
        console.error('Unexpected error occured: ', e.message)
        throw error
    }

}
