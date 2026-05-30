import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDirectUploadBatchFormData,
  buildDirectUploadFormData,
  normalizeDirectUploadBatchResponse,
} from "./multipart.js";

describe("buildDirectUploadFormData", () => {
  it("includes projectId, filename, and file blob", () => {
    const form = buildDirectUploadFormData({
      projectId: "11111111-1111-4111-8111-111111111111",
      file: {
        data: Buffer.from("hello"),
        filename: "hello.txt",
        contentType: "text/plain",
        size: 5,
      },
      filename: "renamed.txt",
    });

    assert.equal(
      form.get("projectId"),
      "11111111-1111-4111-8111-111111111111",
    );
    assert.equal(form.get("filename"), "renamed.txt");

    const file = form.get("file");
    assert.ok(file instanceof Blob);
    assert.equal((file as File).name, "hello.txt");
  });

  it("includes isPublic when true", () => {
    const form = buildDirectUploadFormData({
      projectId: "11111111-1111-4111-8111-111111111111",
      isPublic: true,
      file: {
        data: Buffer.from("hello"),
        filename: "hello.txt",
        contentType: "text/plain",
        size: 5,
      },
    });

    assert.equal(form.get("isPublic"), "true");
  });
});

describe("buildDirectUploadBatchFormData", () => {
  it("appends multiple file parts without a global filename", () => {
    const form = buildDirectUploadBatchFormData({
      projectId: "11111111-1111-4111-8111-111111111111",
      files: [
        {
          data: Buffer.from("a"),
          filename: "a.txt",
          contentType: "text/plain",
          size: 1,
        },
        {
          data: Buffer.from("bb"),
          filename: "b.txt",
          contentType: "text/plain",
          size: 2,
        },
      ],
    });

    assert.equal(
      form.get("projectId"),
      "11111111-1111-4111-8111-111111111111",
    );
    assert.equal(form.get("filename"), null);

    const files = form.getAll("file");
    assert.equal(files.length, 2);
    assert.equal((files[0] as File).name, "a.txt");
    assert.equal((files[1] as File).name, "b.txt");
  });

  it("includes isPublic when true", () => {
    const form = buildDirectUploadBatchFormData({
      projectId: "11111111-1111-4111-8111-111111111111",
      isPublic: true,
      files: [
        {
          data: Buffer.from("a"),
          filename: "a.txt",
          contentType: "text/plain",
          size: 1,
        },
      ],
    });

    assert.equal(form.get("isPublic"), "true");
  });
});

describe("normalizeDirectUploadBatchResponse", () => {
  it("wraps a single-file API response", () => {
    const normalized = normalizeDirectUploadBatchResponse({
      uploadId: "u1",
      fileId: "f1",
      status: "processing",
    });
    assert.deepEqual(normalized, {
      files: [{ uploadId: "u1", fileId: "f1", status: "processing" }],
    });
  });

  it("passes through a multi-file API response", () => {
    const body = {
      files: [
        { uploadId: "u1", fileId: "f1", status: "processing" as const },
        { uploadId: "u2", fileId: "f2", status: "processing" as const },
      ],
    };
    assert.deepEqual(normalizeDirectUploadBatchResponse(body), body);
  });
});
