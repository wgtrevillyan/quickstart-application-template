// store_sender_addresses.mjs

import { connectToSupabaseClient } from "../../../lib/establish_clients.mjs";
import { getEmailAccountIds } from "../../../lib/supabase_queries.mjs";

/**
 * Stores sender addresses in the Supabase database.
 * 
 * @param {Object} params - Parameters for the function.
 * @param {string} params.userId - The ID of the user.
 * @param {Array} params.messages - An array of messages.
 * 
 * @returns {Object} An object with a status and the number of addresses stored.
 */
export default {
    async run({ emailAccountId, messages }) {
        try {
            // Establish a connection to the Supabase client.
            const supabaseClient = await connectToSupabaseClient();

            // Extract sender addresses from the messages.
            const senderAddresses = messages.map(message => message.senderEmail);

            // Get email account IDs from the emailAccounts table.
            const emailAccountIds = await getEmailAccountIds(userId);

            // Initialize a counter for stored addresses.
            let storedAddressesCount = 0;

            // Get stored sender addresses from the senderAddresses table.
            const { data: storedSenderAddresses } = await supabaseClient
                .from('senderAddresses')
                .select('senderAddress')
                .eq('userId', userId)
                .eq('emailAccountId', emailAccountId);

            // Filter out sender addresses that have already been stored.
            const newSenderAddresses = senderAddresses.filter(senderAddress => {
                return storedSenderAddresses.every(storedSenderAddress => storedSenderAddress.senderAddress !== senderAddress);
            });

            // Insert new sender addresses into the senderAddresses table.
            const errorMessages = [];
            for (const newSenderAddress of newSenderAddresses) {
                try {
                    const { data, status, statusText, error } = await supabaseClient.from('senderAddresses').insert({
                        emailAccountId: emailAccountId,
                        senderAddress: newSenderAddress,
                        status: 'pending'
                    });

                    if (error) {
                        throw new Error(error.message);
                    } else if (status !== 200) {
                        throw new Error(`Error storing sender address: ${status} ${statusText}`);
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
