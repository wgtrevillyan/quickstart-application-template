// src/trigger/sync_gmail_msgs.ts

import { logger, task, tasks } from "@trigger.dev/sdk/v3";
import syncGmailMsgs from '../../src/backend/services/sync/gmailMsgs/sync_gmail_msgs.mjs';
import { getEmailAccountIds } from "@/src/backend/lib/supabase_queries.mjs";
import { getAuthId } from "@/src/backend/lib/supabase_queries.mjs";

/**
 * Sync Gmail Messages Task
 * 
 * This task is responsible for syncing Gmail messages.
 */
export const sync_gmail_msgs = task({
  id: "sync-gmail-msgs",
  machine: {
    preset: "small-2x",
  },
  run: async (payload: { userId: string, triggerSyncLetterIssues: boolean }) => {
    let result;
    try {
      // Validate payload
      if (!payload.userId) {
        return new Response(JSON.stringify({ success: false, error: "External ID (userId) is required." }), { status: 400 });
      }

      const userId = payload.userId;

      // Log sync service details
      logger.log("Starting sync service...");
      logger.log(`User ID: ${userId}`);

      // Get user's email account ids
      const emailAccounts = await getEmailAccountIds(userId);
      if (!emailAccounts) {
          throw new Error('No email account ids retrieved.');
      }

      const authId = await getAuthId(userId);
      if (!authId) {
        throw new Error('No auth user id retrieved.');
      }

      // loop through all email accounts for user
      for (let i = 0; i < emailAccounts.length; i++) {
        console.log('Email Account ID:', emailAccounts[i].id);
        // Run sync_gmail_msgs function
        result = await syncGmailMsgs.run(authId, emailAccounts[i].id);

        // Handle sync result
        if (result.error) {
          throw new Error(`Unexpected error occurred while syncing messages: \n${result.error}`);
        } else if (!result.synced) {
          throw new Error("Failed to sync messages");
        } else {
          logger.log(`Sync service completed for emailAccount ${emailAccounts[i].id}. Messages stored: ${result.msgsStored}, Addresses stored: ${result.addressesStored}`);
          
          if (payload.triggerSyncLetterIssues === true) {
            logger.log('Triggering Sync of Letter Issues...');
            const handle = await tasks.trigger("sync-letter-issues", {
              userId: userId
            });
            if (!handle.id) {
              logger.error('Error occured when triggering Sync of Letter Issues.');
            }
          }
          
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
