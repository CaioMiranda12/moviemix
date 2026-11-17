import { type FastifyReply, type FastifyRequest } from "fastify";
import { type FindSessionUser } from "./session.repository.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./session.service.js";

export type AuthenticatedUser = { id: string; email: string };

export function readSessionToken(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) return null;
  const values = cookieHeader.split(";").map((part) => part.trim());
  const matches = values.filter((part) =>
    part.startsWith(`${SESSION_COOKIE_NAME}=`),
  );
  if (matches.length !== 1) return null;
  const token = matches[0]!.slice(SESSION_COOKIE_NAME.length + 1);
  return /^[0-9a-f]{64}$/.test(token) ? token : null;
}

export function makeRequireAuth(findSessionUser: FindSessionUser) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<AuthenticatedUser | null> => {
    const token = readSessionToken(request.headers.cookie);
    if (!token) {
      reply.code(401).send({ error: "Unauthorized" });
      return null;
    }
    const user = await findSessionUser(hashSessionToken(token));
    if (!user) {
      reply.code(401).send({ error: "Unauthorized" });
      return null;
    }
    return user;
  };
}

export function isSameOrigin(request: FastifyRequest): boolean {
  const origin = request.headers.origin;
  const host = request.headers.host;

  if (!origin || !host) {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);
    const requestOrigin = new URL(`${request.protocol}://${host}`);

    if (!["http:", "https:"].includes(parsedOrigin.protocol)) {
      return false;
    }

    if (
      process.env.NODE_ENV === "production" &&
      parsedOrigin.protocol !== "https:"
    ) {
      return false;
    }

    return parsedOrigin.origin === requestOrigin.origin;
  } catch {
    return false;
  }
}
