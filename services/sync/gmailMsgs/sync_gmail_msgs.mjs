// sync_gmail_messages.mjs

import get_recent_gmail_msgs from "./get_recent_gmail_msgs.mjs";
import retrieve_gmail_msgs from "./retrieve_gmail_msgs.mjs";
import retrieve_msg_details from "./retrieve_msg_details.mjs";
import store_gmail_msgs from "./store_gmail_msgs.mjs";
import store_sender_addresses from "./store_sender_addresses.mjs";

import { connectToGmailClient } from "../../../lib/establish_clients.mjs";
import { getLastStoredGMsgId, getLastGHistoryId } from "../../../lib/supabase_queries.mjs";

export default {
  async run(emailAccountId) {

    console.log("Sync service started...");
    console.log("\n");

    //////////////////////////////////////

    var msgsStored, addressesStored = 0;

    try {
      const gmail = await connectToGmailClient(emailAccountId);
      const lastStoredMsgId = await getLastStoredGMsgId(gmail.gUserId);
      const lastHistoryId = await getLastGHistoryId(gmail.gUserId);

      var messages = null;

      // Retrieve the messages list
      if (lastStoredMsgId !== null && lastHistoryId !== null) {
        console.log("Retrieving recent Gmail messages...");
        await get_recent_gmail_msgs.run({ emailAccountId: emailAccountId, messages: [], gHistoryId: lastHistoryId });
        messages = get_recent_gmail_msgs.messages;
      } else {
        console.log("First time running. Retrieving all Gmail messages from last 90 days...");
        await retrieve_gmail_msgs.run({ emailAccountId: emailAccountId, messages: [] });
        messages = retrieve_gmail_msgs.messages;
        console.log("Messages retrieved: ", messages.length);
      }

      // Check if there are no messages
      if (!messages || messages.length === 0) {
        console.log("No new messages found.");
      } else {
        // Retrieve the messages with details
        await retrieve_msg_details.run({
          messages: messages,
          processed_messages: null,
          gUserId: null,
          gHistoryId: null,
        });
        var messages_with_details = retrieve_msg_details.processed_messages;

        if (!messages_with_details || messages_with_details.length === 0) {
          throw new Error("No messages with details found.");
        }

        // Store the messages
        await store_gmail_msgs.run({
          messages: messages_with_details,
          gUserId: retrieve_msg_details.gUserId,
          gHistoryId: retrieve_msg_details.gHistoryId,
          msgs_stored: 0,
        });
        msgsStored = store_gmail_msgs.msgs_stored;

        if (msgsStored.length === 0 || !msgsStored) {
          throw new Error("No messages stored.");
        } else {

          // Store the sender addresses
          const result = await store_sender_addresses.run({
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

    console.log("Sync service finished.");
    console.log("\n");

    return { synced: true, msgsStored: msgsStored, addressesStored: addressesStored };
  },
};