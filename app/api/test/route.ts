//import { waitUntil } from '@vercel/functions';
//import { getEnv } from '@vercel/functions';
//import { geolocation } from '@vercel/functions';


export const dynamic = 'force-dynamic'; // static by default, unless reading the request
export const runtime = 'nodejs'; // nodejs or deno
 
export function GET(request: Request) {
  console.log('Time:', new Date().toISOString());
  return new Response(`Request: \n${request}`);
}
