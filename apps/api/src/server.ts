import { buildApp } from "./app.js";

const app = buildApp();

async function start(): Promise<void> {
  try {
    const port = Number(process.env.PORT ?? 3333);

    await app.listen({ host: "0.0.0.0", port });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

void start();
