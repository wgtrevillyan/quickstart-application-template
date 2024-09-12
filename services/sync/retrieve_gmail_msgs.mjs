// retrieve_gmail_msgs.mjs

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

import dotenv from "dotenv";

// Load environment variables
dotenv.config(); 

export default {
  async run({ messages }) {

    // FUNCTION: Create a Gmail client
    async function connect_to_gmail_client(userId) {
      // FUNCTION: Establish Supabase connection
      async function establishSupabaseClient(url, key) {
        console.log(`Connecting to Supabase at ${url}...`);
        try {
          const supabase = await createClient(url, key);
          console.log("Supabase connection established.");
          return supabase;
        } catch (error) {
          console.error(
            "Error establishing Supabase connection:",
            error.message
          );
          throw error;
        }
      }

      // FUNCTION: Retrieve secrets
      async function retrieveSecret(supabase, secretNames) {
        var secrets = {};
        for (const secretName of secretNames) {
          try {
            const { data, error } = await supabase.rpc("get_secret", {
              secret_name: secretName,
            });
            if (error) throw error;
            secrets[secretName] = data;
            console.log(`Secret retrieved for ${secretName}: ${data}`);
          } catch (error) {
            console.error(
              `Error retrieving secret '${secretName}':`,
              error.message
            );
            throw error;
          }
        }
        return secrets;
      }

      // FUNCTION: Retrieve Gmail access token
      async function retrieveGmailAccessToken(
        clientId,
        clientSecret,
        refreshToken
      ) {
        // Create OAuth2 client which will be used to refresh the access token
        console.log("clientId: ", clientId);
        console.log("clientSecret: ", clientSecret);
        console.log("refreshToken: ", refreshToken);
        try {
          var oauth2Client = new google.auth.OAuth2({
            clientId: clientId,
            clientSecret: clientSecret
          });
          oauth2Client.setCredentials({
            refresh_token: refreshToken,
          });
          console.log("OAuth2 client created:", oauth2Client);
        } catch (error) {
          console.error("Error creating OAuth2 client:", error.message);
          throw error;
        }

        // Refresh the access token
        try {
          console.log("Refreshing access token...");
          console.log("Credentials: ", await oauth2Client.refreshAccessToken());
          const { credentials } = await oauth2Client.refreshAccessToken();
          console.log("Access token refreshed:", credentials);
          const newAccessToken = credentials.access_token;
          console.log("New access token obtained:", newAccessToken);
          const expiresIn = credentials.expiry_date
            ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
            : credentials.expires_in;

          console.log(
            `New access token obtained. Expires in ${expiresIn} seconds.`
          );

          return credentials;
        } catch (error) {
          console.log("Error refreshing access token:", error.message);
          console.error("Error refreshing access token:", error.message);
          throw error;
        }
      }

      // FUNCTION: Establish Gmail API connection
      async function establishGmailConnection(secrets) {
        const oauth2Client = await new google.auth.OAuth2(
          secrets.gmail_client_id,
          secrets.gmail_client_secret
        );

        oauth2Client.setCredentials({
          access_token: secrets.gmail_access_token,
        });

        const gmail = await google.gmail({
          version: "v1",
          auth: oauth2Client,
        });

        try {
          // Test the connection by listing labels
          const response = await gmail.users.labels.list({
            userId: "me",
          });

          const labels = response.data.labels;
          if (!labels || labels.length === 0) {
            console.log("No labels found.");
            return { success: false, message: "No labels found." };
          }

          console.log("Connection to Gmail API successful.");
          //$.export('gmailClient', gmail); // Export the Gmail client for use in subsequent steps

          return gmail;
        } catch (error) {
          console.error("Error connecting to Gmail API:", error.message);
          throw error;
        }
      }

      /*
      // Establish Supabase connection
      const supabaseClient = await establishSupabaseClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      // Retrieve Gmail secrets
      const commonGmailSecretNames = ["gmail_client_id", "gmail_client_secret"];
      const commonGmailSecrets = await retrieveSecret(
        supabaseClient,
        commonGmailSecretNames
      );

      // Retrieve Gmail refresh token
      const modifiedUserId = userId.replace(/-/g, "_");
      console.log("modifiedUserId: ", modifiedUserId);
      const gmailRefreshSecretId = [`gmail_refresh_token_user_${modifiedUserId}`];
      const userGmailSecrets = await retrieveSecret(
        supabaseClient,
        gmailRefreshSecretId
      );

      // Retrieve Gmail access token
      const gmailAccessToken = await retrieveGmailAccessToken(
        commonGmailSecrets.gmail_client_id,
        commonGmailSecrets.gmail_client_secret,
        userGmailSecrets[gmailRefreshSecretId]
      );    
      */

      // Retrieve Gmail secrets
      const gmail_client_id = process.env.gmail_client_id;
      const gmail_client_secret = process.env.gmail_client_secret;
      const modifiedUserId = userId.replace(/-/g, "_");
      const gmail_refresh_token = process.env[`gmail_refresh_token_user_${modifiedUserId}`];
      // console.log("gmail_client_id: ", gmail_client_id);
      // console.log("gmail_client_secret: ", gmail_client_secret);
      // console.log(`gmail_refresh_token_user_${modifiedUserId}: `, gmail_refresh_token);

      // Retrieve Gmail access token
      const gmailAccessToken = await retrieveGmailAccessToken(
        gmail_client_id,
        gmail_client_secret,
        gmail_refresh_token
      );

      // Combine all secrets
      const secrets = {
        gmail_client_id,
        gmail_client_secret,
        gmail_refresh_token,
        gmail_access_token: gmailAccessToken.access_token,
      };

      // Establish Gmail connection
      var client = await establishGmailConnection(secrets);

      // Retrieve the Gmail user ID
      try {
        // Call the users.getProfile method
        const response = await client.users.getProfile({ userId: "me" });

        // Extract the email address from the response
        var emailAddress = response.data.emailAddress;
        //console.log("Email Address:", emailAddress);
      } catch (error) {
          console.error("Error retrieving Gmail user ID:", error.message);
          throw error;
      }

      return { client: client, gUserId: emailAddress };
    }

    // FUNCTION: Retrieve messages list
    async function retrieveMsgsLst(gmailClient, gUserId) {

      // FUNCTION: Get last stored Gmail message ID from Supabase gMailMessages table
      async function getLastStoredGMsgId(gUserId) {
        // FUNCTION: Establish Supabase connection
        async function establishSupabaseClient(url, key) {
        console.log(`Connecting to Supabase at ${url}...`);
        try {
            const supabase = await createClient(url, key);
            console.log("Supabase connection established.");
            return supabase;
        } catch (error) {
            console.error(
            "Error establishing Supabase connection:",
            error.message
            );
            throw error;
        }
        }

        // Establish Supabase connection
        const supabaseClient = await establishSupabaseClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );

        // Retrieve the last stored message ID
        try {
          var { data, error } = await supabaseClient
            .from("gmailMessages")
            .select("gMsgId")
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

        return data[0].gMsgId;
      }

      var lastStoredMsgId = await getLastStoredGMsgId(gUserId);

      var messages = [];
      let pageToken = null;
      const query = 'label:inbox newer_than:90d'; // 
      var response = null;
      var newMsgs = [];
      var i = 0;
    
      do {
        i++; // Increment the counter

        // Retrieve messages list
        try {
          console.log(`Call ${i}: Retrieving 500 gmail messages...`);
          response = await gmailClient.users.messages.list({
            userId: gUserId,
            q: query,
            maxResults: 500,
            pageToken: pageToken,
          });

        } catch (error) {
          console.error('The Gmail API returned an error:', error);
          throw error;
        }
  
        if (response.data.messages) {

          newMsgs = response.data.messages || [];

          // Check if lastStoredMsgId is the most recent message
          if (newMsgs[0].id === lastStoredMsgId) {
            console.log("No new messages available. Exiting Pipedream workflow...");
            //$.flow.exit(); //for pipedream only
            process.exit(0); //for local testing
          }

          messages.push(...newMsgs);

          // Check if lastStoredMsgId is found in the messages
          if (newMsgs.some(msg => msg.id === lastStoredMsgId)) {
            console.log("Last stored message found in the previous 500 retrieved messages.");
            break; // Exit the loop if found
          }
        } else {
          console.log(`No msgs found from messages list API call #${i}`);
          break;
        }
        
        
        pageToken = null; // Reset the page token
        if (response.data.nextPageToken) {pageToken = response.data.nextPageToken;} // Set the page token if available
        //console.log(`Next page token: ${pageToken}`);
        //console.log(`response.data.nextPageToken: ${response.data.nextPageToken}`);
        
        response = null; // Reset the response
        newMsgs = []; // Reset the new messages list
        
      } while (pageToken);

      console.log(`Retrieved metadata for ${messages.length} messages.`);
  
      return messages;

    }


    /////////////////////////////////////////////////////////////


    //const userId = steps.trigger.event.query.user; // For running on pipedream
    const userId = "de14618c-da53-4cb4-b222-4ae3292c8345"; // For testing locally

    console.log("Retrieving Gmail messages...");

    // Establish Gmail connection
    var gmail = await connect_to_gmail_client(userId);

    // Retrieve messages list
    var messages_lst = await retrieveMsgsLst(gmail.client, gmail.gUserId);
    //console.log("Messages: ", messages);

    // Export messages
    console.log(`Exporting results...`);

    this.messages = messages_lst; // Export the messages list for use in subsequent steps

    console.log(`Retrieved ${messages_lst.length} messages.`);
    console.log("\n");

    return `Retrieved Gmail Messages: ${messages_lst.length}`;
  },
};
