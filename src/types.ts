export type ApiKeyPermission =
  | "files.read"
  | "files.write"
  | "files.delete";

export type ProjectSummary = {
  id: string;
  name: string;
  uploadCorsOrigins: string[];
};

export type WhoamiResponse = {
  apiKeyId: string;
  workspaceId: string;
  name: string;
  permissions: ApiKeyPermission[];
  allProjects: boolean;
  projects: ProjectSummary[];
};

export type UploadSessionStatus =
  | "PENDING"
  | "UPLOADING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type UploadSession = {
  id: string;
  workspaceId: string;
  projectId: string;
  fileId: string;
  status: UploadSessionStatus;
  expectedSize: number;
  expectedMime: string;
  expiresAt: string;
  completedAt: string | null;
  failureReason: string | null;
  createdAt: string;
};

export type CreateUploadSessionInput = {
  projectId: string;
  filename: string;
  contentType: string;
  size: number;
  /** When true, the file is publicly accessible via CDN after processing. Default false. */
  isPublic?: boolean;
};

export type CreateUploadSessionResult = {
  uploadId: string;
  fileId: string;
  uploadUrl: string;
  expiresIn: number;
};

export type CompleteUploadSessionInput = {
  uploadId: string;
};

export type CompleteUploadSessionResult = {
  fileId: string;
  status: "processing";
};

export type DirectUploadResult = {
  uploadId: string;
  fileId: string;
  status: "processing";
};

export type DirectUploadInput = {
  projectId: string;
  file: UploadFileInput;
  /** Overrides the multipart `filename` field when set. */
  filename?: string;
  /** When true, the file is publicly accessible via CDN after processing. Default false. */
  isPublic?: boolean;
};

export type DirectUploadBatchInput = {
  projectId: string;
  files: UploadFileInput[];
  isPublic?: boolean;
};

export type DirectUploadBatchResult = {
  files: DirectUploadResult[];
};

/** API response for multi-file direct upload (2+ files). */
export type DirectUploadMultiResponse = DirectUploadBatchResult;

/** Either single-file or multi-file direct upload JSON body. */
export type DirectUploadResponse =
  | DirectUploadResult
  | DirectUploadMultiResponse;

export type UploadFileInput = {
  data: UploadBody;
  filename: string;
  contentType: string;
  size: number;
};

export type UploadBody =
  | Buffer
  | Uint8Array
  | ArrayBuffer
  | Blob
  | ReadableStream<Uint8Array>;

export type FileCategory = "image" | "video" | "audio" | "document" | "other";

export type FileUploadedVia = "api" | "dashboard" | null;

export type FileUploadedData = {
  fileId: string;
  projectId: string;
  path: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  urlExpiresAt: string | null;
  isPublic: boolean;
};

export type FilePublic = {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: FileCategory;
  isPublic: boolean;
  publicUrl: string | null;
  uploadedVia: FileUploadedVia;
  createdAt: string;
  updatedAt: string;
};

export type FileAccessVariant =
  | "original"
  | "thumb_64"
  | "thumb_160"
  | "thumb_320";

export type FileAccessQuery = {
  expiresIn?: number;
  variant?: FileAccessVariant;
  download?: boolean;
};

export type FileAccess = {
  url: string;
  accessType: "cdn" | "cdn_public";
  expiresIn: number | null;
  variant: FileAccessVariant;
  download: boolean;
};

export type GetUploadSessionResult = {
  session: UploadSession;
  file?: FileUploadedData;
};

export type GetFileResult = {
  file: FilePublic;
};

export type GetFileAccessResult = {
  access: FileAccess;
};

export type CancelUploadSessionResult = {
  success: true;
};

export type DeleteFileResult = {
  success: true;
};

export type CdnUploadInput = CreateUploadSessionInput & {
  file: UploadFileInput;
};

export type WaitForUploadOptions = {
  /** Poll interval in ms. Default `500`. */
  intervalMs?: number;
  /** Max wait in ms. Default `120_000`. */
  timeoutMs?: number;
  signal?: AbortSignal;
};
