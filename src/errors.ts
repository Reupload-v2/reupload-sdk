export type ReuploadErrorBody = {
  error: string;
  message: string;
};

export class ReuploadError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ReuploadError";
    this.status = status;
    this.code = code;
  }

  static async fromResponse(response: Response): Promise<ReuploadError> {
    let code = "UNKNOWN";
    let message = `Request failed with status ${response.status}.`;

    try {
      const body = (await response.json()) as Partial<ReuploadErrorBody>;
      if (typeof body.error === "string") code = body.error;
      if (typeof body.message === "string") message = body.message;
    } catch {
      // Non-JSON error bodies are ignored.
    }

    return new ReuploadError(response.status, code, message);
  }
}

/** Thrown when a signed CDN PUT fails (not a Reupload API error). */
export class ReuploadCdnError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ReuploadCdnError";
    this.status = status;
  }
}

export function isReuploadError(error: unknown): error is ReuploadError {
  return error instanceof ReuploadError;
}

export function isReuploadCdnError(error: unknown): error is ReuploadCdnError {
  return error instanceof ReuploadCdnError;
}
