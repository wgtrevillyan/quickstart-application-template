import { logger, task } from "@trigger.dev/sdk/v3";
import syncGmailMsgs from '../../services/sync/sync_gmail_msgs.mjs';


export const sync_gmail_msgs = task({
  id: "syng_gmail_msgs",
  run: async () => {
    //logger.log("\n"); // Log a new line
    //logger.log(request.method, ' ', request.url, ' at time: ', new Date().toISOString()); // Log the request
  
    try {
      logger.log("Starting sync service..."); // Log the message
  
      // Run the sync_gmail_msgs function
      await syncGmailMsgs.run();
  
      logger.log("Sync service completed."); // Log the message
  
      return new Response("Sync service triggered."); // Return a response
    } catch (error) {
      logger.log("An error occurred when attempting to start the synce service:"); // Log the message
      console.error(error); // Log the error
      return new Response("Error: " + error, { status: 500 }); // Return a response
    }
  },
});