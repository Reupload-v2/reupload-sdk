import { isReuploadError } from "../errors.js";
import type { DirectUploadResult } from "../types.js";
import {
  type DirectUploadHandlerOptions,
  isDirectUploadHandlerError,
  parseDirectUploadFromFormData,
  runDirectUpload,
} from "./shared.js";

export type { DirectUploadHandlerOptions } from "./shared.js";
export {
  DirectUploadHandlerError,
  isDirectUploadHandlerError,
} from "./shared.js";

/** Minimal H3-compatible event shape (h3, Nitro, SolidStart). */
export type H3EventLike = {
  request: Request;
};

export type H3DirectUploadHandlerOptions = DirectUploadHandlerOptions;

/**
 * Handle direct upload in H3 / Nitro / SolidStart API routes.
 *
 * @example
 * ```ts
 * // routes/api/upload.ts (Nitro)
 * import { createReuploadFromEnv } from "@reupload/sdk";
 * import { handleH3DirectUpload } from "@reupload/sdk/h3";
 *
 * const client = createReuploadFromEnv();
 *
 * export default defineEventHandler((event) =>
 *   handleH3DirectUpload(event, { client }),
 * );
 * ```
 */
export async function handleH3DirectUpload(
  event: H3EventLike,
  options: H3DirectUploadHandlerOptions,
): Promise<DirectUploadResult> {
  try {
    const form = await event.request.formData();
    const input = await parseDirectUploadFromFormData(form, options);
    return await runDirectUpload(options, input);
  } catch (error) {
    throw toH3Error(error);
  }
}

/**
 * Same as {@link handleH3DirectUpload} but returns a `Response` (edge-friendly).
 */
export async function handleH3DirectUploadResponse(
  event: H3EventLike,
  options: H3DirectUploadHandlerOptions,
): Promise<Response> {
  try {
    const result = await handleH3DirectUpload(event, options);
    return Response.json(result, { status: 202 });
  } catch (error) {
    const { status, body } = mapError(error);
    return Response.json(body, { status });
  }
}

export function createH3DirectUploadHandler(
  options: H3DirectUploadHandlerOptions,
) {
  return (event: H3EventLike) => handleH3DirectUpload(event, options);
}

function toH3Error(error: unknown): Error & { statusCode?: number; data?: unknown } {
  const { status, body } = mapError(error);
  const err = new Error(
    "message" in body && typeof body.message === "string"
      ? body.message
      : "Upload failed",
  ) as Error & { statusCode?: number; data?: unknown };
  err.statusCode = status;
  err.data = body;
  return err;
}

function mapError(error: unknown): {
  status: number;
  body: { error: string; message: string };
} {
  if (isDirectUploadHandlerError(error)) {
    return { status: error.status, body: error.toJson() };
  }

  if (isReuploadError(error)) {
    return {
      status: error.status,
      body: { error: error.code, message: error.message },
    };
  }

  return {
    status: 500,
    body: {
      error: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unexpected error.",
    },
  };
}
