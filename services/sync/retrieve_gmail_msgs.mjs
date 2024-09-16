// retrieve_gmail_msgs.mjs

// Import necessary modules
import { count } from "console";
import { connectToGmailClient } from "../../lib/establish_clients.mjs";
import { connectToSupabaseClient } from "../../lib/establish_clients.mjs";
import { getLastStoredGMsgId, updateLastGHistoryId } from "../../lib/supabase_queries.mjs";
import { isGmailMsgStored } from "../../lib/supabase_queries.mjs";


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

    // FUNCTION: Filter messages list by non-stored gMsgIds
    async function filterMsgsListByMsgId(messages_lst, gUserId) {

      const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client
      
      console.log("Filtering messages list by non-stored gMsgIds...");

      var filteredMsgsLst = [];
      var total = 0;
      for (let i = 0; i < messages_lst.length; i++) {
        let gMsgId = messages_lst[i].id;
        let stored = await isGmailMsgStored(supabaseClient, gUserId, gMsgId);
        if (!stored) {
          total++;
          filteredMsgsLst.push(messages_lst[i]);
          console.log(`${total} of ${messages_lst.length} messages added to queue.`, '\r');
        }
      }
      return filteredMsgsLst;
    }


    /////////////////////////////////////////////////////////////


    //const userId = steps.trigger.event.query.user; // For running on pipedream
    const userId = "de14618c-da53-4cb4-b222-4ae3292c8345"; // For testing locally

    console.log("Retrieving Gmail messages...");

    // Establish Gmail connection
    var gmail = await connectToGmailClient(userId);

    // Retrieve messages list
    var messages_lst = await retrieveMsgsLst(gmail.client, gmail.gUserId);
    console.log(`Retrieved metadata for ${messages_lst.length} messages.`);
    //console.log("Messages: ", messages);

    // Filter messages list by non-stored gMsgIds 
    const filteredMsgsLst = await filterMsgsListByMsgId(messages_lst, gmail.gUserId);

    // Export messages
    console.log(`Exporting results...`);

    this.messages = filteredMsgsLst; // Export the messages list for use in subsequent steps

    console.log(`Retrieved ${filteredMsgsLst.length} messages.`);
    console.log("\n");

    return `Retrieved Gmail Messages: ${filteredMsgsLst.length}`;
  },
};
