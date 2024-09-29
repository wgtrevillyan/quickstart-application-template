// get_recent_gmail_msgs.mjs:

// Import necessary modules
import { connectToGmailClient } from "../../lib/establish_clients.mjs";
import { connectToSupabaseClient } from "../../lib/establish_clients.mjs";

export default {
    async run({ user_id, code }) {


        //FUNCTION: Decode the access and refresh tokens
        async function decodeTokens(code) {
            
            // Establish Gmail connection
            const gmail = await connectToGmailClient();
            
            try {
                console.log("Decoding refresh token...");
                const { tokens } = await gmail.client.getToken(code);
                //console.log("Access token: ", tokens.access_token);
                //console.log("Refresh token: ", tokens.refresh_token);
            } catch (error) {
                console.error("Error retrieving tokens:", error.message);
                throw error;
            }

            return tokens.refresh_token;
        }

        // FUNCTION: Store refresh token in Supabase vault
        async function storeRefreshToken(secretValue, uniqueName, description) {
            
            const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client
            
            // Store the token in the Supabase vault
            console.log("Storing token in Supabase vault...");
            try {
                const { data, error } = await supabaseClient.rpc('vault.create_secret', {
                    secret: secretValue,
                    name: uniqueName,
                    description: description,
                });
            
                if (error) {
                    console.error('Error storing secret:', error);
                    return;
                }
            
                console.log('Token stored successfully:', data);
            } catch (err) {
                console.error('Unexpected error:', err);   
                throw err; 
            }
        }

        // FUNCTION: Verify that refresh token was properly stored in supabase vault
        async function verifyTokenStorage(uniqueName) {
            
            const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client
            
            // Retrieve the token from the Supabase vault
            console.log("Retrieving token from Supabase vault...");
            try {
                const { data, error } = await supabaseClient.rpc('vault.get_secret', {
                    name: uniqueName,
                });
            
                if (error) {
                    console.error('Error retrieving secret:', error);
                    return false;
                }
            
                console.log('Token retrieved successfully:', data);
            } catch (err) {
                console.error('Unexpected error:', err);   
                throw err; 
            }

            // Check if the secret is not null
            if (data.secret !== null) {
                return true;
            } else {
                return false;    
            }
        }

        //////////////////////////////////////////////////////

        const refreshToken = await decodeTokens(code); // Decode the tokens and retrieve the refresh token
        await storeRefreshToken(refreshToken, `GMAIL_REFRESH_TOKEN_USER_${user_id}`, `Gmail Refresh Token for user ${user_id}`); // Store the refresh token in the Supabase vault
        const tokenStored = await verifyTokenStorage(`GMAIL_REFRESH_TOKEN_USER_${user_id}`); // Verify that the token was properly stored
        
        i = 0;
        while (!tokenStored) {
            console.log("Error storing refresh token. Retrying...");
            tokenStored = await verifyTokenStorage(`GMAIL_REFRESH_TOKEN_USER_${user_id}`); // Verify that the token was properly stored

            if (i > 5) {
                console.log("Error storing refresh token. Exiting...");
                break;
            }

            i++;
        }

        return { token_stored: tokenStored };
    }
}
