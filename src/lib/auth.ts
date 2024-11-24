import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const secret: string = process.env.JWT_SECRET || "";

if (secret == "") {
    throw new Error('JWT_SECRET is not defined in the environment variables');
}

export default function check_token(req: NextApiRequest, res: NextApiResponse): boolean {
    const token = req.cookies.token;
    console.log(req.cookies);

    if (!token) {
        res.status(401).json({ message: 'Authorization token is missing' });
        return false;
    }

    try {
        jwt.verify(token, secret);
        return true;
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
        return false;
    }
}