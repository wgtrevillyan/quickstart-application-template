import { NextApiRequest, NextApiResponse } from 'next';

// Middleware function to add CORS headers
const allowCors = (fn: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  //res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://newsnook.flutterflow.app'); // Replace with your specific domain
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  console.log("Request: ", req);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return await fn(req, res);
};

// The main handler function for your API endpoint
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Your existing handler logic
  console.log("handler");
  res.status(200).json({ message: 'Google account integrated successfully' });
};
/*
export async function POST(req: NextApiRequest, res: NextApiResponse) {
  await allowCors(handler)(req, res);
};
*/
// Export the handler wrapped with the CORS middleware
export async function POST(request: Request) {
  const results = await allowCors(handler);
  console.log("main");
  return new Response(JSON.stringify(results), {
    headers: {
      'Access-Control-Allow-Origin': 'https://newsnook.flutterflow.app',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
  