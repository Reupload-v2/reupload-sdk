import type { FastifyReply, FastifyRequest } from "fastify";

import { isReuploadError } from "../errors.js";
import type { DirectUploadResult } from "../types.js";
import {
  type DirectUploadHandlerOptions,
  DirectUploadHandlerError,
  isDirectUploadHandlerError,
  parseDirectUploadFromFormData,
  runDirectUpload,
} from "./shared.js";

export type { DirectUploadHandlerOptions } from "./shared.js";
export {
  DirectUploadHandlerError,
  isDirectUploadHandlerError,
} from "./shared.js";

export type FastifyMultipartFile = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
};

export type FastifyDirectUploadHandlerOptions = DirectUploadHandlerOptions & {
  getFile: (request: FastifyRequest) => Promise<FastifyMultipartFile | undefined>;
  getProjectId?: (request: FastifyRequest) => string | undefined;
  getFilename?: (request: FastifyRequest) => string | undefined;
};

/**
 * Fastify route handler for server-side direct upload.
 * Pair with `@fastify/multipart` and read the file in `getFile`.
 */
export function createFastifyDirectUploadHandler(
  options: FastifyDirectUploadHandlerOptions,
) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<DirectUploadResult | { error: string; message: string }> => {
    try {
      const file = await options.getFile(request);
      if (!file) {
        throw new DirectUploadHandlerError(
          400,
          "MISSING_FILE",
          "Missing uploaded file.",
        );
      }

      const projectId =
        options.projectId ??
        options.getProjectId?.(request) ??
        options.client.defaultProjectId;

      if (!projectId) {
        throw new DirectUploadHandlerError(
          400,
          "MISSING_PROJECT_ID",
          "projectId is required.",
        );
      }

      const filename = options.getFilename?.(request);

      const result = await runDirectUpload(options, {
        projectId,
        file: {
          data: file.buffer,
          filename: filename ?? file.filename,
          contentType: file.mimetype,
          size: file.size,
        },
        ...(filename ? { filename } : {}),
      });

      return reply.status(202).send(result);
    } catch (error) {
      const status = isDirectUploadHandlerError(error)
        ? error.status
        : isReuploadError(error)
          ? error.status
          : 500;

      const body = isDirectUploadHandlerError(error)
        ? error.toJson()
        : isReuploadError(error)
          ? { error: error.code, message: error.message }
          : {
              error: "INTERNAL_ERROR",
              message:
                error instanceof Error ? error.message : "Unexpected error.",
            };

      return reply.status(status).send(body);
    }
  };
}

/** When the request body is already a Web `FormData` (uncommon in Fastify). */
export async function handleFastifyFormDataDirectUpload(
  form: FormData,
  options: DirectUploadHandlerOptions,
): Promise<DirectUploadResult> {
  const input = await parseDirectUploadFromFormData(form, options);
  return runDirectUpload(options, input);
}
