// store_gmail_msgs.mjs

import { connectToSupabaseClient } from "../../../lib/establish_clients.mjs";
import { updateLastGHistoryId } from "../../../lib/supabase_queries.mjs";


export default {
    async run({ messages, emailAccountId, gHistoryId, msgs_stored}) {

        const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client

        console.log("Storing messages in Supabase...");

        //var messages = steps.retrieve_msg_details.messages[0] // define messages for pipedream only

        const tableName = `gmailMessages`;
        let storedMsgs = [];
        let error_msgs = [];
        let total_added = 0;
        for (let i = 0; i < messages.length; i++) {
            if (i % 10 === 0) {console.log(`Inserting message ${i + 1} of ${messages.length} into the ${tableName} table...\r`);}

            // Store the message in Supabase
            try {
                const { data, error, status, statusText } = await supabaseClient.from(tableName).insert(messages[i]);

                if (error) {
                    error_msgs.push(error);
                } else if (status !== 201) {
                    error_msgs.push(`Error: ${status} - ${statusText}`);
                } else {
                    total_added++; // Increment only if there is no error
                    storedMsgs.push(messages[i]); // Store the message in the stored messages list
                }
            } catch (error) {
                error_msgs.push(error);
            }
        }

        // Store recent history ID
        if (gHistoryId) {
            await updateLastGHistoryId(emailAccountId, gHistoryId);
        }

        console.log(`Inserted ${total_added} out of ${messages.length} messages into the ${tableName} table.`);
        
        if (error_msgs.length > 0) {
            console.log(`\n`);
            console.error(`${error_msgs.length} errors occured while inserting messages into the table:`);
            for (let i = 0; i < error_msgs.length; i++) {
                console.error(`Error ${i+1}: `, error_msgs[i]);
            }
        }



        // Export the processed messages
        this.stored_msgs = storedMsgs; // Export the stored messages
        this.msgs_stored = total_added; // Export the total added messages

        console.log("\n");

        return `Stored Messages in ${tableName}: ${total_added}`;
    }
}