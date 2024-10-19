// src/trigger/sync_letter_issues.ts

import { logger, task } from "@trigger.dev/sdk/v3";
import syncLetterIssues from '../../services/sync/letterIssues/sync_letter_issues.mjs';


export const sync_letter_issues = task({
  id: "sync-letter-issues",
  run: async (payload: { userId: string }) => {
    //logger.log("\n"); // Log a new line
    //logger.log(request.method, ' ', request.url, ' at time: ', new Date().toISOString()); // Log the request
    let result;
    try {
        if (!payload.userId) {
            throw new Error("External ID (userId) is required.");
        } else {
            logger.log("Starting sync service...");
            logger.log(`User ID: ${payload.userId}`);
    
            const userId = payload.userId; // The user ID
    
            // Run the sync_gmail_msgs function
            result = await syncLetterIssues.run(userId); // pass the externalId in as the userId


            if (result.error) {
                throw new Error(`Unexpected error occurred while syncing issues: \n${result.error}`);
            } else if (!result.synced) {
                throw new Error("Failed to sync issues, returning false.");
            } else {
        
                logger.log(`Sync service completed. Issues synced: ${result.issuesSynced}.`);
            
                // Return successful response
                return new Response(JSON.stringify({
                    success: true,
                    message: "Sync service successful",
                    data: {
                        issuesSynced: result.issuesSynced || 0,
                    },
                }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            }
        }
    } catch (error) {
        logger.log("An error occurred when attempting to start the synce service:"); // Log the message
        logger.error((error as Error).message || 'An unknown error occurred'); // Log the error

        // return error response
        return new Response(JSON.stringify({
            success: false,
            message: "Sync service failed",
            error: (error as Error).message || 'An unknown error occurred',
            data: {
              issuesSynced: result?.issuesSynced || 0,
            },
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          });
    }
  },
});