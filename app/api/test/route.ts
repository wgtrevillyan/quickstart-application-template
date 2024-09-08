// test/route.ts

//import { waitUntil } from '@vercel/functions';
//import { getEnv } from '@vercel/functions';
//import { geolocation } from '@vercel/functions';

//import { json } from "stream/consumers";

export const dynamic = "force-dynamic"; // static by default, unless reading the request
export const runtime = "nodejs"; // nodejs or deno

export  function GET(request: Request) {
  console.log("\n"); // Log a new line
  console.log("GET", request.url); // Log the request URL
  console.log("Time:", new Date().toISOString()); // Log the current time

  console.log("Request:"); // Log the request
  console.log(request.method); // Log the request method
  console.log(request.headers); // Log the request headers
  if (request.body) {
    console.log(request.body); // Log the request body
  }
  return new Response("Test API Request Complete"); // Return a response
}
