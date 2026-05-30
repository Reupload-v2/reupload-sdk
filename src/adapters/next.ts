import type { Reupload } from "../client.js";
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

export type NextDirectUploadHandlerOptions = DirectUploadHandlerOptions;

/**
 * Handle `POST` direct uploads in Next.js App Router route handlers.
 *
 * @example
 * ```ts
 * // app/api/upload/route.ts
 * import { createReuploadFromEnv } from "@reupload/sdk";
 * import { handleNextDirectUpload } from "@reupload/sdk/next";
 *
 * const client = createReuploadFromEnv();
 *
 * export async function POST(request: Request) {
 *   return handleNextDirectUpload(request, { client });
 * }
 * ```
 */
export async function handleNextDirectUpload(
  request: Request,
  options: NextDirectUploadHandlerOptions,
): Promise<Response> {
  try {
    const form = await request.formData();
    const input = await parseDirectUploadFromFormData(form, options);
    const result = await runDirectUpload(options, input);
    return nextJson(result, 202);
  } catch (error) {
    return nextErrorResponse(error);
  }
}

/** Pages Router API route (`NextApiRequest` with `formidable` / manual buffer). */
export type NextPagesUploadFile = {
  buffer: Buffer;
  originalFilename?: string;
  mimetype?: string;
  size: number;
};

export type NextPagesDirectUploadOptions = DirectUploadHandlerOptions & {
  projectId: string;
  file: NextPagesUploadFile;
  filename?: string;
};

export async function handleNextPagesDirectUpload(
  options: NextPagesDirectUploadOptions,
): Promise<{ status: number; body: DirectUploadResult | { error: string; message: string } }> {
  try {
    const input = {
      projectId: options.projectId,
      file: {
        data: options.file.buffer,
        filename:
          options.filename ??
          options.file.originalFilename ??
          "upload",
        contentType: options.file.mimetype ?? "application/octet-stream",
        size: options.file.size,
      },
      ...(options.filename ? { filename: options.filename } : {}),
    };

    const result = await runDirectUpload(options, input);
    return { status: 202, body: result };
  } catch (error) {
    return { status: mapErrorStatus(error), body: mapErrorBody(error) };
  }
}

function nextJson(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function nextErrorResponse(error: unknown): Response {
  return nextJson(mapErrorBody(error), mapErrorStatus(error));
}

function mapErrorStatus(error: unknown): number {
  if (isDirectUploadHandlerError(error)) return error.status;
  if (isReuploadError(error)) return error.status;
  return 500;
}

function mapErrorBody(error: unknown): { error: string; message: string } {
  if (isDirectUploadHandlerError(error)) return error.toJson();
  if (isReuploadError(error)) {
    return { error: error.code, message: error.message };
  }

  return {
    error: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Unexpected error.",
  };
}
