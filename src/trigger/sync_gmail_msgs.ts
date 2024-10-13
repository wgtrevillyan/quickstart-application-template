// src/trigger/sync_gmail_msgs.ts

import { logger, schedules } from "@trigger.dev/sdk/v3";
import syncGmailMsgs from '../../services/sync/gmailMsgs/sync_gmail_msgs.mjs';
import { getEmailAccountIds } from "@/lib/supabase_queries.mjs";

/**
 * Sync Gmail Messages Task
 * 
 * This task is responsible for syncing Gmail messages.
 */
export const sync_gmail_msgs = schedules.task({
  id: "syng-gmail-msgs",
  machine: {
    preset: "small-2x",
  },
  run: async (payload) => {
    let result;
    try {
      // Validate payload
      if (!payload.externalId) {
        return new Response(JSON.stringify({ success: false, error: "External ID (userId) is required." }), { status: 400 });
      }

      const userId = payload.externalId;

      // Log sync service details
      logger.log("Starting sync service...");
      logger.log(`  Schedule ID: ${payload.scheduleId}`);
      logger.log(`  Schedule At: ${payload.timestamp}`);
      logger.log(`  Last run occured at: ${payload.lastTimestamp}`);
      logger.log(`  External ID (userId): ${userId}`);

      // Get user's email account ids
      const emailAccounts = await getEmailAccountIds(userId);
      if (!emailAccounts) {
          throw new Error('No email account ids retrieved.');
      }

      // loop through all email accounts for user
      for (let i = 0; i < emailAccounts.length; i++) {
        console.log(emailAccounts[i].id);
        // Run sync_gmail_msgs function
        result = await syncGmailMsgs.run(emailAccounts[i].id);

        // Handle sync result
        if (result.error) {
          throw new Error(`Unexpected error occurred while syncing messages: \n${result.error}`);
        } else if (!result.synced) {
          throw new Error("Failed to sync messages");
        } else {
          logger.log(`Sync service completed for emailAccount ${emailAccounts[i]}. Messages stored: ${result.msgsStored}, Addresses stored: ${result.addressesStored}`);
        }
      }
    } catch (error) {
      // Log error
      logger.error("An error occurred when attempting to start the synce service:");
      logger.error((error as Error).message || 'An unknown error occurred');

      // Return error response
      return new Response(JSON.stringify({
        
        success: false,
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

    // Return successful response
    return new Response(JSON.stringify({
      success: true,
      message: "Sync service successful",
      data: {
        msgsStored: result?.msgsStored || 0,
        addressesStored: result?.addressesStored || 0,
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  },
});
