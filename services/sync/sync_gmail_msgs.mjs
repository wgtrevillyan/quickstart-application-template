// sync_gmail_messages.mjs

import get_recent_gmail_msgs from "./get_recent_gmail_msgs.mjs";
import retrieve_gmail_msgs from "./retrieve_gmail_msgs.mjs";
import retrieve_msg_details from "./retrieve_msg_details.mjs";
import store_gmail_msgs from "./store_gmail_msgs.mjs";


import { connectToGmailClient } from "../../lib/establish_clients.mjs";
import { getLastStoredGMsgId, getLastGHistoryId } from "../../lib/supabase_queries.mjs";


export default {
  async run(userId) {

    console.log("Sync service started...");
    console.log("\n");

    // check if first time running, if so, get all messages
    //const userId = "de14618c-da53-4cb4-b222-4ae3292c8345"; // For testing locally
    const gmail = await connectToGmailClient(userId);
    const lastStoredMsgId = await getLastStoredGMsgId(gmail.gUserId);
    const lastHistoryId = await getLastGHistoryId(gmail.gUserId);

    var messages = null;

    // Retrieve the messages list
    if (lastStoredMsgId !== null && lastHistoryId !== null) {
      console.log("Retrieving recent Gmail messages...");
      await get_recent_gmail_msgs.run({ messages: [], gHistoryId: lastHistoryId });
      messages = get_recent_gmail_msgs.messages;
    } else {
      console.log("First time running. Retrieving all Gmail messages from last 90 days...");
      await retrieve_gmail_msgs.run({ messages: [] });
      messages = retrieve_gmail_msgs.messages;
      console.log("Messages retrieved: ", messages.length);
    }

    // Check if there are no messages
    if (!messages || messages.length === 0) {
      console.log("No new messages found. Ending sync...");
      console.log("Sync service finished.");
      console.log("\n");
      return false;
    }
    

    // Retrieve the messages with details
    await retrieve_msg_details.run({
      messages: messages,
      processed_messages: null,
      gUserId: null,
      gHistoryId: null,
    });
    var messages_with_details = retrieve_msg_details.processed_messages;
    console.log("Messages with details retrieved: ", messages_with_details.length);

    // Store the messages
    await store_gmail_msgs.run({
      messages: messages_with_details,
      gUserId: retrieve_msg_details.gUserId,
      gHistoryId: retrieve_msg_details.gHistoryId,
      msgs_stored: 0,
    });
    var msgs_stored = store_gmail_msgs.msgs_stored;
    console.log("Messages stored: ", msgs_stored.length);

    console.log("Sync service finished.");
    console.log("\n");

    return true;
  },
};