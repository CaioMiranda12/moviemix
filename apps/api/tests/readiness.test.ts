import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("GET /health/ready", () => {
  it("returns 200 when the database responds", async () => {
    const app = buildApp({ checkDatabase: async () => {} });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/health/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ready", database: "connected" });
  });

  it("returns 503 when the database is unavailable", async () => {
    const app = buildApp({
      checkDatabase: async () => {
        throw new Error("offline");
      },
    });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/health/ready" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: "unavailable" });
  });

  it("returns 503 when database configuration is missing", async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/health/ready" });
    expect(response.statusCode).toBe(503);
  });
});
