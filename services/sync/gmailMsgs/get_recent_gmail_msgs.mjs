// get_recent_gmail_msgs.mjs:

// Import necessary modules
import { connectToGmailClient } from "../../../lib/establish_clients.mjs";
import { getLastStoredGMsgId, getLastGHistoryId, updateLastGHistoryId } from "../../../lib/supabase_queries.mjs";


export default {
  async run({ emailAccountId, messages, gHistoryId }) {

    // FUNCTION: Reformat initial messages list
    function reformatMessages(msgsObject) {
      return msgsObject.map(item => {
        return {
          id: item.message.id,
          threadId: item.message.threadId
        };
      });
    }


    //////////////////////////////////////////

    console.log("Retrieving recent Gmail messages...");

    // Establish Gmail connection
    const gmail = await connectToGmailClient(emailAccountId);
    const lastStoredMsgId = await getLastStoredGMsgId(gmail.gUserId);

    // Retrieve new messages
    const lastHistoryId = await getLastGHistoryId(gmail.gUserId);
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
        recentMsgs.push(...added_messages);
      }

      // Update the latest history ID
      if (record.id && (!latestHistoryId || record.id > latestHistoryId)) {
        latestHistoryId = record.id
      }
    }

    // Reformat the messages list
    const formattedMsgs = reformatMessages(recentMsgs);


    if (formattedMsgs.length == 0) {
      return "No new messages found.";
    } else {
      console.log(`Found ${formattedMsgs.length} new messages.`);
    }


    // Export messages
    console.log(`Exporting results...`);
  
    this.messages = formattedMsgs; // Export the messages list for use in subsequent steps
    this.gHistoryId = latestHistoryId; // Export the latest history ID

    console.log(`Retrieved ${formattedMsgs.length} messages.`);
    console.log("\n");

    return `Retrieved Gmail Messages: ${formattedMsgs.length}`;

  },
};