import { createHash, randomBytes } from "node:crypto";
import { type CreateSession } from "./session.repository.js";

export const SESSION_COOKIE_NAME = "moviemix_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function makeStartSession(createSession: CreateSession) {
  return async (userId: string): Promise<string> => {
    const token = randomBytes(32).toString("hex");
    await createSession({
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    });
    return token;
  };
}

export function sessionCookie(token: string, production: boolean): string {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_DURATION_MS / 1000}`,
  ];
  if (production) attributes.push("Secure");
  return attributes.join("; ");
}
