export const dynamic = 'force-dynamic'; // static by default, unless reading the request
export const runtime = 'nodejs'; // nodejs or deno
 
export function GET(request: Request) {
  console.log('Time:', new Date().toISOString());
  let url = new URL(request.url);
  return new Response(`Hello from ${process.env.VERCEL_REGION}`);
}
