import argon2 from "argon2";
import { type FindUserByEmail } from "./login.repository.js";
import { type LoginInput } from "./auth.schemas.js";

// Lazily generated once; unknown accounts still incur an Argon2 verification.
let dummyHashPromise: Promise<string> | undefined;
function dummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash("moviemix-dummy-password", {
    type: argon2.argon2id,
  });
  return dummyHashPromise;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid credentials");
  }
}

export function makeLoginUser(findUser: FindUserByEmail) {
  return async (input: LoginInput) => {
    const user = await findUser(input.email);
    const valid = await argon2.verify(
      user?.passwordHash ?? (await dummyHash()),
      input.password,
    );
    if (!user || !valid) throw new InvalidCredentialsError();
    return { id: user.id, email: user.email };
  };
}
