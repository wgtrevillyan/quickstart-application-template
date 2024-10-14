// sync_gmail_messages.mjs

import getRecentGmailMsgs from "./get_recent_gmail_msgs.mjs";
import getGmailMsgs from "./get_gmail_msgs.mjs";
import getMsgDetails from "./get_msg_details.mjs";
import store_gmail_msgs from "./store_gmail_msgs.mjs";
import store_sender_addresses from "./store_sender_addresses.mjs";

import measureMemoryUsage from "../../../lib/measure_memory_usage.mjs";

import { connectToGmailClient } from "../../../lib/establish_clients.mjs";
import { getLastStoredGMsgId, getLastGHistoryId } from "../../../lib/supabase_queries.mjs";

export default {
  async run(authId, emailAccountId) {

    console.log("Sync service started...");
    console.log("\n");

    //////////////////////////////////////

    var msgsStored, addressesStored = 0;

    try {
      const gmail = await connectToGmailClient(emailAccountId);
      const lastStoredMsgId = await getLastStoredGMsgId(emailAccountId);
      const lastHistoryId = await getLastGHistoryId(emailAccountId);

      var messages = null;

      // Retrieve the messages list
      if (lastStoredMsgId !== null && lastHistoryId !== null) {
        console.log("Retrieving recent Gmail messages...");
        await getRecentGmailMsgs.run({ emailAccountId: emailAccountId, messages: [], gHistoryId: lastHistoryId });
        messages = getRecentGmailMsgs.messages;
      } else {
        console.log("First time running. Retrieving all Gmail messages from last 90 days...");
        await getGmailMsgs.run({ emailAccountId: emailAccountId, messages: [] });
        messages = getGmailMsgs.messages;
        console.log("Messages retrieved: ", messages.length);
      }

      // Check if there are no messages
      if (!messages || messages.length === 0) {
        console.log("No new messages found.");
      } else {
        // Retrieve the messages with details
        await getMsgDetails.run({
          emailAccountId: emailAccountId,
          messages: messages,
          processed_messages: null,
          gUserId: null,
          gHistoryId: null,
        });
        var messages_with_details = getMsgDetails.processed_messages;
        var newhistoryId = getMsgDetails.gHistoryId;
        //var updatedHistoryId = false;

        if (!messages_with_details || messages_with_details.length === 0) {
          /*
          updatedHistoryId = updateLastGHistoryId(gmail.gUserId, newhistoryId);
          if (updatedHistoryId.status === false) {
            throw new Error("Error occurred while updating the history ID.");
          }
          */
          throw new Error("No messages with details found.");
        }

        // Store the messages
        await store_gmail_msgs.run({
          messages: messages_with_details,
          emailAccountId: emailAccountId,
          gHistoryId: newhistoryId,
          msgs_stored: 0,
        });
        msgsStored = store_gmail_msgs.msgs_stored;

        if (msgsStored.length === 0 || !msgsStored) {
          throw new Error("No messages stored.");
        } else {
          
          /*
          // Update the last history ID
          updatedHistoryId = updateLastGHistoryId(gmail.gUserId, newhistoryId);
          if (updatedHistoryId.status === false) {
            throw new Error("Error occurred while updating the history ID.");
          }
          */

          // Store the sender addresses
          const result = await store_sender_addresses.run({
            authId: authId,
            emailAccountId: emailAccountId,
            messages: store_gmail_msgs.stored_msgs,
          });
          addressesStored = result.addresses_stored;

          if (result.status === false) {
            throw new Error("Error occurred while storing sender addresses.");  
          }
        }
      }
    } catch (error) {
      console.error("Unexpected error occured: ", error);
      return { synced: false, error: error, msgsStored: msgsStored, addressesStored: addressesStored };
    }

    //////////////////////////////////////

    await measureMemoryUsage.run();

    console.log("Sync service finished.");
    console.log("\n");

    return { synced: true, msgsStored: msgsStored, addressesStored: addressesStored };
  },
};