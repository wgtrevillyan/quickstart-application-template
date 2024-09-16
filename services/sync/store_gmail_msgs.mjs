// store_gmail_msgs.mjs

import { connectToSupabaseClient } from "../../lib/establish_clients.mjs";
import { updateLastGHistoryId } from "../../lib/supabase_queries.mjs";


export default {
    async run({ messages, gUserId, gHistoryId, msgs_stored }) {

        const supabaseClient = await connectToSupabaseClient(); // Create a new Supabase client

        console.log("Storing messages in Supabase...");

        //var messages = steps.retrieve_msg_details.messages[0] // define messages for pipedream only

        const tableName = `gmailMessages`;
        let error_msgs = [];
        let total_added = 0;
        for (let i = 0; i < messages.length; i++) {

            process.stdout.write(`Inserting message ${i + 1} of ${messages.length} into the ${tableName} table...\r`);

            // Store the message in Supabase
            try {
                const { data, error } = await supabaseClient.from(tableName).insert(messages[i]);
                if (error) {
                    error_msgs.push(error);
                } else {
                    total_added++; // Increment only if there is no error
                }
            } catch (error) {
                error_msgs.push(error);
            }
        }

        console.log(`Inserted ${total_added} out of ${messages.length} messages into the ${tableName} table.`);
        
        if (error_msgs.length > 0) {
            console.log(`\n`);
            console.error(`${error_msgs.length} errors occured while inserting messages into the table:`);
            for (let i = 0; i < error_msgs.length; i++) {
                console.error(`Error ${i+1}: `, error_msgs[i]);
            }
        }

        // Store recent history ID
        if (gHistoryId) {
            await updateLastGHistoryId(gUserId, gHistoryId);
        }

        // Export the processed messages
        console.log(`Exporting results...`);
        this.msgs_stored = total_added; // Export the total added messages

        console.log("\n");

        return `Stored Messages in ${tableName}: ${total_added}`;
    }
}