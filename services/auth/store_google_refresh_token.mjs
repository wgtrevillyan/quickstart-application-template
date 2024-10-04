// get_recent_gmail_msgs.mjs:

// Import necessary modules
import { google } from "googleapis";
import { connectToSupabaseClient } from "../../lib/establish_clients.mjs";

export default {
    async run({ user_id, code }) {


        //FUNCTION: Decode the access and refresh tokens
        async function decodeTokens(code) {
            
            // Establish Gmail connection
            const clientId = process.env.GMAIL_CLIENT_ID_WEB;
            const clientSecret = process.env.GMAIL_CLIENT_SECRET_WEB;
            //console.log('Client ID:', clientId);
            //console.log('Client Secret:', clientSecret);

            try {
                console.log('Establishing OAuth2 client...');
                var oauth2Client = new google.auth.OAuth2(
                    clientId,
                    clientSecret,
                    'https://newsnook.flutterflow.app/gmailOauth2callback'
                );
                /*
                const authUrl = oauth2Client.generateAuthUrl({
                    access_type: 'offline', // Request offline access to receive a refresh token
                    scope: [
                      'https://www.googleapis.com/auth/gmail.readonly'
                    ],
                  });
                */
            
                console.log("Decoding refresh token...");
                const { tokens } = await oauth2Client.getToken(code);
                //console.log("tokens: ", tokens);
                //console.log("tokens.access_token: ", tokens.access_token);
                //console.log("tokens.refresh_token: ", tokens.refresh_token);

                if (!tokens.refresh_token) {
                    throw new Error("No refresh token found in the response.");
                }

                return tokens.refresh_token;
            } catch (error) {
                console.error("Error retrieving tokens:", error.message);
                return null;
            }

            
        }

        // FUNCTION: Store refresh token in Supabase vault
        async function storeRefreshToken(secretValue, uniqueName, description) {

            // FUNCTION: Update the refresh token in the Supabase vault
            async function updateRefreshToken(secretValue, uniqueName, description) {

                const supabase = await connectToSupabaseClient(); // Create a new Supabase client
                var secretId = null; // Initialize the secret ID

                // Retrieve the secret ID from the vault           
                try {
                    console.log("Retrieving secret ID...");
                    const { data, error } = await supabase.rpc('get_secret_id', { secret_name: uniqueName }); 

                    if (error) {
                        throw new Error(error.message);
                    } else if (data === null) {
                        throw new Error('Secret ID not found or empty.');
                    } else {
                        //console.log('Secret ID retrieved successfully:', data);
                        secretId = data;
                    }
                
                } catch (err) {  
                    console.error('Secret ID retrieval failed. Unexpected error:', err);
                    return false;
                }

                // Update the secret in the vault
                try {
                    console.log("Updating token in Supabase vault...");
                    const { data, error } = await supabase.rpc('update_secret', {
                        id: secretId,
                        secret: secretValue,
                        name: uniqueName,
                        description: description,
                    });
                    
                    if (error) {
                        throw new Error(error.message);
                    } else {
                        console.log('Token updated successfully.');
                        return true;
                    }
                } catch (err) {
                    console.error('Update of token failed. Unexpected error:', err);   
                    return false;
                }
                
            }


            //////////////////////////////////////
            
            const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client
            
            // Store the token in the Supabase vault
            console.log("Storing token in Supabase vault...");
            try {
                const { data, error } = await supabaseClient.rpc('create_secret', {
                    secret: secretValue,
                    name: uniqueName,
                    description: description,
                });

                
                if (error) {

                    // Check if the token already exists
                    if (error.code === '23505') {
                        console.log(`${uniqueName} already exists. Updating the token...`);
    
                        console.log("\n");
                        try {
                            const tokenUpdated = await updateRefreshToken(secretValue, uniqueName, description); // Update the token in the vault
                            
                            if (!tokenUpdated) {
                                throw new Error("Error updating token: tokenUpdated returned false.");
                            } else {
                                return true;
                            }
                        } catch (err) {
                            throw new Error(err.message);
                        }   
   
                    } else {
                        throw new Error(error.message);
                    }
                
                } else if (data === null) {
                    throw new Error('Token not stored. Returned data for UUID is null.');
                } else {
                    console.log('Token stored successfully:', data);
                    return true;
                }
                
            } catch (err) {
                console.error('Unexpected error:', err);   
                return false;
            }
        }

        // FUNCTION: Verify that refresh token was properly stored in supabase vault
        async function verifyTokenStorage(uniqueName) {
            
            const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client
            
            // Retrieve the token from the Supabase vault
            console.log("Retrieving token from Supabase vault...");
            try {
                const { data, error } = await supabaseClient.rpc('get_secret', { secret_name: uniqueName }); // Retrieve the secret from the vault
            
                if (error) {
                    throw new Error(error.message);
                }
        
            } catch (err) {
                console.error('Error when verifying successful storage of refresh token:', err);
                return false;
            }

            // Check if the secret is not null
            if (data.secret !== null) {
                return true;
            } else {
                return false;    
            }
        }

        //////////////////////////////////////////////////////

        try {
            var refreshToken = await decodeTokens(code); // Decode the tokens and retrieve the refresh token
            const result = await storeRefreshToken(refreshToken, `GMAIL_REFRESH_TOKEN_USER_${user_id}`, `Gmail Refresh Token for user ${user_id}`); // Store the refresh token in the Supabase vault
            //console.log("storeRefreshToken() result:", result);
            if (result) {
                return { token_stored: true };
            } else {
                throw new Error("storeRefreshToken() failed returing false.");
            }
        } catch (error) {
            console.error("Error storing refresh token:", error);
            return { token_stored: false };
        }

        
    }
}
