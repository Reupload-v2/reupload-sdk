import { ReuploadError } from "./errors.js";
import { omitUndefined } from "./utils/request.js";

export type HttpClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
};

export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  private resolveUrl(path: string): URL {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return new URL(`${this.baseUrl}${normalizedPath}`);
  }

  async request<T>(
    method: string,
    path: string,
    init?: {
      body?: BodyInit;
      headers?: HeadersInit;
      query?: Record<string, string | number | boolean | undefined>;
      signal?: AbortSignal;
    },
  ): Promise<T> {
    const url = this.resolveUrl(path);

    if (init?.query) {
      for (const [key, value] of Object.entries(init.query)) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
      }
    }

    const headers = new Headers(init?.headers);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.apiKey}`);
    }

    const response = await this.fetchImpl(url, {
      method,
      headers,
      ...omitUndefined({
        body: init?.body,
        signal: init?.signal,
      }),
    });

    if (!response.ok) {
      throw await ReuploadError.fromResponse(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async requestRaw(
    method: string,
    path: string,
    init?: {
      body?: BodyInit;
      headers?: HeadersInit;
      signal?: AbortSignal;
    },
  ): Promise<Response> {
    const url = this.resolveUrl(path);

    const headers = new Headers(init?.headers);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.apiKey}`);
    }

    const response = await this.fetchImpl(url, {
      method,
      headers,
      ...omitUndefined({
        body: init?.body,
        signal: init?.signal,
      }),
    });

    if (!response.ok) {
      throw await ReuploadError.fromResponse(response);
    }

    return response;
  }
}
