// api/sync_gmail_msgs/route.ts

// Importing the default export from the .mjs file
import syncGmailMsgs from '../../../src/backend/services/sync/gmailMsgs/sync_gmail_msgs.mjs';

// Exporting the dynamic and runtime variables
export const dynamic = "force-dynamic"; // static by default, unless reading the request
export const runtime = "nodejs"; // nodejs or deno
export const maxDuration = 300; // This function can run for a maximum of 60 seconds (1 minutes)

export async function GET(request: Request) {

  console.log("\n"); // Log a new line
  console.log(request.method, '  ', request.url, ' at time: ', new Date().toISOString()); // Log the request

  try {
    const userId = "de14618c-da53-4cb4-b222-4ae3292c8345" // The user ID
    await syncGmailMsgs.run(userId); // Run the sync_gmail_msgs function
    return new Response("Sync service finished."); // Return a response
  } catch (error) {
    console.log("An error occurred when attempting to start the synce service:"); // Log the message
    console.error(error); // Log the error
    return new Response("Error: " + error, { status: 500 }); // Return a response
  }
}
