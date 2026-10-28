import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("Health check endpoint", () => {
  it("should return a 200 status code and a JSON response with status 'ok'", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
