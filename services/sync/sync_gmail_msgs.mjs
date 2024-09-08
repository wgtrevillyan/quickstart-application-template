// sync_gmail_messages.mjs

import retrieve_gmail_msgs from "./retrieve_gmail_msgs.mjs";
//import retrieve_msg_details from "./retrieve_msg_details.mjs";
//import store_gmail_msgs from "./store_gmail_msgs.mjs";

export default {
  async run() {
    console.log("Sync service started...");
    console.log("\n");

    // Retrieve the messages
    await retrieve_gmail_msgs.run({ messages: [] });
    var messages = retrieve_gmail_msgs.messages;
    console.log("Messages retrieved: ", messages.length);

    /*
    // Retrieve the messages with details
    await retrieve_msg_details.run({
      steps: {},
      $: {},
      messages: messages,
      processed_messages: null,
    });
    var messages_with_details = retrieve_msg_details.processed_messages;

    await store_gmail_msgs.run({
      steps: {},
      $: {},
      messages: messages_with_details,
    });
    */

    console.log("Sync service finished.");
    console.log("\n");

    return true;
  },
};