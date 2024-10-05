// src/trigger/sync_gmail_msgs.ts

import { logger, schedules } from "@trigger.dev/sdk/v3";
import syncGmailMsgs from '../../services/sync/gmailMsgs/sync_gmail_msgs.mjs';


export const sync_gmail_msgs = schedules.task({
  id: "syng-gmail-msgs",
  run: async (payload) => {
    //logger.log("\n"); // Log a new line
    //logger.log(request.method, ' ', request.url, ' at time: ', new Date().toISOString()); // Log the request

    if (!payload.externalId) {
      throw new Error("External ID (userId) is required.");
    }
  
    try {

      logger.log("Starting sync service...");
      logger.log(`  Schedule ID: ${payload.scheduleId}`);
      logger.log(`  Schedule At: ${payload.timestamp}`);
      logger.log(`  Last run occured at: ${payload.lastTimestamp}`);
      logger.log(`  External ID (userId): ${payload.externalId}`);

      const userId = payload.externalId; // The user ID

      // Run the sync_gmail_msgs function
      await syncGmailMsgs.run(userId); // pass the externalId in as the userId
  
      logger.log("Sync service completed."); // Log the message
  
      return new Response("Sync service triggered."); // Return a response
    } catch (error) {
      logger.log("An error occurred when attempting to start the synce service:"); // Log the message
      logger.error; // Log the error
      return new Response("Error: " + error, { status: 500 }); // Return a response
    }
  },
});