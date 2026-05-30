import { DEFAULT_BASE_URL } from "./env.js";
import { FilesResource } from "./files.js";
import { HttpClient } from "./http.js";
import { UploadsResource } from "./uploads.js";
import type { WhoamiResponse } from "./types.js";

export type ReuploadOptions = {
  /** Reupload API key (`ru_…`). Sent as `Authorization: Bearer`. */
  apiKey: string;
  /**
   * API base URL including `/api/v1`.
   * @default https://api.reupload.dev/api/v1
   */
  baseUrl?: string;
  /** Custom fetch implementation (tests, edge runtimes). */
  fetch?: typeof fetch;
  /** Default project UUID for framework route helpers. */
  defaultProjectId?: string;
};

export class Reupload {
  readonly uploads: UploadsResource;
  readonly files: FilesResource;

  private readonly http: HttpClient;
  readonly defaultProjectId?: string;

  constructor(options: ReuploadOptions) {
    const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");

    this.http = new HttpClient({
      baseUrl,
      apiKey: options.apiKey,
      ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
    });

    this.uploads = new UploadsResource(this.http);
    this.files = new FilesResource(this.http);

    if (options.defaultProjectId !== undefined) {
      this.defaultProjectId = options.defaultProjectId;
    }
  }

  /** Verify API key and list accessible projects. */
  async whoami(init?: { signal?: AbortSignal }): Promise<WhoamiResponse> {
    return this.http.request<WhoamiResponse>(
      "GET",
      "/public/whoami",
      init?.signal === undefined ? {} : { signal: init.signal },
    );
  }
}
