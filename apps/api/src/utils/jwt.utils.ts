import { env } from "../config/env";
import jwt, { type SignOptions } from "jsonwebtoken";

export function generateAccessToken(userId: string, email: string): string {
    return jwt.sign({
        userId,
        email
    },
        env.JWT_ACCESS_SECRET, {
            expiresIn: env.JWT_ACCESS_EXPIRES_IN as string,
        } as SignOptions);
}

export function generateRefreshToken(userId: string, email: string): string {
    return jwt.sign({
        userId,
        email
    },
        env.JWT_REFRESH_SECRET, {
            expiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
        } as SignOptions);
}
