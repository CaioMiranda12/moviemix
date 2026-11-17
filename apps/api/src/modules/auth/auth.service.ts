import argon2 from "argon2";
import { type CreateUser } from "./auth.repository.js";
import { type RegisterInput } from "./auth.schemas.js";

export class DuplicateEmailError extends Error {
  constructor() {
    super("Email already registered");
  }
}

export function makeRegisterUser(createUser: CreateUser) {
  return async (input: RegisterInput) => {
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });
    try {
      return await createUser(input.email, passwordHash);
    } catch (error) {
      const dbError = error as {
        code?: string;
        constraint?: string;
        cause?: { code?: string; constraint?: string };
      };
      const code = dbError.code ?? dbError.cause?.code;
      const constraint = dbError.constraint ?? dbError.cause?.constraint;
      if (code === "23505" && constraint === "users_email_normalized_uq") {
        throw new DuplicateEmailError();
      }
      throw error;
    }
  };
}
