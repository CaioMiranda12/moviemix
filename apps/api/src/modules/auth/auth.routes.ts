import { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { type CreateUser } from "./auth.repository.js";
import { type FindUserByEmail } from "./login.repository.js";
import { type CreateSession } from "./session.repository.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import { DuplicateEmailError, makeRegisterUser } from "./auth.service.js";
import { InvalidCredentialsError, makeLoginUser } from "./login.service.js";
import { makeStartSession, sessionCookie } from "./session.service.js";

export interface AuthDependencies {
  createUser?: CreateUser;
  findUserByEmail?: FindUserByEmail;
  createSession?: CreateSession;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  dependencies: AuthDependencies,
): void {
  if (dependencies.createUser) {
    const register = makeRegisterUser(dependencies.createUser);
    app.post(
      "/auth/register",
      { bodyLimit: 16_384 },
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
}
