// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  // Set CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Adjust this to your specific domain if needed
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

      // Call vercel API POST /api/integrate_google_act
      const response = await fetch("https://quickstart-application-template.vercel.app/api/integrate_google_act", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Functions",
        }),
      });



      const data = {
        message: `Hello ${response.success}!`,
      };



      //////////////////////////////////////////

      return new Response(
        JSON.stringify(data),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        {
          status: 400,
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
