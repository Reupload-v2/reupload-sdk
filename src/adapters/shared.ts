import type { Reupload } from "../client.js";
import type {
  DirectUploadBatchInput,
  DirectUploadBatchResult,
  DirectUploadInput,
  DirectUploadResult,
  UploadFileInput,
} from "../types.js";

export const DEFAULT_FILE_FIELD = "file";

export type DirectUploadHandlerOptions = {
  client: Reupload;
  /**
   * Project UUID. Falls back to `client.defaultProjectId` or the
   * multipart `projectId` field when omitted.
   */
  projectId?: string;
  /** Multipart field name for the file. Default `file`. */
  fileField?: string;
};

export class DirectUploadHandlerError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "DirectUploadHandlerError";
    this.status = status;
    this.code = code;
  }

  toJson() {
    return { error: this.code, message: this.message };
  }
}

export function resolveProjectId(
  options: DirectUploadHandlerOptions,
  formProjectId: string | null | undefined,
): string {
  const projectId =
    options.projectId ?? formProjectId ?? options.client.defaultProjectId;

  if (!projectId) {
    throw new DirectUploadHandlerError(
      400,
      "MISSING_PROJECT_ID",
      "projectId is required (form field, handler option, or REUPLOAD_PROJECT_ID).",
    );
  }

  return projectId;
}

function parseOptionalBooleanFormField(
  value: string | null | undefined,
): boolean | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "") {
    return undefined;
  }
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  throw new DirectUploadHandlerError(
    400,
    "VALIDATION_ERROR",
    'isPublic must be "true" or "false".',
  );
}

export async function fileFromFormDataEntry(
  entry: FormDataEntryValue,
  filenameOverride?: string | null,
): Promise<UploadFileInput> {
  if (!(entry instanceof File)) {
    throw new DirectUploadHandlerError(
      400,
      "MISSING_FILE",
      "Expected a file in the multipart form.",
    );
  }

  if (entry.size <= 0) {
    throw new DirectUploadHandlerError(400, "EMPTY_FILE", "File is empty.");
  }

  const data = Buffer.from(await entry.arrayBuffer());

  return {
    data,
    filename: filenameOverride?.trim() || entry.name || "upload",
    contentType: entry.type || "application/octet-stream",
    size: entry.size,
  };
}

export async function parseDirectUploadFromFormData(
  form: FormData,
  options: DirectUploadHandlerOptions,
): Promise<DirectUploadInput> {
  const fileField = options.fileField ?? DEFAULT_FILE_FIELD;
  const fileEntry = form.get(fileField);
  const projectId = resolveProjectId(
    options,
    form.get("projectId")?.toString(),
  );
  const filenameField = form.get("filename");

  if (!fileEntry) {
    throw new DirectUploadHandlerError(
      400,
      "MISSING_FILE",
      `Missing multipart field "${fileField}".`,
    );
  }

  const file = await fileFromFormDataEntry(
    fileEntry,
    typeof filenameField === "string" ? filenameField : null,
  );
  const isPublic = parseOptionalBooleanFormField(
    form.get("isPublic")?.toString(),
  );

  return {
    projectId,
    file,
    ...(typeof filenameField === "string" && filenameField.trim()
      ? { filename: filenameField.trim() }
      : {}),
    ...(isPublic !== undefined ? { isPublic } : {}),
  };
}

export async function runDirectUpload(
  options: DirectUploadHandlerOptions,
  input: DirectUploadInput,
): Promise<DirectUploadResult> {
  return options.client.uploads.uploadDirect(input);
}

export async function parseDirectUploadBatchFromFormData(
  form: FormData,
  options: DirectUploadHandlerOptions,
): Promise<DirectUploadBatchInput> {
  const fileField = options.fileField ?? DEFAULT_FILE_FIELD;
  const entries = form.getAll(fileField);
  const projectId = resolveProjectId(
    options,
    form.get("projectId")?.toString(),
  );
  const filenameField = form.get("filename");

  if (entries.length === 0) {
    throw new DirectUploadHandlerError(
      400,
      "MISSING_FILE",
      `Missing multipart field "${fileField}".`,
    );
  }

  if (entries.length > 1 && typeof filenameField === "string" && filenameField.trim()) {
    throw new DirectUploadHandlerError(
      400,
      "INVALID_FILENAME",
      'The "filename" form field cannot be used when uploading multiple files.',
    );
  }

  const files: UploadFileInput[] = [];
  for (const entry of entries) {
    files.push(
      await fileFromFormDataEntry(
        entry,
        entries.length === 1 && typeof filenameField === "string"
          ? filenameField
          : null,
      ),
    );
  }

  const isPublic = parseOptionalBooleanFormField(
    form.get("isPublic")?.toString(),
  );

  return {
    projectId,
    files,
    ...(isPublic !== undefined ? { isPublic } : {}),
  };
}

export async function runDirectUploadBatch(
  options: DirectUploadHandlerOptions,
  input: DirectUploadBatchInput,
): Promise<DirectUploadBatchResult> {
  return options.client.uploads.uploadDirectBatch(input);
}

/** Mirrors API compat: single result for one file, `{ files }` for multiple. */
export type DirectUploadHandlerResponse =
  | DirectUploadResult
  | DirectUploadBatchResult;

export async function runDirectUploadCompat(
  options: DirectUploadHandlerOptions,
  input: DirectUploadBatchInput,
): Promise<DirectUploadHandlerResponse> {
  const batch = await runDirectUploadBatch(options, input);
  if (batch.files.length === 1) {
    return batch.files[0]!;
  }
  return batch;
}

export function isDirectUploadHandlerError(
  error: unknown,
): error is DirectUploadHandlerError {
  return error instanceof DirectUploadHandlerError;
}
