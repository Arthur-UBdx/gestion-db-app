import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const secret: string = process.env.JWT_SECRET || "";

if (secret == "") {
    throw new Error('JWT_SECRET is not defined in the environment variables');
}

export default function is_request_authenticated(req: NextApiRequest, res: NextApiResponse): boolean {
    const token = req.cookies.token;

    if (!token) {
        res.status(401).json({ message: 'Authorization token is missing' });
        return false;
    }

    if (check_token(token)) {
        return true;
    } else {
        res.status(401).json({ message: 'Invalid or expired token' });
        return false;
    }
}

export function check_token(token:string) {
    if (!token) {
        return false;
    }
    try {
        jwt.verify(token, secret);
        return true;
    } catch (error) {
        return false;
    }
}