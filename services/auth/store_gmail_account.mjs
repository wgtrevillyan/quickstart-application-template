// post_gmail_account.mjs

// Import necessary modules
import { connectToSupabaseClient } from "../../lib/establish_clients.mjs";

export default {
    async run({ userId: userId, gAccountInfo: gAccountInfo }) {

        try{
            const supabaseClient = await connectToSupabaseClient();

            console.log('Storing Gmail account info...');
            console.log('User ID:', userId);
            console.log('Gmail account info:', gAccountInfo);
            console.log('gAccountInfo.emailAddress:', gAccountInfo.emailAddress);

            // Check if Gmail account already exists
            const { data: emailAccounts, error: emailAccountsError } = await supabaseClient
                .from('emailAccounts')
                .select('id')
                .eq('userId', userId)
                .eq('emailAddress', gAccountInfo.emailAddress);

            if (emailAccountsError) {
                console.error('Error occured when checking if Gmail account already exists: ', emailAccountsError.message);
                throw new Error(emailAccountsError.message);
            } else if (emailAccounts.length > 0) {
                console.log('Gmail account already exists in Supabase... skipping insertion.');
                return emailAccounts[0].id;
            }

            const insertData = {
                userId: userId,
                emailClient: 'gmail',
                emailAddress: gAccountInfo.emailAddress,
                gmailUserId: gAccountInfo.emailAddress,
            }

            // Store Gmail account info in Supabase
            const { error } = await supabaseClient
                .from('emailAccounts')
                .insert(insertData);

            if (error) {
                console.error('Error occured when inserting account info into emailAccounts table: ', error.message);
                throw new Error(error.message);
            } else {
                return data[0].id;
            }

        } catch (error) {
            console.error("Error storing Gmail account:", error.message);
            throw error;
        }
    }
}