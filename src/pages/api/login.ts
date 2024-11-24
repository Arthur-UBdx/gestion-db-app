import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import check_token from 'lib/auth';

dotenv.config();

export default async function loginHandler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case 'POST':
            const { password } = req.body;
            const correctPassword = process.env.PASSWORD;
            const tokenLifetime = process.env.TOKEN_LIFETIME;
            const jwtSecret = process.env.JWT_SECRET;
        
            if (!correctPassword || !tokenLifetime || !jwtSecret) {
                console.error("Missing environment variables");
                console.error("{PASSWORD: ", correctPassword);
                console.error("TOKEN_LIFETIME: ", tokenLifetime);
                console.error("JWT_SECRET: ", jwtSecret, "}");
                return res.status(500).json({ error: 'Internal server error' });
            }
    
            if (!password) {
                return res.status(400).json({ error: 'Missing entries' });
            }
        
            if (password !== correctPassword) {
                return res.status(401).json({ error: 'Invalid password' });
            }
        
            const token = jwt.sign({ user: 'authenticated' }, jwtSecret, { expiresIn: tokenLifetime });
            res.setHeader('Set-Cookie', `token=${token}; Max-Age=${tokenLifetime}; HttpOnly; Path=/; Secure`);
            return res.status(200).json({ message: 'Authenticated' });

        case 'DELETE':
            if (check_token(req, res)) {
                res.setHeader('Set-Cookie', 'token=; Max-Age=0; Path=/; HttpOnly');
                return res.status(200).json({ message: 'Logged out successfully' });
            }
            return res.status(401).json({ error: 'Unauthorized' });
        default:
            res.setHeader('Allow', ['POST', 'DELETE']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}