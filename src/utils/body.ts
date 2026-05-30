import type { UploadBody } from "../types.js";

export function toBlobPart(body: UploadBody): BlobPart {
  if (Buffer.isBuffer(body)) {
    return Uint8Array.from(body);
  }

  if (body instanceof Uint8Array) {
    return Uint8Array.from(body);
  }

  if (body instanceof ArrayBuffer) {
    return body;
  }

  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return body;
  }

  return body as BlobPart;
}

export function isReadableStream(
  body: UploadBody,
): body is ReadableStream<Uint8Array> {
  return typeof body === "object" && body !== null && "getReader" in body;
}

export function toFetchBody(body: UploadBody): BodyInit {
  if (isReadableStream(body)) {
    return body;
  }

  if (Buffer.isBuffer(body)) {
    return Uint8Array.from(body);
  }

  return body as BodyInit;
}
