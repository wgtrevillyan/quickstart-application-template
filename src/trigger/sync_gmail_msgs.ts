// src/trigger/sync_gmail_msgs.ts

import { logger, schedules } from "@trigger.dev/sdk/v3";
import syncGmailMsgs from '../../services/sync/gmailMsgs/sync_gmail_msgs.mjs';

/**
 * Sync Gmail Messages Task
 * 
 * This task is responsible for syncing Gmail messages.
 */
export const sync_gmail_msgs = schedules.task({
  id: "syng-gmail-msgs",
  run: async (payload) => {
    let result;
    try {
      // Validate payload
      if (!payload.externalId) {
        throw new Error("External ID (userId) is required.");
      }

      const userId = payload.externalId;

      // Log sync service details
      logger.log("Starting sync service...");
      logger.log(`  Schedule ID: ${payload.scheduleId}`);
      logger.log(`  Schedule At: ${payload.timestamp}`);
      logger.log(`  Last run occured at: ${payload.lastTimestamp}`);
      logger.log(`  External ID (userId): ${userId}`);

      // Run sync_gmail_msgs function
      result = await syncGmailMsgs.run(userId);

      // Handle sync result
      if (result.error) {
        throw new Error(`Unexpected error occurred while syncing messages: \n${result.error}`);
      } else if (!result.synced) {
        throw new Error("Failed to sync messages");
      } else {
        logger.log(`Sync service completed. Messages stored: ${result.msgsStored}, Addresses stored: ${result.addressesStored}`);

        // Return successful response
        return new Response(JSON.stringify({
          message: "Sync service successful",
          data: {
            msgsStored: result.msgsStored || 0,
            addressesStored: result.addressesStored || 0,
          },
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      // Log error
      logger.error("An error occurred when attempting to start the synce service:");
      logger.error((error as Error).message || 'An unknown error occurred');

      // Return error response
      return new Response(JSON.stringify({
        message: "Sync service failed",
        error: (error as Error).message || 'An unknown error occurred',
        data: {
          msgsStored: result?.msgsStored || 0,
          addressesStored: result?.addressesStored || 0,
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
