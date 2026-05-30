import { putToUploadUrl } from "./cdn.js";
import type { HttpClient } from "./http.js";
import {
  buildDirectUploadBatchFormData,
  buildDirectUploadFormData,
  normalizeDirectUploadBatchResponse,
} from "./utils/multipart.js";
import { waitForUploadSession } from "./utils/poll.js";
import { omitUndefined } from "./utils/request.js";
import type {
  CancelUploadSessionResult,
  CdnUploadInput,
  CompleteUploadSessionInput,
  CompleteUploadSessionResult,
  CreateUploadSessionInput,
  CreateUploadSessionResult,
  DirectUploadBatchInput,
  DirectUploadBatchResult,
  DirectUploadInput,
  DirectUploadResponse,
  DirectUploadResult,
  GetUploadSessionResult,
  UploadSession,
  WaitForUploadOptions,
} from "./types.js";

export class UploadsResource {
  constructor(private readonly http: HttpClient) {}

  async createSession(
    input: CreateUploadSessionInput,
    init?: { signal?: AbortSignal },
  ): Promise<CreateUploadSessionResult> {
    return this.http.request<CreateUploadSessionResult>(
      "POST",
      "/uploads/session",
      omitUndefined({
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        signal: init?.signal,
      }),
    );
  }

  async complete(
    input: CompleteUploadSessionInput,
    init?: { signal?: AbortSignal },
  ): Promise<CompleteUploadSessionResult> {
    return this.http.request<CompleteUploadSessionResult>(
      "POST",
      "/uploads/complete",
      omitUndefined({
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        signal: init?.signal,
      }),
    );
  }

  async getSession(
    uploadId: string,
    init?: { signal?: AbortSignal },
  ): Promise<GetUploadSessionResult> {
    return this.http.request<GetUploadSessionResult>(
      "GET",
      `/uploads/session/${uploadId}`,
      omitUndefined({ signal: init?.signal }),
    );
  }

  async cancelSession(
    uploadId: string,
    init?: { signal?: AbortSignal },
  ): Promise<CancelUploadSessionResult> {
    return this.http.request<CancelUploadSessionResult>(
      "DELETE",
      `/uploads/session/${uploadId}`,
      omitUndefined({ signal: init?.signal }),
    );
  }

  /**
   * Server-side direct upload (multipart). Returns `202` with processing status.
   */
  async uploadDirect(
    input: DirectUploadInput,
    init?: { signal?: AbortSignal },
  ): Promise<DirectUploadResult> {
    const form = buildDirectUploadFormData(input);
    return this.http.request<DirectUploadResult>(
      "POST",
      "/uploads/direct",
      omitUndefined({ body: form, signal: init?.signal }),
    );
  }

  /**
   * Server-side direct upload of multiple files in one multipart request.
   * Always returns `{ files: [...] }` regardless of API single-file compat shape.
   */
  async uploadDirectBatch(
    input: DirectUploadBatchInput,
    init?: { signal?: AbortSignal },
  ): Promise<DirectUploadBatchResult> {
    if (input.files.length === 0) {
      throw new Error("At least one file is required for uploadDirectBatch.");
    }

    if (input.files.length === 1) {
      const single = await this.uploadDirect(
        {
          projectId: input.projectId,
          file: input.files[0]!,
          ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
        },
        init,
      );
      return { files: [single] };
    }

    const form = buildDirectUploadBatchFormData(input);
    const body = await this.http.request<DirectUploadResponse>(
      "POST",
      "/uploads/direct",
      omitUndefined({ body: form, signal: init?.signal }),
    );
    return normalizeDirectUploadBatchResponse(body);
  }

  /**
   * CDN flow: create session → PUT to signed URL → complete.
   */
  async upload(
    input: CdnUploadInput,
    init?: { signal?: AbortSignal },
  ): Promise<CompleteUploadSessionResult> {
    const session = await this.createSession(
      {
        projectId: input.projectId,
        filename: input.filename,
        contentType: input.contentType,
        size: input.size,
        ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
      },
      init,
    );

    await putToUploadUrl(
      session.uploadUrl,
      input.file.data,
      input.file.contentType,
      omitUndefined({ signal: init?.signal }),
    );

    return this.complete({ uploadId: session.uploadId }, init);
  }

  async waitForCompletion(
    uploadId: string,
    options: WaitForUploadOptions = {},
  ): Promise<UploadSession> {
    return waitForUploadSession(
      async () => {
        const { session } = await this.getSession(
          uploadId,
          options.signal === undefined ? {} : { signal: options.signal },
        );
        return session;
      },
      options,
    );
  }
}
