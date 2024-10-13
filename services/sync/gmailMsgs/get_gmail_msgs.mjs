// retrieve_gmail_msgs.mjs

// Import necessary modules
import { count } from "console";
import { connectToGmailClient } from "../../../lib/establish_clients.mjs";
import { connectToSupabaseClient } from "../../../lib/establish_clients.mjs";
import { getLastStoredGMsgId, updateLastGHistoryId } from "../../../lib/supabase_queries.mjs";
import { isGmailMsgStored } from "../../../lib/supabase_queries.mjs";


export default {
  async run({ emailAccountId, messages }) {

    // FUNCTION: Retrieve messages list
    async function retrieveMsgsLst(gmailClient, emailAccountId) {

      var lastStoredMsgId = await getLastStoredGMsgId(emailAccountId);

      var messages = [];
      let pageToken = null;
      const query = 'label:inbox newer_than:10d'; // 
      var response = null;
      var newMsgs = [];
      var i = 0;
    
      do {
        i++; // Increment the counter

        // Retrieve messages list
        try {
          console.log(`Call ${i}: Retrieving 500 gmail messages...`);
          response = await gmailClient.users.messages.list({
            userId: 'me',
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
    async function filterMsgsListByMsgId(messages_lst, emailAccountId) {

      try {
        const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client
        
        console.log("Filtering messages list by non-stored gMsgIds...");

        var filteredMsgsLst = [];
        var total = 0;
        for (let i = 0; i < messages_lst.length; i++) {
          if (i % 10 === 0) {console.log(`Checking if message ${i + 1} of ${messages_lst.length} is already stored...\r`);}
          
          let gMsgId = messages_lst[i].id;
          let stored = await isGmailMsgStored(supabaseClient, emailAccountId, gMsgId);
          if (!stored) {
            total++;
            filteredMsgsLst.push(messages_lst[i]);
          }
        }
        console.log(`${total} of ${messages_lst.length} messages added to queue.`);
        return filteredMsgsLst;
      } catch (error) {
        console.error('Error in filterMsgsListByMsgId:', error);
        throw error;
      }
    }


    /////////////////////////////////////////////////////////////

    try {
      console.log("Retrieving Gmail messages...");

      // Establish Gmail connection
      var gmail = await connectToGmailClient(emailAccountId);

      // Retrieve messages list
      var messages_lst = await retrieveMsgsLst(gmail.client, emailAccountId);
      console.log(`Retrieved metadata for ${messages_lst.length} messages.`);
      //console.log("Messages: ", messages);

      // Filter messages list by non-stored gMsgIds 
      const filteredMsgsLst = await filterMsgsListByMsgId(messages_lst, emailAccountId);
      console.log(`Retrieved ${filteredMsgsLst.length} messages.`);
      console.log("\n");

      this.messages = filteredMsgsLst; // Export the messages list for use in subsequent steps
      
      return true;
    } catch (error) {
      console.error('Error in get_gmail_msgs.mjs: ', error);
      throw error;
    }
    
  },
};
