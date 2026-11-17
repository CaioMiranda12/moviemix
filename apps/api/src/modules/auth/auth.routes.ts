import { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { type CreateUser } from "./auth.repository.js";
import { registerSchema } from "./auth.schemas.js";
import { DuplicateEmailError, makeRegisterUser } from "./auth.service.js";

export function registerAuthRoutes(
  app: FastifyInstance,
  createUser: CreateUser,
): void {
  const register = makeRegisterUser(createUser);
  app.post("/auth/register", { bodyLimit: 16_384 }, async (request, reply) => {
    try {
      const input = registerSchema.parse(request.body);
      const user = await register(input);
      return reply.code(201).send({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid registration data" });
      }
      if (error instanceof DuplicateEmailError) {
        return reply.code(409).send({ error: "Email already registered" });
      }
      request.log.error({ err: error }, "Registration failed");
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}
