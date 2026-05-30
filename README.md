# @reupload/sdk

Official **server-side** Node.js SDK for the [Reupload](https://reupload.dev) public API.

- TypeScript-first with full type exports
- Zero runtime dependencies (Node 20.9+, native `fetch` and `FormData`)
- CDN client upload flow (session → PUT → complete) and server direct multipart upload
- Route helpers for **Next.js** (App + Pages), **Express**, **Fastify**, **H3** / Nitro, and **SolidStart**

## Install

```bash
npm install @reupload/sdk
```

## Quick start

```ts
import { createReuploadFromEnv } from "@reupload/sdk";

const reupload = createReuploadFromEnv();

const me = await reupload.whoami();
console.log(me.projects);
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REUPLOAD_API_KEY` | Yes | API key (`ru_…`) |
| `REUPLOAD_PROJECT_ID` | Yes | Default project UUID for uploads and route helpers |
| `REUPLOAD_API_BASE_URL` | No | Default `https://api.reupload.dev/api/v1` |

### Manual client

```ts
import { Reupload } from "@reupload/sdk";

const reupload = new Reupload({
  apiKey: process.env.REUPLOAD_API_KEY!,
  defaultProjectId: process.env.REUPLOAD_PROJECT_ID,
});
```

## API overview

| Method | Description |
|--------|-------------|
| `reupload.whoami()` | Verify key and list projects |
| `reupload.uploads.createSession()` | Start CDN upload session |
| `putToUploadUrl(url, body, contentType)` | PUT bytes to signed CDN URL |
| `reupload.uploads.complete()` | Finalize CDN upload |
| `reupload.uploads.upload()` | Session + CDN PUT + complete in one call |
| `reupload.uploads.uploadDirect()` | Server multipart direct upload (single file) |
| `reupload.uploads.uploadDirectBatch()` | Multiple files in one multipart request |
| `reupload.uploads.getSession()` | Poll session status |
| `reupload.uploads.waitForCompletion()` | Poll until `COMPLETED` |
| `reupload.files.get()` | File metadata |
| `reupload.files.access()` | Signed download URL |
| `reupload.files.delete()` | Delete file |

### CDN upload (from your server)

```ts
import { createReuploadFromEnv, putToUploadUrl } from "@reupload/sdk";
import { readFile } from "node:fs/promises";

const reupload = createReuploadFromEnv();
const bytes = await readFile("./photo.jpg");

const session = await reupload.uploads.createSession({
  projectId: process.env.REUPLOAD_PROJECT_ID!,
  filename: "photo.jpg",
  contentType: "image/jpeg",
  size: bytes.length,
  isPublic: true, // optional — enable public CDN link after processing
});

await putToUploadUrl(session.uploadUrl, bytes, "image/jpeg");

const done = await reupload.uploads.complete({ uploadId: session.uploadId });
console.log(done.fileId);
```

Or use the combined helper:

```ts
const done = await reupload.uploads.upload({
  projectId: process.env.REUPLOAD_PROJECT_ID!,
  filename: "photo.jpg",
  contentType: "image/jpeg",
  size: bytes.length,
  file: {
    data: bytes,
    filename: "photo.jpg",
    contentType: "image/jpeg",
    size: bytes.length,
  },
});
```

### Direct upload (multipart to Reupload API)

```ts
const result = await reupload.uploads.uploadDirect({
  projectId: process.env.REUPLOAD_PROJECT_ID!,
  isPublic: true, // optional — sent as multipart field `isPublic=true`
  file: {
    data: bytes,
    filename: "photo.jpg",
    contentType: "image/jpeg",
    size: bytes.length,
  },
});
// { uploadId, fileId, status: "processing" }
```

### Direct upload (multiple files)

```ts
const { files } = await reupload.uploads.uploadDirectBatch({
  projectId: process.env.REUPLOAD_PROJECT_ID!,
  files: [fileA, fileB],
});
```

Express: use `upload.array("file")` with `createExpressMulterArrayDirectUploadHandler` from `@reupload/sdk/express`.

## Framework route helpers

All helpers accept multipart `projectId`, `file`, optional `filename`, and optional `isPublic` fields (same as the HTTP API).

### Next.js App Router

```ts
// app/api/upload/route.ts
import { createReuploadFromEnv } from "@reupload/sdk";
import { handleNextDirectUpload } from "@reupload/sdk/next";

const client = createReuploadFromEnv();

export async function POST(request: Request) {
  return handleNextDirectUpload(request, { client });
}
```

### Next.js Pages Router

Use `multer` or `formidable`, then:

```ts
import { handleNextPagesDirectUpload } from "@reupload/sdk/next";

const { status, body } = await handleNextPagesDirectUpload({
  client,
  projectId: req.body.projectId,
  file: {
    buffer: uploaded.buffer,
    originalFilename: uploaded.originalFilename,
    mimetype: uploaded.mimetype,
    size: uploaded.size,
  },
});
res.status(status).json(body);
```

### Express (+ multer)

```ts
import multer from "multer";
import { createReuploadFromEnv } from "@reupload/sdk";
import { createExpressMulterDirectUploadHandler } from "@reupload/sdk/express";

const upload = multer({ storage: multer.memoryStorage() });
const client = createReuploadFromEnv();

app.post(
  "/api/upload",
  upload.single("file"),
  createExpressMulterDirectUploadHandler({
    client,
    getFile: (req) => req.file,
  }),
);
```

### Fastify (+ @fastify/multipart)

```ts
import { createReuploadFromEnv } from "@reupload/sdk";
import { createFastifyDirectUploadHandler } from "@reupload/sdk/fastify";

const client = createReuploadFromEnv();

app.post(
  "/api/upload",
  createFastifyDirectUploadHandler({
    client,
    async getFile(request) {
      const part = await request.file();
      if (!part) return undefined;
      const buffer = await part.toBuffer();
      return {
        buffer,
        filename: part.filename,
        mimetype: part.mimetype,
        size: buffer.length,
      };
    },
    getProjectId: (request) => {
      const body = request.body as { projectId?: string };
      return body.projectId;
    },
  }),
);
```

### H3 / Nitro

```ts
import { createReuploadFromEnv } from "@reupload/sdk";
import { handleH3DirectUpload } from "@reupload/sdk/h3";

const client = createReuploadFromEnv();

export default defineEventHandler((event) =>
  handleH3DirectUpload(event, { client }),
);
```

### SolidStart

```ts
import { handleSolidDirectUpload } from "@reupload/sdk/solid";
// Same usage as H3 — SolidStart API routes use the Web Request API.
```

## Errors

```ts
import { isReuploadError, isReuploadCdnError } from "@reupload/sdk";

try {
  await reupload.files.get("…");
} catch (error) {
  if (isReuploadError(error)) {
    console.error(error.status, error.code, error.message);
  }
}
```

- `ReuploadError` — Reupload API (`{ error, message }` JSON body)
- `ReuploadCdnError` — failed PUT to the signed CDN URL
- `DirectUploadHandlerError` — invalid multipart input in route helpers (`@reupload/sdk/next`, etc.)

## Subpath exports

| Import | Use |
|--------|-----|
| `@reupload/sdk` | Core client |
| `@reupload/sdk/next` | Next.js |
| `@reupload/sdk/express` | Express |
| `@reupload/sdk/fastify` | Fastify |
| `@reupload/sdk/h3` | H3 / Nitro |
| `@reupload/sdk/solid` | SolidStart (re-exports H3 helpers) |

## Development

```bash
cd node-packages/sdk
npm install
npm run typecheck
npm test
npm run build
```

## License

MIT
