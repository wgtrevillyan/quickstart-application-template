// get_recent_gmail_msgs.mjs:

// Import necessary modules
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import dotenv from "dotenv";

// Load environment variables
dotenv.config(); 

// Function: Establish Gmail client
export async function connectToGmailClient(userId) {

    console.log("Connecting to Gmail API...");

    // Load credentials
    logger.log("Loading Gmail credentials...");
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const modifiedUserId = userId.replace(/-/g, "_");
    const refreshToken = process.env[`gmail_refresh_token_user_${modifiedUserId}`];

    // Establish OAuth2 client
    console.log("Creating OAuth2 client...");
    try { 
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
        );
        oauth2Client.setCredentials({ refresh_token: refreshToken });
    } catch (error) {  
        console.error("Error creating OAuth2 client:", error.message);
        throw error;
    }
    
    // Retrieve new access token
    console.log("Refreshing access token...");
    try {
        const { tokens } = await oauth2Client.refreshAccessToken();
        
        oauth2Client.setCredentials(tokens.access_token);
        const expiresIn = credentials.expiry_date
            ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
            : credentials.expires_in;
        console.log(
            `New access token obtained. Expires in ${expiresIn} seconds.`
        );
    } catch (error) {
        console.error("Error retrieving new access token:", error.message);
        throw error;
    }

    // Establish Gmail client
    console.log("Creating Gmail client...");
    try {    
        const gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });
    } catch (error) {  
        console.error("Error creating Gmail client:", error.message);
        throw error;
    }
    console.log("Gmail API connection established.");


    // Retrieve the Gmail user ID
    console.log("Retrieving Gmail user ID...");
    try {
        // Call the users.getProfile method
        const response = await gmailClient.users.getProfile({ userId: "me" });

        // Extract the email address from the response
        const emailAddress = response.data.emailAddress;
        //console.log("Email Address:", emailAddress);
    } catch (error) {
        console.error("Error retrieving gmailUserId:", error.message);
        throw error;
    }

    return { client: gmailClient, gUserId: emailAddress };
}

// Function: Establish Supabase client
export async function connectToSupabaseClient() {

    // Load environment variables
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;


    // Establish Supabase client
    console.log(`Connecting to Supabase...`);
    try {
        const client = await createClient(url, key);
        console.log("Supabase connection established.");
        return client;
    } catch (error) {
        console.error(
            "Error establishing Supabase connection:",
            error.message
        );
        throw error;
    }
}


