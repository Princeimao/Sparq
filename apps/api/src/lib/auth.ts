import * as arctic from "arctic";
import { env } from "../config/env";

interface UserInfo {
    sub: string;
    email: string;
    name: string;
    picture: URL;
}

const google = new arctic.Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);

export const getGoogleAuthUrl = (): { url: string, codeVerifier: string, state: string } => {
    const state = arctic.generateState();
    const codeVerifier = arctic.generateCodeVerifier();
    const scopes = ["openid", "email", "profile"];
    const url = google.createAuthorizationURL(state, codeVerifier, scopes)
    return {
        url: url.toString(),
        codeVerifier,
        state
    };
}

export const exchangeToken = async (code: string, codeVerifier: string): Promise<string> => {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const idToken = tokens.idToken();
    return idToken;
}

export const getUserInfo = (idToken: string): UserInfo => {
    const userInfo = arctic.decodeIdToken(idToken);
    return userInfo as UserInfo;
}