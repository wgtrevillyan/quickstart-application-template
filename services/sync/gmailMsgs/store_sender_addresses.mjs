// store_sender_addresses.mjs

import { connectToSupabaseClient } from "../../../lib/establish_clients.mjs";
import { getEmailAccountIds } from "../../../lib/supabase_queries.mjs";

/**
 * Stores sender addresses in the Supabase database.
 * 
 * @param {Object} params - Parameters for the function.
 * @param {string} params.emailAccountId - The ID of the user's email account.
 * @param {Array} params.messages - An array of messages.
 * 
 * @returns {Object} An object with a status and the number of addresses stored.
 */
export default {
    async run({ emailAccountId, messages }) {
        try {
            console.log("Storing sender addresses in Supabase...");

            // Establish a connection to the Supabase client.
            const supabaseClient = await connectToSupabaseClient();

            // Extract sender addresses from the messages.
            const senderAddresses = messages.map(message => message.senderEmail);

            // Initialize a counter for stored addresses.
            var storedAddressesCount = 0;

            // Get stored sender addresses from the senderAddresses table.
            const { data: storedSenderAddresses } = await supabaseClient
                .from('senderAddresses')
                .select('senderAddress')
                .eq('emailAccountId', emailAccountId);
            console.log(`Retrieved ${storedSenderAddresses.length} stored sender addresses from the senderAddresses table.`);

            // Filter out sender addresses that have already been stored.
            const newSenderAddresses = senderAddresses.filter(senderAddress => {
                return storedSenderAddresses.every(storedSenderAddress => storedSenderAddress.senderAddress !== senderAddress);
            });
            console.log(`Found ${newSenderAddresses.length} new sender addresses to store.`);

            // Remove duplicates from the new sender addresses.
            const uniqueNewSenderAddresses = [...new Set(newSenderAddresses)];
            console.log(`Found ${uniqueNewSenderAddresses.length} unique sender addresses to store.\n`);

            // Insert new sender addresses into the senderAddresses table.
            const errorMessages = [];
            var i = 0;
            
            for (const newSenderAddress of uniqueNewSenderAddresses) {
                try {
                    i++;
                    console.log(`Inserting sender address ${i} of ${uniqueNewSenderAddresses.length} into the senderAddresses table...\r`);
                    const { data, status, statusText, error } = await supabaseClient
                        .from('senderAddresses')
                        .insert({
                            emailAccountId: emailAccountId,
                            senderAddress: newSenderAddress,
                            status: 'pending'
                        })
                        .select();

                    if (error) {
                        throw new Error(`Unexpected Error occured when inserting message ${i}: ${status} ${statusText} - ${error.message}`);
                    } else if (status !== 201) {
                        throw new Error(`Error storing sender address: ${status} ${statusText}`);
                    } else if (!data) {
                        throw new Error('No data returned after storing sender address.');
                    } else {
                        storedAddressesCount++;
                    }
                } catch (error) {
                    errorMessages.push(error);
                }
            }

            // Print and throw errors if any occurred.
            if (errorMessages.length > 0) {
                console.error(`${errorMessages.length} errors occurred while inserting sender addresses into the table:`);
                for (const errorMessage of errorMessages) {
                    console.error(errorMessage);
                }
                throw new Error(`${errorMessages.length} errors occurred while inserting sender addresses into the table.`);
            }

        } catch (error) {
            console.error("An error occurred while storing sender addresses in Supabase:", error);
            return { status: false, addressesStored: storedAddressesCount };
        }

        // Return the result.
        return { status: true, addressesStored: storedAddressesCount };
    }
}
