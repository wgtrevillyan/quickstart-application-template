// retrieve_msg_details.mjs

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export default {
  async run({ messages, processed_messages }) {

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
              console.log(`Secret retrieved.`);
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
          try {
            var oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
            oauth2Client.setCredentials({
              refresh_token: refreshToken,
            });
          } catch (error) {
            console.error("Error creating OAuth2 client:", error.message);
            throw error;
          }
  
          // Refresh the access token
          try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            const newAccessToken = credentials.access_token;
            const expiresIn = credentials.expiry_date
              ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
              : credentials.expires_in;
  
            console.log(
              `New access token obtained. Expires in ${expiresIn} seconds.`
            );
  
            return credentials;
          } catch (error) {
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
        const gmailRefreshSecretId = [`gmail_refresh_token_user_${userId}`];
        const userGmailSecrets = await retrieveSecret(
          supabaseClient,
          gmailRefreshSecretId
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
  
    // FUNCTION: Process messages
    async function processMessages(gmailClient, messages, userId, gUserId) {
      // FUNCTION: Extract data from payload
      function extractDataFromPayload(msgPayload) {
        function getHeaderValue(headers, key) {
          for (const header of headers) {
            if (header.name === key) {
              return header.value;
            }
          }
          return null;
        }

        function getMsgBody(msgPayload) {
          function getBodyFromParts(parts) {
            let bodyTextData = null,
              bodyHtmlData = null;
            for (const part of parts) {
              if (part.mimeType === "text/plain") {
                if ("data" in part.body) {
                  bodyTextData = part.body.data;
                }
              } else if (part.mimeType === "text/html") {
                if ("data" in part.body) {
                  bodyHtmlData = part.body.data;
                }
              } else if ("parts" in part) {
                return getBodyFromParts(part.parts);
              }
            }
            return [bodyTextData, bodyHtmlData];
          }

          let bodyTextData, bodyHtmlData;
          if ("body" in msgPayload && "data" in msgPayload.body) {
            bodyTextData = null;
            bodyHtmlData = msgPayload.body.data;
          } else if ("parts" in msgPayload) {
            [bodyTextData, bodyHtmlData] = getBodyFromParts(msgPayload.parts);
          } else {
            return null;
          }

          if (bodyTextData) {
            bodyTextData = Buffer.from(bodyTextData, "base64").toString(
              "utf-8"
            );
          }
          if (bodyHtmlData) {
            bodyHtmlData = Buffer.from(bodyHtmlData, "base64").toString(
              "utf-8"
            );
          }

          return [bodyTextData, bodyHtmlData];
        }

        const headers = msgPayload.headers;
        //console.log('Headers:', headers);
        const senderNameAndEmail = getHeaderValue(headers, "From");
        //console.log('Sender:', senderNameAndEmail);
        const senderName = senderNameAndEmail.split("<")[0].trim();
        //console.log('Sender Name:', senderName);
        const senderEmail = senderNameAndEmail.split("<")[1].split(">")[0];
        //console.log('Sender Email:', senderEmail);
        const subject = getHeaderValue(headers, "Subject");
        //console.log('Subject:', subject);
        const [bodyText, bodyHtml] = getMsgBody(msgPayload);
        //console.log('Body Text:', bodyText);
        //console.log('Body HTML:', bodyHtml);

        return [senderName, senderEmail, subject, bodyText, bodyHtml];
      }

      // FUNCTION: Create dictionary of message details
      function createDictOfMsg(
        userId,
        gMsgId,
        gMsgThreadId,
        gMsgUserId,
        receivedAt,
        senderName,
        senderEmail,
        subject,
        bodySnippet,
        bodyText,
        bodyHtml,
        payload
      ) {
        return {
          userId,
          gMsgId,
          gMsgThreadId,
          gMsgUserId,
          receivedAt,
          senderName,
          senderEmail,
          subject,
          bodySnippet,
          bodyText,
          bodyHtml,
          payload,
        };
      }

      // FUNCTION: Convert timestamp
      function convertTimestamp(ms) {
        ms = parseInt(ms);
        if (isNaN(ms)) {
          throw new Error(`Invalid timestamp value: ${ms}`);
        }

        const timestampS = ms / 1000;
        const dtObject = new Date(timestampS * 1000);
        return dtObject.toISOString().replace("T", " ").slice(0, 19);
      }

      //////////////////////////////

      const msgs_lst = [];

      // Process each message
      for (let i = 0; i < messages.length; i++) {
        // For testing
        /*
                if (i === 1) {
                    break;
                }
                */

        process.stdout.write(
          `Parsing message details for message ${i + 1} of ${
            messages.length
          }...\r`
        );

        const message = messages[i];

        // Check if the message is available
        if (!message.id) {
          console.log("No id found.");
          continue;
        } 

        /*
        // Check if the last stored message has been reached
        if (lastStoredGMsgId && message.id === lastStoredGMsgId) { 
            console.log(`Last stored message reached: ${lastStoredGMsgId}. Exiting loop...`);
            break;
        }
        */

        const msg_id = message.id;
        var error_msgs = [];
        var msgResults = null;
        try {
            msgResults = await gmailClient.users.messages.get({
                userId: gUserId,
                id: message.id,
            });
        } catch (error) {
            error_msgs.push(error);
            continue;
        }

        if (!msgResults.data) {
            console.log(`No info found from get_message API call for ID: ${msg_id}.`);
            continue;
        }

        let msgSenderName,
            msgSenderEmail,
            msgSubject,
            msgBodyText,
            msgBodyHtml,
            msgPayload;

        if (msgResults.data.payload) {
            msgPayload = msgResults.data.payload;
            [
                msgSenderName,
                msgSenderEmail,
                msgSubject,
                msgBodyText,
                msgBodyHtml,
            ] = extractDataFromPayload(msgPayload);
        } else {
            msgSenderName =
                msgSenderEmail =
                msgSubject =
                msgBodyText =
                msgBodyHtml =
                null;
        }

        const msgDict = createDictOfMsg(
            userId, // userId
            message.id, // gMsgId
            message.threadId, // gMsgThreadId
            gUserId, // gUserId for local
            convertTimestamp(msgResults.data.internalDate), // receivedAt
            msgSenderName, // senderName
            msgSenderEmail, // senderEmail
            msgSubject, // subject
            msgResults.data.snippet, // bodySnippet
            msgBodyText, // bodyText
            msgBodyHtml, // bodyHtml
            JSON.stringify(msgPayload) // payload
        );
        //console.log('Message:', msgDict);

        msgs_lst.push(msgDict);
      }

      if (error_msgs.length > 0) {
        console.error("Errors processing messages:");
        for (let i = 0; i < error_msgs.length; i++) {
            console.error(`Error ${i+1}: `, error_msgs[i]);
        }
      }

      console.log("\n");
      console.log("Processed messages: ", msgs_lst.length);
      return msgs_lst;
    }

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
        console.log(`Retrieving last stored message from Supabase...`);
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

    // Function to filter unsaved messages
    function filterUnsavedMessages(messages, lastStoredGMsgId) {
      // Filter messages to include only those that arrived before the lastStoredGMsgId
      const unsavedMessages = messages.filter((message) => {
        // Compare message ID with lastStoredGMsgId
        // Assuming message IDs are sorted by arrival time
        return message.id < lastStoredGMsgId;
      });

      return unsavedMessages;
    }

    /////////////////////////////////////////////////////////////

    //const userId = steps.trigger.event.query.user; // For running on pipedream
    const userId = "de14618c-da53-4cb4-b222-4ae3292c8345"; // For testing locally
    
    console.log(`Retrieving message details...`);

    // Establish Gmail connection
    var gmail = await connect_to_gmail_client(userId);

    // Retrieve the last stored message ID
    const lastStoredGMsgId = await getLastStoredGMsgId(gmail.gUserId);
    console.log(`Last stored message ID: ${lastStoredGMsgId}`);

    // Filter unsaved messages
    const unsavedMessage = filterUnsavedMessages(messages, lastStoredGMsgId);
    console.log(`Unsaved message IDs: ${unsavedMessage.length}`);

    // Process messages
    var processedMessages = await processMessages(gmail.client, unsavedMessage, userId, gmail.gUserId);

    // Export the processed messages
    console.log(`Exporting results...`);
    this.processed_messages = processedMessages; // Export the processed messages

    console.log(
      `Retrieved message details for ${processedMessages.length} messages.`
    );
    console.log("\n");

    return `Retrieved Message Details: ${processedMessages.length}`;
  },
};
