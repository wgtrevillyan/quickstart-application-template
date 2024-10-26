// get_recent_gmail_msgs.mjs:

// Import necessary modules
import { google } from "googleapis";
import { connectToSupabaseClient } from "../../lib/establish_clients.mjs";
import storeGmailAccount from "./store_gmail_account.mjs"
import { create } from "domain";

export default {
    async run({ user_id, code, redirect_uri }) {


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
                    redirect_uri
                );
                /*
                const authUrl = oauth2Client.generateAuthUrl({
                    access_type: 'offline', // Request offline access to receive a refresh token
                    scope: [
                      'https://www.googleapis.com/auth/gmail.readonly'
                    ],
                  });
                */
                
                // Decode code to get refresh token and access token
                console.log("Decoding refresh token...");
                const { tokens, error } = await oauth2Client.getToken(code);

                if (error) {
                    throw new Error('Error when running getToken(code): ', error.message);
                } else if (!tokens.refresh_token) {
                    throw new Error(`No refresh token found in the http response, returning: ${tokens}`);
                } else if (!tokens.access_token) {
                    throw new Error(`No access token found in the http response, returning: ${tokens}`);
                }

                oauth2Client.setCredentials({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });

                return { refreshToken: tokens.refresh_token, gmailClient: oauth2Client };
                
            } catch (e) {
                console.error("Error retrieving tokens: ", e.message);
                throw e;
            }

            
        }

        //FUNCTION: Retrieve Gmail account info
        async function getGoogleAccountInfo(oauth2Client) {
            
            try {
                console.log("Retrieving google account info...");
                const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
                const response = await gmail.users.getProfile({
                    userId: 'me'
                });

                if (!response.data) {
                    throw new Error(`Failed to retrieve gmail account info with refresh token, returning ${response}`);
                }

                const gmailAccountInfo = response.data;
                //console.log("Google account info: ", gmailAccountInfo);

                return gmailAccountInfo
            } catch (e) {
                console.error('Unexpected error while retrieving google account info: ', e.message);
                throw e;
            }
        }

        // FUNCTION: Store refresh token in Supabase vault
        async function storeRefreshToken(emailAddress, refreshToken) {

            // FUNCTION: Update the refresh token in the Supabase vault
            async function updateRefreshToken(supabase, secretValue, uniqueName, description) {
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
                    const { data, error, status, statusText } = await supabase.rpc('update_secret', {
                        id: secretId,
                        secret: secretValue,
                        name: uniqueName,
                        description: description,
                    });
                    
                    if (error) {
                        throw new Error(error.message);
                    } else if (status !== 200) {
                        throw new Error(`Update of token failed. Unexpected error: ${status} ${statusText}`);
                    } else {
                        console.log('Token updated successfully.');
                        return true;
                    }
                } catch (err) {
                    console.error('Update of token failed. Unexpected error:', err);   
                    return false;
                }
                
            }

            async function createSecretForRefreshToken(supabaseClient, secretValue, uniqueName, description) {
            
                // Store the token in the Supabase vault
                console.log("Storing token in Supabase vault...");
                try {
                    const { data, error, status, statusText } = await supabaseClient.rpc('create_secret', {
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
                                const tokenUpdated = await updateRefreshToken(supabaseClient, secretValue, uniqueName, description); // Update the token in the vault
                                
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
                    } else if (status !== 200) {
                        throw new Error(`Token not stored. Unexpected error: ${status} ${statusText}`);
                    } else if (data === null) {
                        throw new Error('Token not stored. Returned data for UUID is null.');
                    } else {
                        console.log('Token stored successfully.');
                        return true;
                    }
                    
                } catch (err) {
                    console.error('Unexpected error:', err);   
                    return false;
                }
            }

            async function getAccountIdsFromEmail(supabaseClient, emailAddress) {
                try {
                    const { data, error } = await supabaseClient
                        .from('emailAccounts')
                        .select('id')
                        .eq('emailAddress', emailAddress);

                    if (error) {
                        throw new Error(error.message);
                    } else if (data === null) {
                        throw new Error('Account IDs not retrieved. Returned data is null.');
                    } else {
                        return data;
                    }
                } catch (err) {
                    console.error('Retrieval of account IDs failed. Unexpected error:', err);
                    return null;
                }
            }


            //////////////////////////////////////
            
            try {
                // Establish connection to Supabase
                const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client

                // retrieve applicable email account ids
                const unformattedEmailAccountIds = await getAccountIdsFromEmail(supabaseClient, emailAddress);
                const emailAccountIds = unformattedEmailAccountIds.map(account => account.id);
                if (!emailAccountIds || emailAccountIds === null) {
                    throw new Error("Error retrieving email account ids, returning: ", emailAccountIds || null);
                }

                for (const accountId of emailAccountIds) {

                    console.log("Storing refresh token for account ID: ", accountId);

                    // Create a name and description for the secret
                    const secretName = `GMAIL_REFRESH_TOKEN_${accountId}`;
                    const secretDescription = `Gmail Refresh Token for email account id ${accountId}`;

                    // Store the refresh token in the Supabase vault
                    const result = await createSecretForRefreshToken(supabaseClient, refreshToken, secretName, secretDescription);
                    if (!result || result === null) {
                        throw new Error(`Error storing refresh token for account ID ${accountId}, returning: ${result || null}`);
                    }
                }

            } catch (error) {
                console.error("Error storing refresh token:", error);
                return false;
            }
    
            console.log('Refresh token updated across all accounts successfully.');
            return true;


            
        }

        //////////////////////////////////////////////////////

        try {
            // Decode the tokens and retrieve the refresh token
            const decodeResults = await decodeTokens(code); 
            if (decodeResults.error) {
                throw new Error("Error decoding tokens: ", decodeResults.error);
            } else if (!decodeResults.refreshToken) {
                throw new Error("Error decoding tokens, failing to return refreshToken.");
            } else if (!decodeResults.gmailClient) {
                throw new Error("Error decoding tokens, failing to return gmailClient.");
            }

            const gmailClient = decodeResults.gmailClient;
            const refreshToken = decodeResults.refreshToken;

            // Get google account info
            const gAccountInfo = await getGoogleAccountInfo(gmailClient);
            if (!gAccountInfo) {
                throw new Error("Error retrieving google account info, returning: ", gAccountInfo);
            }
            
            // Store the Gmail account
            const accountId = await storeGmailAccount.run({userId: user_id, gAccountInfo: gAccountInfo });
            if (!accountId || accountId === null ) {
                throw new Error("Error storing user gmail account in emailAccounts table within Supabase, returning false.");
            }


            //`GMAIL_REFRESH_TOKEN_${accountId}` `Gmail Refresh Token for user ${user_id}`
            // store refresh token
            const result = await storeRefreshToken(gAccountInfo.emailAddress, refreshToken,); // Store the refresh token in the Supabase vault
            //console.log("storeRefreshToken() result:", result);
            if (result) {
                return { token_stored: true };
            } else {
                throw new Error("storeRefreshToken() failed returing false.");
            }
        } catch (error) {
            console.error("Error storing refresh token:", error);
            return { token_stored: false, error: error };
        }

        
    }
}
