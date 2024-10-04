// api/store_google_refresh_token/route.ts

// Importing the default export from the .mjs file
import storeRefreshToken from '../../../services/auth/store_google_refresh_token.mjs';

// Exporting the dynamic and runtime variables
export const dynamic = "force-dynamic"; // static by default, unless reading the request
export const runtime = "nodejs"; // nodejs or deno
export const maxDuration = 300; // This function can run for a maximum of 60 seconds (1 minutes)

export async function POST(request: Request): Promise<Response> { {

    console.log("\n"); // Log a new line
    console.log(request.method, '  ', request.url, ' at time: ', new Date().toISOString()); // Log the request
    
    try {

        // Parse the request body to get userId and code
        const userId = request.headers.get("userid");
        const code = request.headers.get("code");

        if (!userId || !code) {
            return new Response(JSON.stringify({ success: false, error: 'Missing userId or code' }), { status: 400 });
        }

        // Run the storeRefreshToken function
        const result = await storeRefreshToken.run({ user_id: userId, code: code });

        const tokenStored = result.token_stored; // Set the token stored flag

        if (!tokenStored) {
            throw new Error("Failed to store refresh token");
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {

        // Type assertion
        const error = e as Error;

        console.log("An error occurred when attempting to store the refresh token:"); // Log the message
        console.error(e); // Log the error

        return new Response(JSON.stringify({ success: false, error: error.message || 'An unknown error occurred' }), { status: 500 });
    }
}}