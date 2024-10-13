// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  // Set CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://newsnook.flutterflow.app", // Adjust this to your specific domain if needed
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle OPTIONS requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  // Handle POST requests
  if (req.method === "POST") {
    try {

      ////////// all proxy logic here //////////

      // Extract headers
      const userId = req.headers.get('userId');
      const code = req.headers.get('code');

      if (!userId || !code) {
        console.error("Missing required headers: userId or code");
        throw new Error("Missing required headers: userId or code");
      }

      // Call vercel API POST to vercel app/api/integrate_google_act
      const response = await fetch("https://quickstart-application-template.vercel.app/api/integrate_google_account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "userId": userId,
          "code": code,
        },
        body: JSON.stringify({}),
      });

      
      // handle response data and potential errors
      if (!response.ok) {
        // If the response status is not OK, throw an error
        const errorData = await response.json();
        console.error(errorData.message || "API call failed");
        throw new Error(errorData.message || "API call failed");
      } 

      const responseData = await response.json();


      //////////////////////////////////////////

      return new Response(
        JSON.stringify(responseData),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message || "Invalid request" }),
        {
          status: error.message.includes("Missing required headers") ? 400 : 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  }

  // Handle other HTTP methods
  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/proxy_integrate_gmail_account' \
    --header 'Authorization: Bearer <service key>' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
