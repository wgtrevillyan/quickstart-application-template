// get_recent_gmail_msgs.mjs:

// Import necessary modules
import { connectToGmailClient } from "../../lib/establish_clients.mjs";
import { getLastStoredGMsgId, getLastGHistoryId, updateLastGHistoryId } from "../../lib/supabase_queries.mjs";


export default {
  async run({ messages, gHistoryId }) {

    //const userId = steps.trigger.event.query.user; // For running on pipedream
    const userId = "de14618c-da53-4cb4-b222-4ae3292c8345"; // For testing locally

    console.log("Retrieving recent Gmail messages...");

    // Establish Gmail connection
    const gmail = await connectToGmailClient(userId);
    const lastStoredMsgId = await getLastStoredGMsgId(gmail.gUserId);

    // Retrieve new messages
    const lastHistoryId = await getLastGHistoryId(gmail.gUserId);
    console.log("Last History ID:", lastHistoryId);
    try {
        const response = await gmail.client.users.history.list({
            userId: 'me',
            startHistoryId: lastHistoryId,
        });
  
        var history = response.data.history || [];
    } catch (error) {
        console.error("Error retrieving history:", error.message);
        throw error;
    }
  
    var recentMsgs = [];
    var latestHistoryId = null;

    // Process the history
    for (const record of history) {
      if (record.messagesAdded) {
        const added_messages = record.messagesAdded;
        console.log('Added Messages:', added_messages);

        recentMsgs.push(...added_messages);
      }

      // Update the latest history ID
      if (record.id && (!latestHistoryId || record.id > latestHistoryId)) {
        latestHistoryId = record.id
      }
    }
  
    // Process newMessages as needed
    console.log("History:", history);

    console.log(`Found ${recentMsgs.length} new messages.`);
    console.log('New Messages:', recentMsgs);

    // Retrieve messages list
    //var messages_lst = //await getRecentMsgsLst(gmail.client, gmail.gUserId);
    //console.log("Messages: ", messages);

    // Export messages
    console.log(`Exporting results...`);
  
    this.messages = recentMsgs; // Export the messages list for use in subsequent steps
    this.gHistoryId = latestHistoryId; // Export the latest history ID

    console.log(`Retrieved ${recentMsgs.length} messages.`);
    console.log("\n");

    return messages;

  },
};