import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export function encrypt(plaintext: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, "utf-8").subarray(0, 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();

  const result = Buffer.concat([iv, tag, encrypted]);
  return result.toString("base64");
}

export function decrypt(ciphertext: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, "utf-8").subarray(0, 32);
  const data = Buffer.from(ciphertext, "base64");

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}

export function encryptJson(data: Record<string, unknown>): string {
  return encrypt(JSON.stringify(data));
}

export function decryptJson<T = Record<string, unknown>>(ciphertext: string): T {
  return JSON.parse(decrypt(ciphertext)) as T;
}
