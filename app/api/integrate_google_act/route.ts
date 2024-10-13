import { NextApiRequest, NextApiResponse } from 'next';

// Middleware function to add CORS headers
const allowCors = (fn: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Use '*' for development; specify domains for production
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return await fn(req, res);
};

// The main handler function for your API endpoint
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Your existing handler logic
  console.log('Request method:', req.method);
  res.status(200).json({ message: 'Google account integrated successfully' });
};

// Export the handler wrapped with the CORS middleware
export async function main(req: NextApiRequest, res: NextApiResponse) {
    await allowCors(handler)(req, res);
}