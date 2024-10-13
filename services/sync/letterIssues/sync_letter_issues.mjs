// sync_letter_issues.mjs

import { connectToSupabaseClient } from "../../../lib/establish_clients.mjs";
import { getEmailAccountIds } from "../../../lib/supabase_queries.mjs";
import { getAuthId } from "../../../lib/supabase_queries.mjs";

const getApprovedSenderAddresses = async (supabaseClient, emailAccountId) => {
  try {
    const { data, error } = await supabaseClient
      .from('senderAddresses')
      .select('senderAddress')
      .eq('emailAccountId', emailAccountId)
      .eq('status', 'approved');

    if (error) {
      throw new Error(error.message);
    } else if (data === null) {
      throw new Error('Approved sender addresses not retrieved. Returned data is null.');
    } else {
      return data;
    }
  } catch (err) {
    console.error('Retrieval of approved sender addresses failed. Unexpected error:', err);
    return null;
  }
};

const getGmailMessageIds = async (supabaseClient, senderAddresses) => {
  try {
    const { data, error } = await supabaseClient
      .from('gmailMessages')
      .select('id')
      .eq('syncedToIssues', false)
      .in('senderEmail', senderAddresses);

    if (error) {
      throw new Error(error.message);
    } else if (data === null) {
      throw new Error('Gmail message ids not retrieved. Returned data is null.');
    } else {
      return data;
    }
  } catch (err) {
    console.error('Retrieval of gmail message ids failed. Unexpected error:', err);
    return null;
  }
};

const getMessageDetails = async (supabaseClient, gmailMessageId) => {
  try {
    const { data, error } = await supabaseClient
      .from('gmailMessages')
      .select('senderName, senderEmail, subject, bodySnippet, bodyText, bodyHtml, receivedAt')
      .eq('id', gmailMessageId);

    if (error) {
      throw new Error(error.message);
    } else if (data === null) {
      throw new Error('Message details not retrieved. Returned data is null.');
    } else {
      return data[0];
    }
  } catch (err) {
    console.error('Retrieval of message details failed. Unexpected error:', err);
    return null;
  }
};

const storeMessageDetails = async (supabaseClient, authId, emailAccountId, gmailMessageId, messageDetails) => {
  try {
    const { status, data, error, statusText } = await supabaseClient
      .from('letterIssues')
      .insert({
        authId: authId,
        gmailMessagesId: gmailMessageId,
        emailAccountId: emailAccountId,
        senderName: messageDetails.senderName,
        senderEmail: messageDetails.senderEmail,
        subject: messageDetails.subject,
        bodySnippet: messageDetails.bodySnippet,
        bodyText: messageDetails.bodyText,
        bodyHtml: messageDetails.bodyHtml,
        receivedAt: messageDetails.receivedAt
      });

    if (error) {
      throw new Error(error.message);
    } else if (status !== 201) {
      throw new Error(`Message details not stored. Unexpected error: ${status} ${statusText}`);
    } else {
      return true;
    }
  } catch (err) {
    return false;
  }
};

const markMsgAsSynced = async (supabaseClient, emailAccountId, gmailMessageId) => {
  try {
    const { data, status, statusText, error } = await supabaseClient
      .from('gmailMessages')
      .update({ syncedToIssues: true})
      .eq('id', gmailMessageId);

    if (error) {
      throw new Error(`Unexpected error occured when marking gmail message as synced: ${status} ${statusText} - ${error.message}`);
    } else {
      return true;
    }

  } catch (e) {
    console.error('Unexpected error occured while marking gmail message as synced', e.message);
    return false;
  }
};

export default {
  async run(userId) {
    console.log("Sync service started...");
    console.log("\n");

    try {

        // Connect to the Supabase client
        const supabaseClient = await connectToSupabaseClient();

        const authId = await getAuthId(userId);
        if (!authId) {
            throw new Error('Auth user id not retrieved.');
        }

        // Get email account IDs
        const emailAccounts = await getEmailAccountIds(userId);
        console.log(`Email account IDs retrieved: ${emailAccounts[0].id}`);

        // Get email account IDs
        var issuesSynced = 0;
        let issueSyncErrors = 0;
        var noApprovedErrors = 0;
        for (let i = 0; i < emailAccounts.length; i++) {

          console.log(`Syncing email account: ${emailAccounts[i].id}`);

          // Retrieve the approved sender addresses
          const unformattedSenderAddresses = await getApprovedSenderAddresses(supabaseClient, emailAccounts[i].id);
          const senderAddresses = unformattedSenderAddresses.map(address => address.senderAddress);
          if (!senderAddresses || senderAddresses.length === 0) {
              console.error(`No approved sender addresses retrieved for email account: ${emailAccounts[i].id}`);
              noApprovedErrors++;
              continue;
          } else {
              console.log(`Approved sender addresses retrieved: ${senderAddresses.length}`);
          }

          // Retrieve the gmail message ids
          const unformattedGmailMessageIds = await getGmailMessageIds(supabaseClient, senderAddresses);
          const gmailMessageIds = unformattedGmailMessageIds.map(msg => msg.id);
          if (!gmailMessageIds || gmailMessageIds.length === 0) {
              console.error(`Gmail message ids not retrieved for email account: ${emailAccounts[i].id}`);
              continue;
          } else {
            console.log(`Gmail message ids retrieved: ${gmailMessageIds.length}`);
          }

          // Sync the messages
          for (let j = 0; j < gmailMessageIds.length; j++) {
            
              if (j % 10 === 0) {console.log(`Syncing msg ${j} of ${gmailMessageIds.length}...\r`);}

              // Retrieve the message details
              const messageDetails = await getMessageDetails(supabaseClient, gmailMessageIds[j]);
              if (!messageDetails || messageDetails.length === 0) {
                  issueSyncErrors++;
                  continue;
              }

              // Store the message details
              const stored = await storeMessageDetails(supabaseClient, authId, emailAccounts[i].id, gmailMessageIds[j], messageDetails);
              if (!stored) {
                  issueSyncErrors++;
              } else {
                  // Mark the message as synced
                  const msgMarked = await markMsgAsSynced(supabaseClient, emailAccounts[i].id, gmailMessageIds[j]);
                  if (!msgMarked) {
                    issueSyncErrors++;
                  } else {
                    issuesSynced++;
                  }
              }
          }
        }


        if (noApprovedErrors > 0) {
            throw new Error(`Failed to sync ${noApprovedErrors} email accounts with no approved sender addresses.`);
        } else if (issueSyncErrors > 0) {
            throw new Error(`Failed to sync ${issueSyncErrors} gmail messages.`);
        } else if (issuesSynced === 0) {
            console.log('No issues were synced.');
        } else {
            console.log(`Synced ${issuesSynced} issues. `);
        }

    } catch (e) {
        console.error('Error: ', e.message);
        return { synced: false, issuesSynced: issuesSynced, error: e.message };
    }

    console.log("Sync service finished.");
    console.log("\n");

    return { synced: true, issuesSynced: issuesSynced };
  },
};
