// retrieve_gmail_msgs.mjs

// Import necessary modules
import { connectToGmailClient } from "../../lib/establish_clients.mjs";
import { getLastStoredGMsgId, updateLastGHistoryId } from "../../lib/supabase_queries.mjs";


export default {
  async run({ messages }) {

    // FUNCTION: Retrieve messages list
    async function retrieveMsgsLst(gmailClient, gUserId) {

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
    var gmail = await connectToGmailClient(userId);

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
