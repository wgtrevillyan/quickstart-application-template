// post_gmail_account.mjs

// Import necessary modules
import { connectToSupabaseClient } from "../../lib/establish_clients.mjs";

export default {
    async run({ userId: userId, gAccountInfo: gAccountInfo }) {

        try{
            const supabase = await connectToSupabaseClient();

            const insertData = {
                userId: userId,
                emailClient: 'gmail',
                emailAddress: gAccountInfo.email_address,
                gmailUserId: gAccountInfo.user_id,
                // Add other Gmail account info here
            }

            // Store Gmail account info in Supabase
            const { data, status, statusText, error } = await supabase
                .from('email_accounts')
                .insert(insertData);

            if (error) {
                throw new Error(error.message);
            } else if (status !== 200) {
                throw new Error(`${status} ${statusText}`);
            } else {
                return data.id;
            }

        } catch (error) {
            console.error("Error storing Gmail account:", error.message);
            throw error;
        }
    }
}