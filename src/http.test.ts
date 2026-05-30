import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ReuploadError } from "./errors.js";
import { HttpClient } from "./http.js";

describe("HttpClient", () => {
  it("sends Bearer auth and parses JSON", async () => {
    let capturedAuth: string | null = null;

    const fetchMock: typeof fetch = async (input, init) => {
      const headers = new Headers(init?.headers);
      capturedAuth = headers.get("Authorization");
      assert.equal(
        String(input),
        "https://api.example.com/api/v1/public/whoami",
      );

      return new Response(
        JSON.stringify({
          apiKeyId: "key-1",
          workspaceId: "ws-1",
          name: "Test",
          permissions: ["files.read"],
          allProjects: true,
          projects: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const http = new HttpClient({
      baseUrl: "https://api.example.com/api/v1",
      apiKey: "ru_test",
      fetch: fetchMock,
    });

    const data = await http.request<{ apiKeyId: string }>("GET", "/public/whoami");
    assert.equal(data.apiKeyId, "key-1");
    assert.equal(capturedAuth, "Bearer ru_test");
  });

  it("preserves /api/v1 prefix when joining paths", async () => {
    let capturedUrl = "";

    const fetchMock: typeof fetch = async (input) => {
      capturedUrl = String(input);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const http = new HttpClient({
      baseUrl: "http://localhost:4000/api/v1",
      apiKey: "ru_test",
      fetch: fetchMock,
    });

    await http.request("GET", "/public/whoami");
    assert.equal(capturedUrl, "http://localhost:4000/api/v1/public/whoami");
  });

  it("throws ReuploadError on API errors", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        JSON.stringify({ error: "NOT_FOUND", message: "Missing." }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );

    const http = new HttpClient({
      baseUrl: "https://api.example.com/api/v1",
      apiKey: "ru_test",
      fetch: fetchMock,
    });

    await assert.rejects(
      () => http.request("GET", "/files/missing"),
      (error: unknown) => {
        assert.ok(error instanceof ReuploadError);
        assert.equal(error.status, 404);
        assert.equal(error.code, "NOT_FOUND");
        return true;
      },
    );
  });
});
