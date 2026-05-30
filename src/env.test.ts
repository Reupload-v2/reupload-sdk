import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { createReuploadFromEnv } from "./env.js";

const ENV_KEYS = [
  "REUPLOAD_API_KEY",
  "REUPLOAD_API_BASE_URL",
  "REUPLOAD_PROJECT_ID",
] as const;

describe("createReuploadFromEnv", () => {
  const previous: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });

  it("reads env vars", () => {
    for (const key of ENV_KEYS) {
      previous[key] = process.env[key];
    }

    process.env.REUPLOAD_API_KEY = "ru_from_env";
    process.env.REUPLOAD_API_BASE_URL = "http://localhost:4000/api/v1/";
    process.env.REUPLOAD_PROJECT_ID = "proj-1";

    const client = createReuploadFromEnv();
    assert.equal(client.defaultProjectId, "proj-1");
  });

  it("throws when API key is missing", () => {
    for (const key of ENV_KEYS) {
      previous[key] = process.env[key];
      delete process.env[key];
    }

    assert.throws(() => createReuploadFromEnv(), /Missing Reupload API key/);
  });

  it("throws when project ID is missing", () => {
    for (const key of ENV_KEYS) {
      previous[key] = process.env[key];
      delete process.env[key];
    }

    process.env.REUPLOAD_API_KEY = "ru_from_env";

    assert.throws(
      () => createReuploadFromEnv(),
      /Missing Reupload project ID/,
    );
  });
});
