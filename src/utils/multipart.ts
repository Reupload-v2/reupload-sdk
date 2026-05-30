import { toBlobPart } from "./body.js";
import type {
  DirectUploadBatchInput,
  DirectUploadBatchResult,
  DirectUploadInput,
  DirectUploadResponse,
  DirectUploadResult,
} from "../types.js";

export function buildDirectUploadFormData(
  input: DirectUploadInput,
): FormData {
  const form = new FormData();
  form.set("projectId", input.projectId);

  const filename = input.filename ?? input.file.filename;
  form.set("filename", filename);

  const blob = new Blob([toBlobPart(input.file.data)], {
    type: input.file.contentType,
  });
  form.set("file", blob, input.file.filename);

  if (input.isPublic === true) {
    form.set("isPublic", "true");
  }

  return form;
}

export function buildDirectUploadBatchFormData(
  input: DirectUploadBatchInput,
): FormData {
  const form = new FormData();
  form.set("projectId", input.projectId);

  for (const file of input.files) {
    const blob = new Blob([toBlobPart(file.data)], {
      type: file.contentType,
    });
    form.append("file", blob, file.filename);
  }

  if (input.isPublic === true) {
    form.set("isPublic", "true");
  }

  return form;
}

export function isDirectUploadBatchResponse(
  body: DirectUploadResponse,
): body is DirectUploadBatchResult {
  return "files" in body && Array.isArray(body.files);
}

export function normalizeDirectUploadBatchResponse(
  body: DirectUploadResponse,
): DirectUploadBatchResult {
  if (isDirectUploadBatchResponse(body)) {
    return body;
  }
  return { files: [body] };
}
