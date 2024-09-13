// api/sync_gmail_msgs/route.ts

// Importing the default export from the .mjs file
import syncGmailMsgs from '../../../services/sync/sync_gmail_msgs.mjs';

// Exporting the dynamic and runtime variables
export const dynamic = "force-dynamic"; // static by default, unless reading the request
export const runtime = "nodejs"; // nodejs or deno
export const maxDuration = 300; // This function can run for a maximum of 60 seconds (1 minutes)

export function GET(request: Request) {
  console.log("\n"); // Log a new line
  console.log(request.method, ' ', request.url, ' at time: ', new Date().toISOString()); // Log the request

  try {
    console.log("Starting sync service..."); // Log the message

    // Run the sync_gmail_msgs function
    syncGmailMsgs.run();

    return new Response("Sync service triggered."); // Return a response
  } catch (error) {
    console.log("An error occurred when attempting to start the synce service:"); // Log the message
    console.error(error); // Log the error
    return new Response("Error: " + error, { status: 500 }); // Return a response
  }
}
