export const dynamic = 'force-dynamic'; // static by default, unless reading the request
export const runtime = 'nodejs'; // nodejs or deno
 
export function GET(request: Request) {
  console.log('GET', request.url);
  return new Response(`Hello from ${process.env.VERCEL_REGION}`);
}
