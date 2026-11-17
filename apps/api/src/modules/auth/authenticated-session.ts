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

/**
 * State-changing requests must originate from the public frontend.
 * Never trust X-Forwarded-Host or X-Forwarded-Proto sent by a client.
 */
export function isSameOrigin(request: FastifyRequest): boolean {
  const origin = request.headers.origin;
  if (!origin) return false;

  try {
    const parsedOrigin = new URL(origin);
    if (
      !["http:", "https:"].includes(parsedOrigin.protocol) ||
      parsedOrigin.username ||
      parsedOrigin.password ||
      parsedOrigin.pathname !== "/" ||
      parsedOrigin.search ||
      parsedOrigin.hash
    ) {
      return false;
    }

    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction && parsedOrigin.protocol !== "https:") return false;

    const configuredOrigin = process.env.PUBLIC_APP_ORIGIN;
    if (configuredOrigin) {
      const publicUrl = new URL(configuredOrigin);
      if (
        !["http:", "https:"].includes(publicUrl.protocol) ||
        (isProduction && publicUrl.protocol !== "https:") ||
        publicUrl.username ||
        publicUrl.password ||
        publicUrl.pathname !== "/" ||
        publicUrl.search ||
        publicUrl.hash ||
        publicUrl.origin !== configuredOrigin
      ) {
        return false;
      }
      return parsedOrigin.origin === publicUrl.origin;
    }

    // Production fails closed if the public origin has not been configured.
    if (isProduction) return false;

    // Local development keeps its existing host-based behavior.
    // Fastify inject() may not reflect the protocol supplied in Origin.
    const host = request.headers.host;
    if (!host) return false;

    const expectedOrigin = new URL(`${parsedOrigin.protocol}//${host}`);

    return parsedOrigin.origin === expectedOrigin.origin;
  } catch {
    return false;
  }
}
