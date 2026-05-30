/**
 * SolidStart API routes run on Vinxi/Nitro and use the same H3-style
 * `event.request` + `formData()` pattern as Nitro.
 */
export {
  createH3DirectUploadHandler as createSolidDirectUploadHandler,
  handleH3DirectUpload as handleSolidDirectUpload,
  handleH3DirectUploadResponse as handleSolidDirectUploadResponse,
} from "./h3.js";

export type {
  DirectUploadHandlerOptions as SolidDirectUploadHandlerOptions,
  H3DirectUploadHandlerOptions,
  H3EventLike as SolidEventLike,
} from "./h3.js";

export {
  DirectUploadHandlerError,
  isDirectUploadHandlerError,
} from "./h3.js";
