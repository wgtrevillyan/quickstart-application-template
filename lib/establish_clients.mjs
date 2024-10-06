// get_recent_gmail_msgs.mjs:

// Import necessary modules
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { getGoogleRefreshToken } from "./supabase_queries.mjs"
import dotenv from "dotenv";

// Load environment variables
dotenv.config(); 

// Function: Establish Gmail client for user with a refresh token
export async function connectToGmailClient(emailAccountId) {

    //console.log("Connecting to Gmail API...");

    // Load credentials
    try {
        //console.log("Loading Gmail credentials...");
        var clientId = process.env.GMAIL_CLIENT_ID;
        var clientSecret = process.env.GMAIL_CLIENT_SECRET;
        
        var refreshToken = await getGoogleRefreshToken(emailAccountId);

        if (!refreshToken) {
            throw new Error(`Retrieval of user's google refresh token failed, returning: ${refreshToken || null }`);
        }
    } catch (e) {
        console.error(e.message);
        throw error;
    }
    
 
    // Establish OAuth2 client
    //console.log("Creating OAuth2 client...");
    try { 
        var oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
        );
        oauth2Client.setCredentials({ refresh_token: refreshToken });
    } catch (error) {  
        console.error("Error creating OAuth2 client:", error.message);
        throw error;
    }
    
    // Retrieve new access token
    //console.log("Refreshing access token...");
    try {
        var { credentials } = await oauth2Client.refreshAccessToken();
        //console.log("Access token:", credentials.access_token);

        if (!credentials.access_token) {
            throw new Error(`Refreshing access token failed, returning ${credentials || null}`)
        }
        
        oauth2Client.setCredentials({ access_token: credentials.access_token });
        const expiresIn = credentials.expiry_date
            ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
            : credentials.expires_in;

        //console.log(`New access token obtained. Expires in ${expiresIn} seconds.`);
    } catch (error) {
        console.error("Error retrieving new access token:", error.message);
        throw error;
    }

    // Establish Gmail client
    //console.log("Creating Gmail client...");
    try {    
        var gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });

        if (!gmailClient) {
            throw new Error(`Failed to establish gmail client, returning null`)
        }
        //console.log("Gmail API connection established.");
    } catch (error) {  
        console.error("Unexpected error while creating Gmail client:", error.message);
        throw error;
    }
    


    // Retrieve the Gmail user ID
    //console.log("Retrieving Gmail user ID...");
    try {
        // Call the users.getProfile method
        var response = await gmailClient.users.getProfile({ userId: "me" });

        // Extract the email address from the response
        var emailAddress = response.data.emailAddress;

        if (!emailAddress) {
            throw new Error('Failed to get user email address from gmail, returning null.');
        }
        //console.log("Email Address:", emailAddress);
    } catch (error) {
        console.error("Error:", error.message);
        throw error;
    }

    //console.log("Gmail API connection established.");

    return { client: gmailClient, gUserId: emailAddress };
}

// Function: Establish Supabase client
export async function connectToSupabaseClient() {

    // Load environment variables
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;


    // Establish Supabase client
    //console.log(`Connecting to Supabase...`);
    try {
        const client = await createClient(url, key);

        if (!client) {
            throw new Error(`Failed to establish Supabase client, returning null.`)
        }

        //console.log("Supabase connection established.");
        return client;
    } catch (error) {
        console.error("Error: ", error.message);
        throw error;
    }
}


