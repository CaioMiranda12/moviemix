import { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { type CreateUser } from "./auth.repository.js";
import { type FindUserByEmail } from "./login.repository.js";
import {
  type CreateSession,
  type FindSessionUser,
  type RevokeSession,
} from "./session.repository.js";
import {
  isSameOrigin,
  makeRequireAuth,
  readSessionToken,
} from "./authenticated-session.js";
import { hashSessionToken, SESSION_COOKIE_NAME } from "./session.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import { DuplicateEmailError, makeRegisterUser } from "./auth.service.js";
import { InvalidCredentialsError, makeLoginUser } from "./login.service.js";
import { makeStartSession, sessionCookie } from "./session.service.js";

export interface AuthDependencies {
  createUser?: CreateUser;
  findUserByEmail?: FindUserByEmail;
  createSession?: CreateSession;
  findSessionUser?: FindSessionUser;
  revokeSession?: RevokeSession;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  dependencies: AuthDependencies,
): void {
  if (dependencies.createUser) {
    const register = makeRegisterUser(dependencies.createUser);
    app.post(
      "/auth/register",
      {
        bodyLimit: 16_384,
        config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      },
      async (request, reply) => {
        try {
          const input = registerSchema.parse(request.body);
          const user = await register(input);
          return reply.code(201).send({
            id: user.id,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
          });
        } catch (error) {
          if (error instanceof ZodError)
            return reply.code(400).send({ error: "Invalid registration data" });
          if (error instanceof DuplicateEmailError)
            return reply.code(409).send({ error: "Email already registered" });
          request.log.error({ err: error }, "Registration failed");
          return reply.code(500).send({ error: "Internal server error" });
        }
      },
    );
  }

  if (dependencies.findUserByEmail && dependencies.createSession) {
    const login = makeLoginUser(dependencies.findUserByEmail);
    const startSession = makeStartSession(dependencies.createSession);
    app.post(
      "/auth/login",
      {
        bodyLimit: 16_384,
        config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      },
      async (request, reply) => {
        try {
          const input = loginSchema.parse(request.body);
          const user = await login(input);
          const token = await startSession(user.id);
          reply.header(
            "Set-Cookie",
            sessionCookie(token, process.env.NODE_ENV === "production"),
          );
          return reply.code(200).send({ user });
        } catch (error) {
          if (error instanceof ZodError)
            return reply.code(400).send({ error: "Invalid login data" });
          if (error instanceof InvalidCredentialsError)
            return reply.code(401).send({ error: "Invalid credentials" });
          request.log.error({ err: error }, "Login failed");
          return reply.code(500).send({ error: "Internal server error" });
        }
      },
    );
  }

  if (dependencies.findSessionUser) {
    const requireAuth = makeRequireAuth(dependencies.findSessionUser);
    app.get("/auth/me", async (request, reply) => {
      try {
        const user = await requireAuth(request, reply);
        if (!user) return reply;
        return reply.code(200).send({ user });
      } catch (error) {
        request.log.error({ err: error }, "Session lookup failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    });
  }

  if (dependencies.findSessionUser && dependencies.revokeSession) {
    const requireAuth = makeRequireAuth(dependencies.findSessionUser);
    app.post("/auth/logout", async (request, reply) => {
      // Origin is mandatory: cross-site form submissions and scripts cannot revoke a session.
      if (!isSameOrigin(request))
        return reply.code(403).send({ error: "Forbidden" });
      try {
        const user = await requireAuth(request, reply);
        if (!user) return reply;
        const token = readSessionToken(request.headers.cookie)!;
        await dependencies.revokeSession!(hashSessionToken(token));
        reply.header(
          "Set-Cookie",
          `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
        );
        return reply.code(204).send();
      } catch (error) {
        request.log.error({ err: error }, "Logout failed");
        return reply.code(500).send({ error: "Internal server error" });
      }
    });
  }
}
