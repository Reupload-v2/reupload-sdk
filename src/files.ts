import type { HttpClient } from "./http.js";
import { omitUndefined } from "./utils/request.js";
import type {
  DeleteFileResult,
  FileAccessQuery,
  GetFileAccessResult,
  GetFileResult,
} from "./types.js";

export class FilesResource {
  constructor(private readonly http: HttpClient) {}

  async get(fileId: string, init?: { signal?: AbortSignal }): Promise<GetFileResult> {
    return this.http.request<GetFileResult>(
      "GET",
      `/files/${fileId}`,
      omitUndefined({ signal: init?.signal }),
    );
  }

  async access(
    fileId: string,
    query: FileAccessQuery = {},
    init?: { signal?: AbortSignal },
  ): Promise<GetFileAccessResult> {
    return this.http.request<GetFileAccessResult>(
      "GET",
      `/files/${fileId}/access`,
      omitUndefined({
        query: {
          expiresIn: query.expiresIn,
          variant: query.variant,
          download: query.download,
        },
        signal: init?.signal,
      }),
    );
  }

  async delete(
    fileId: string,
    init?: { signal?: AbortSignal },
  ): Promise<DeleteFileResult> {
    return this.http.request<DeleteFileResult>(
      "DELETE",
      `/files/${fileId}`,
      omitUndefined({ signal: init?.signal }),
    );
  }
}
