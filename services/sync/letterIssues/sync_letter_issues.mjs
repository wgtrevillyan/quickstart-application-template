// sync_letter_issues.mjs

import { connectToSupabaseClient } from "../../../lib/establish_clients.mjs";
import { getEmailAccountIds } from "../../../lib/supabase_queries.mjs";
import { getAuthId } from "../../../lib/supabase_queries.mjs";

const supabaseClient = async () => await connectToSupabaseClient();

const getApprovedSenderAddresses = async (userId, emailAccountId) => {
  try {
    const { data, error } = await supabaseClient()
      .from('senderAddresses')
      .select('senderAddress')
      .eq('userId', userId)
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

const getGmailMessageIds = async (senderAddresses) => {
  try {
    const { data, error } = await supabaseClient()
      .from('gmailMessages')
      .select('id')
      .in('senderAddress', senderAddresses);

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

const getMessageDetails = async (gmailMessageId) => {
  try {
    const { data, error } = await supabaseClient()
      .from('gmailMessages')
      .select('senderName, senderEmail, subject, bodySnippet, bodyText, bodyHtml, receivedAt')
      .eq('id', gmailMessageId);

    if (error) {
      throw new Error(error.message);
    } else if (data === null) {
      throw new Error('Message details not retrieved. Returned data is null.');
    } else {
      return data;
    }
  } catch (err) {
    console.error('Retrieval of message details failed. Unexpected error:', err);
    return null;
  }
};

const storeMessageDetails = async (authId, emailAccountId, gmailMessageId, messageDetails) => {
  try {
    const { status, data, error, statusText } = await supabaseClient()
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
    } else if (status !== 200) {
      throw new Error(`Message details not stored. Unexpected error: ${status} ${statusText}`);
    } else {
      console.log("Message details stored successfully.");
      return true;
    }
  } catch (err) {
    console.error('Storing of message details failed. Unexpected error:', err);
    return false;
  }
};

export default {
  async run(userId) {
    console.log("Sync service started...");
    console.log("\n");

    const authId = await getAuthId(userId);
    if (!authId) {
      console.error('Auth id not retrieved.');
      return false;
    }

    const emailAccountIds = await getEmailAccountIds(userId);
    if (!emailAccountIds) {
      console.error('Email account ids not retrieved.');
      return false;
    }

    for (let i = 0; i < emailAccountIds.length; i++) {
      const senderAddresses = await getApprovedSenderAddresses(userId, emailAccountIds[i]);
      if (!senderAddresses) {
        console.error('Approved sender addresses not retrieved.');
        continue;
      }

      const gmailMessageIds = await getGmailMessageIds(senderAddresses);
      if (!gmailMessageIds) {
        console.error('Gmail message ids not retrieved.');
        continue;
      }

      for (let j = 0; j < gmailMessageIds.length; j++) {
        const messageDetails = await getMessageDetails(gmailMessageIds[j]);
        if (!messageDetails) {
          console.error('Message details not retrieved.');
          continue;
        }

        const stored = await storeMessageDetails(authId, emailAccountIds[i], gmailMessageIds[j], messageDetails);
        if (!stored) {
          console.error('Message details not stored.');
        }
      }
    }

    console.log("Sync service finished.");
    console.log("\n");

    return true;
  },
};
