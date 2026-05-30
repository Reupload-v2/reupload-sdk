import { Reupload } from "./client.js";
import type { ReuploadOptions } from "./client.js";

export const DEFAULT_BASE_URL = "https://api.reupload.dev/api/v1";

export type ReuploadEnvOptions = Omit<
  ReuploadOptions,
  "apiKey" | "baseUrl" | "defaultProjectId"
> & {
  /** Defaults to `process.env.REUPLOAD_API_KEY`. */
  apiKey?: string;
  /** Defaults to `process.env.REUPLOAD_API_BASE_URL` or production URL. */
  baseUrl?: string;
  /** Defaults to `process.env.REUPLOAD_PROJECT_ID`. */
  defaultProjectId?: string;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/**
 * Create a client from `REUPLOAD_API_KEY`, `REUPLOAD_PROJECT_ID`, and
 * optional `REUPLOAD_API_BASE_URL`.
 */
export function createReuploadFromEnv(
  options: ReuploadEnvOptions = {},
): Reupload {
  const apiKey = options.apiKey ?? readEnv("REUPLOAD_API_KEY");
  if (!apiKey) {
    throw new Error(
      "Missing Reupload API key. Set REUPLOAD_API_KEY or pass apiKey.",
    );
  }

  const defaultProjectId =
    options.defaultProjectId ?? readEnv("REUPLOAD_PROJECT_ID");
  if (!defaultProjectId) {
    throw new Error(
      "Missing Reupload project ID. Set REUPLOAD_PROJECT_ID or pass defaultProjectId.",
    );
  }

  const baseUrl =
    options.baseUrl ?? readEnv("REUPLOAD_API_BASE_URL") ?? DEFAULT_BASE_URL;

  return new Reupload({
    apiKey,
    baseUrl,
    defaultProjectId,
    ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
  });
}
