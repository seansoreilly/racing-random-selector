const { test, expect } = require("@playwright/test");

// These hit the server started by playwright's webServer (see playwright.config.js),
// via the baseURL-bound `request` fixture.

test.describe("API smoke tests", () => {
  test("GET /api/health returns 200 JSON with expected shape", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/json");

    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(typeof body.timestamp).toBe("string");
  });

  test("GET /api/build-info returns 200 JSON including isProduction", async ({ request }) => {
    const res = await request.get("/api/build-info");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("isProduction");
    expect(typeof body.isProduction).toBe("boolean");
  });

  test("unknown /api/* route returns 404 JSON", async ({ request }) => {
    const res = await request.get("/api/does-not-exist");
    expect(res.status()).toBe(404);
    expect(res.headers()["content-type"]).toContain("application/json");

    const body = await res.json();
    expect(body).toEqual({ error: "Not found" });
  });

  test("GET / returns the app HTML", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/html");

    const body = await res.text();
    expect(body).toContain("<title>");
    expect(body).toContain('id="startRace"');
  });

  test("GET /package.json returns 404 (repo files not exposed)", async ({ request }) => {
    const res = await request.get("/package.json");
    expect(res.status()).toBe(404);
  });

  test("GET /memories.json returns 404 (repo files not exposed)", async ({ request }) => {
    const res = await request.get("/memories.json");
    expect(res.status()).toBe(404);
  });

  test("unknown non-API path falls back to index.html (SPA)", async ({ request }) => {
    const res = await request.get("/some/client/route");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/html");

    const body = await res.text();
    expect(body).toContain('id="startRace"');
  });
});
