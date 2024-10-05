// src/trigger/sync_letter_issues.ts

import { logger, schedules } from "@trigger.dev/sdk/v3";
import syncLetterIssues from '../../services/sync/letterIssues/sync_letter_issues.mjs';


export const sync_letter_issues = schedules.task({
  id: "syng-letter-issues",
  run: async (payload) => {
    //logger.log("\n"); // Log a new line
    //logger.log(request.method, ' ', request.url, ' at time: ', new Date().toISOString()); // Log the request

    try {
        if (!payload.externalId) {
            throw new Error("External ID (userId) is required.");
        } else {
            logger.log("Starting sync service...");
            logger.log(`  Schedule ID: ${payload.scheduleId}`);
            logger.log(`  Schedule At: ${payload.timestamp}`);
            logger.log(`  Last run occured at: ${payload.lastTimestamp}`);
            logger.log(`  External ID (userId): ${payload.externalId}`);
    
            const userId = payload.externalId; // The user ID
    
            // Run the sync_gmail_msgs function
            await syncLetterIssues.run(userId); // pass the externalId in as the userId
        
            logger.log("Sync service completed."); // Log the message
        
            return new Response("Sync service triggered.", { status: 200 }); // Return a response
        }
    } catch (error) {
        logger.log("An error occurred when attempting to start the synce service:"); // Log the message
        logger.error; // Log the error
        return new Response("Error: " + error, { status: 500 }); // Return a response
    }
  },
});