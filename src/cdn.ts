import { ReuploadCdnError } from "./errors.js";
import { isReadableStream, toFetchBody } from "./utils/body.js";
import { omitUndefined } from "./utils/request.js";
import type { UploadBody } from "./types.js";

export type PutToUploadUrlOptions = {
  fetch?: typeof fetch;
  signal?: AbortSignal;
};

/**
 * PUT file bytes to the signed CDN URL returned by `uploads.createSession`.
 * This request does not go to the Reupload API.
 */
export async function putToUploadUrl(
  uploadUrl: string,
  body: UploadBody,
  contentType: string,
  options: PutToUploadUrlOptions = {},
): Promise<void> {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const requestBody = toFetchBody(body);

  const init = omitUndefined({
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: requestBody,
    signal: options.signal,
    ...(isReadableStream(body) ? { duplex: "half" as const } : {}),
  }) as RequestInit & { duplex?: "half" };

  const response = await fetchImpl(uploadUrl, init);

  if (!response.ok) {
    throw new ReuploadCdnError(
      response.status,
      `CDN upload failed with status ${response.status}.`,
    );
  }
}
