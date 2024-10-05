// sync_letter_issues.mjs

import { connectToSupabaseClient } from "../../lib/establish_clients.mjs";

export default {
  async run(userId) {

    console.log("Sync service started...");
    console.log("\n");

    ////////////////////////////

    const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client

    // get authId from auth table
    console.log("Retrieving auth id...");
    var authId = null;
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('authId')
            .eq('id', userId);
        
        if (error) {
            throw new Error(error.message);
        } else if (data === null) {
            throw new Error('Auth id not retrieved. Returned data is null.');
        } else {
            authId = data;
            console.log("Auth id retrieved.");
            console.log(authId);
        }
    
    } catch (err) {
        console.error('Retrieval of auth id failed. Unexpected error:', err);
        return false;
    }



    // get list of email account ids from emailAccounts table
    console.log("Retrieving list of email account ids...");
    var emailAccountIds = [];
    try {
        const { data, error } = await supabaseClient
            .from('emailAccounts')
            .select('id')
            .eq('userId', userId);

        if (error) {
            throw new Error(error.message);
        } else if (data === null) {
            throw new Error('Email account ids not retrieved. Returned data is null.');
        } else {
            emailAccountIds = data;
            console.log("Email account ids retrieved.");
            console.log(emailAccountIds);
        }

    } catch (err) {
        console.error('Retrieval of email account ids failed. Unexpected error:', err);
        return false;
    }

    //loop through email account ids
    for (let i = 0; i < emailAccountIds.length; i++) {

        // get list of approved sender addresses
        var senderAddresses = [];
        console.log("Retrieving list of approved sender addresses...");
        try {
            const { data, error } = await supabaseClient
                .from('senderAddresses')
                .select('senderAddress')
                .eq('userId', userId)
                .eq('emailAccountId', emailAccountIds[i])
                .eq('status', 'approved');

            if (error) {
                throw new Error(error.message);
            } else if (data === null) {
                throw new Error('Approved sender addresses not retrieved. Returned data is null.');
            } else {
                senderAddresses = data;
                console.log("Approved sender addresses retrieved.");
                console.log(senderAddresses);
            }

        } catch (err) {
            console.error('Retrieval of approved sender addresses failed. Unexpected error:', err);
            return false;
        }

        // retrieve list of gmail msg ids tied to approved sender addresses
        var gmailMsgIds = [];
        console.log("Retrieving list of gmail message ids...");
        try {
            const { data, error } = await supabaseClient
                .from('gmailMessages')
                .select('id')
                .in('senderAddress', senderAddresses);

            if (error) {
                throw new Error(error.message);
            } else if (data === null) {
                throw new Error('Gmail message ids not retrieved. Returned data is null.');
            } else {
                gmailMsgIds = data;
                console.log("Gmail message ids retrieved.");
                console.log(gmailMsgIds);
            }

        } catch (err) {
            console.error('Retrieval of gmail message ids failed. Unexpected error:', err);
            return false;
        }

        // for each gmail msg, retrieve the msg details from gmailMessages table and store in letterIssues table
        for (let j = 0; j < gmailMsgIds.length; j++) {

            // retrieve message details
            // Details: senderName, senderEmail, subject, bodySnippet, bodyText, bodyHtml, receivedAt
            var msgDetails = null;
            console.log("Retrieving message details...");
            try {
                const { data, error } = await supabaseClient
                    .from('gmailMessages')
                    .select('senderName, senderEmail, subject, bodySnippet, bodyText, bodyHtml, receivedAt')
                    .eq('id', gmailMsgIds[j]);

                if (error) {
                    throw new Error(error.message);
                } else if (data === null) {
                    throw new Error('Message details not retrieved. Returned data is null.');
                } else {
                    msgDetails = data;
                    console.log("Message details retrieved.");
                    console.log(msgDetails);
                }

            } catch (err) {
                console.error('Retrieval of message details failed. Unexpected error:', err);
                return false;
            }

            // store message details in letterIssues table
            // Details: authId, emailAccountId, gmailMessagesId, senderName, senderEmail, subject, bodySnippet, bodyText, bodyHtml, receivedAt
            console.log("Storing message details in letterIssues table...");
            try {
                const { status, data, error, statusText } = await supabaseClient
                    .from('letterIssues')
                    .insert({
                        authId: authId,
                        gmailMessagesId: gmailMsgIds[j],
                        emailAccountId: emailAccountIds[i],
                        senderName: msgDetails.senderName,
                        senderEmail: msgDetails.senderEmail,
                        subject: msgDetails.subject,
                        bodySnippet: msgDetails.bodySnippet,
                        bodyText: msgDetails.bodyText,
                        bodyHtml: msgDetails.bodyHtml,
                        receivedAt: msgDetails.receivedAt
                    });

                if (error) {
                    throw new Error(error.message);
                } else if (status !== 200) {
                    throw new Error(`Message details not stored. Unexpected error: ${status} ${statusText}`);
                } else {
                    console.log("Message details stored successfully.");
                }

            } catch (err) {
                console.error('Storing of message details failed. Unexpected error:', err);
                return false;
            }
        }
    }


    ////////////////////////////

    console.log("Sync service finished.");
    console.log("\n");

    return true;
  },
};


