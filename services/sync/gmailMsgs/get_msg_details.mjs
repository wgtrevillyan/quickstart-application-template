// retrieve_msg_details.mjs

import { connectToGmailClient } from "../../../lib/establish_clients.mjs";

export default {
  async run({ emailAccountId, messages, processed_messages, gUserId, gHistoryId }) {

    // FUNCTION: Process messages
    async function processMessages(gmailClient, messages, emailAccountId, gUserId) {
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
        emailAccountId,
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
          emailAccountId,
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

      var msgs_lst = [];
      var msgHistoryId = null;

      // Process each message
      for (let i = 0; i < messages.length; i++) {
        // For testing
        /*
                if (i === 1) {
                    break;
                }
                */
        if (i % 10 === 0) {console.log(`Parsing message details for message ${i + 1} of ${messages.length}...\r`);} 

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
                userId: 'me',
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
            emailAccountId, // emailAccountId
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
        
        // Update the last stored history ID
        if (msgHistoryId === null || msgResults.data.historyId > msgHistoryId) {
          msgHistoryId = msgResults.data.historyId;
          console.log("New historyId: ", msgHistoryId);
        }

        msgs_lst.push(msgDict);
      }
  
      // Print errors
      if (error_msgs.length > 0) {
        console.error("Errors processing messages:");
        for (let i = 0; i < error_msgs.length; i++) {
            console.error(`Error ${i+1}: `, error_msgs[i]);
        }
      }
      return { messages: msgs_lst, historyId: msgHistoryId };
    }


    /////////////////////////////////////////////////////////////
    
    console.log(`Retrieving message details...`);

    // Establish Gmail connection
    var gmail = await connectToGmailClient(emailAccountId);

    // Process messages
    var result = await processMessages(gmail.client, messages, emailAccountId, gmail.gUserId);

    // Export the processed messages
    this.processed_messages = result.messages; // Export the processed messages
    this.gUserId = gmail.gUserId; // Export the Gmail user ID
    this.gHistoryId = result.historyId; // Export the history ID

    console.log(
      `Retrieved message details for ${result.messages.length} messages.`
    );
    console.log("\n");

    return true;
  },
};
