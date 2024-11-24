import type { NextApiRequest, NextApiResponse } from 'next';
import check_token from 'lib/auth';


export default function testauthHandler(req: NextApiRequest, res: NextApiResponse) {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(404).json({ error: 'Not found' });
    }

    if (req.method === 'GET') {
        if (check_token(req, res)) {
            return res.status(200).json({ message: 'Authenticated' });
        }
    }
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
}