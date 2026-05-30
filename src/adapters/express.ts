import type { Request, RequestHandler, Response } from "express";

import { isReuploadError } from "../errors.js";
import type { DirectUploadResult } from "../types.js";
import {
  type DirectUploadHandlerOptions,
  type DirectUploadHandlerResponse,
  DirectUploadHandlerError,
  isDirectUploadHandlerError,
  parseDirectUploadBatchFromFormData,
  parseDirectUploadFromFormData,
  runDirectUpload,
  runDirectUploadCompat,
} from "./shared.js";

export type { DirectUploadHandlerOptions } from "./shared.js";
export {
  DirectUploadHandlerError,
  isDirectUploadHandlerError,
} from "./shared.js";

/** Shape of `req.file` from `multer` memory storage. */
export type ExpressMulterFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

export type ExpressMulterDirectUploadOptions = DirectUploadHandlerOptions & {
  getFile: (req: Request) => ExpressMulterFile | undefined;
};

export type ExpressMulterArrayDirectUploadOptions =
  DirectUploadHandlerOptions & {
    getFiles: (req: Request) => ExpressMulterFile[] | undefined;
  };

/**
 * Express handler for direct upload using an existing `multer` middleware.
 *
 * @example
 * ```ts
 * import multer from "multer";
 * import { createReuploadFromEnv } from "@reupload/sdk";
 * import { createExpressMulterDirectUploadHandler } from "@reupload/sdk/express";
 *
 * const upload = multer({ storage: multer.memoryStorage() });
 * const client = createReuploadFromEnv();
 *
 * app.post(
 *   "/api/upload",
 *   upload.single("file"),
 *   createExpressMulterDirectUploadHandler({
 *     client,
 *     getFile: (req) => req.file,
 *   }),
 * );
 * ```
 */
export function createExpressMulterDirectUploadHandler(
  options: ExpressMulterDirectUploadOptions,
): RequestHandler {
  return async (req, res) => {
    try {
      const file = options.getFile(req);
      if (!file) {
        throw new DirectUploadHandlerError(
          400,
          "MISSING_FILE",
          "Missing uploaded file.",
        );
      }

      const projectId =
        options.projectId ??
        (typeof req.body?.projectId === "string" ? req.body.projectId : undefined) ??
        options.client.defaultProjectId;

      if (!projectId) {
        throw new DirectUploadHandlerError(
          400,
          "MISSING_PROJECT_ID",
          "projectId is required.",
        );
      }

      const filename =
        typeof req.body?.filename === "string" ? req.body.filename : undefined;

      const result = await runDirectUpload(options, {
        projectId,
        file: {
          data: file.buffer,
          filename: filename ?? file.originalname,
          contentType: file.mimetype,
          size: file.size,
        },
        ...(filename ? { filename } : {}),
      });

      sendJson(res, 202, result);
    } catch (error) {
      sendError(res, error);
    }
  };
}

/**
 * Express handler that reads `multipart/form-data` via the Web `FormData` API.
 * Requires a body parser that exposes the raw request (or use multer handler above).
 */
/**
 * Express handler for multiple files via `multer.array("file")`.
 *
 * @example
 * ```ts
 * app.post(
 *   "/api/upload",
 *   upload.array("file", 10),
 *   createExpressMulterArrayDirectUploadHandler({
 *     client,
 *     getFiles: (req) => req.files as ExpressMulterFile[],
 *   }),
 * );
 * ```
 */
export function createExpressMulterArrayDirectUploadHandler(
  options: ExpressMulterArrayDirectUploadOptions,
): RequestHandler {
  return async (req, res) => {
    try {
      const files = options.getFiles(req);
      if (!files?.length) {
        throw new DirectUploadHandlerError(
          400,
          "MISSING_FILE",
          "Missing uploaded files.",
        );
      }

      const projectId =
        options.projectId ??
        (typeof req.body?.projectId === "string" ? req.body.projectId : undefined) ??
        options.client.defaultProjectId;

      if (!projectId) {
        throw new DirectUploadHandlerError(
          400,
          "MISSING_PROJECT_ID",
          "projectId is required.",
        );
      }

      if (files.length > 1 && typeof req.body?.filename === "string") {
        throw new DirectUploadHandlerError(
          400,
          "INVALID_FILENAME",
          'The "filename" form field cannot be used when uploading multiple files.',
        );
      }

      const filename =
        typeof req.body?.filename === "string" ? req.body.filename : undefined;

      const result = await runDirectUploadCompat(options, {
        projectId,
        files: files.map((file) => ({
          data: file.buffer,
          filename: filename ?? file.originalname,
          contentType: file.mimetype,
          size: file.size,
        })),
      });

      sendDirectUploadJson(res, 202, result);
    } catch (error) {
      sendError(res, error);
    }
  };
}

export function createExpressFormDataDirectUploadHandler(
  options: DirectUploadHandlerOptions & {
    getFormData: (req: Request) => Promise<FormData>;
  },
): RequestHandler {
  return async (req, res) => {
    try {
      const form = await options.getFormData(req);
      const fileField = options.fileField ?? "file";
      const fileEntries = form.getAll(fileField);

      if (fileEntries.length > 1) {
        const batchInput = await parseDirectUploadBatchFromFormData(
          form,
          options,
        );
        const result = await runDirectUploadCompat(options, batchInput);
        sendDirectUploadJson(res, 202, result);
        return;
      }

      const input = await parseDirectUploadFromFormData(form, options);
      const result = await runDirectUpload(options, input);
      sendJson(res, 202, result);
    } catch (error) {
      sendError(res, error);
    }
  };
}

function sendJson(res: Response, status: number, body: DirectUploadResult): void {
  res.status(status).json(body);
}

function sendDirectUploadJson(
  res: Response,
  status: number,
  body: DirectUploadHandlerResponse,
): void {
  res.status(status).json(body);
}

function sendError(res: Response, error: unknown): void {
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
          message: error instanceof Error ? error.message : "Unexpected error.",
        };

  res.status(status).json(body);
}
