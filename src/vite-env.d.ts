interface ImportMetaEnv {
  readonly VITE_API_SANDBOX?: string;
  readonly VITE_MAX_FILE_SIZE_MB?: string;
  readonly VITE_LARGE_FILE_THRESHOLD_MB?: string;
  readonly VITE_CHUNK_SIZE_MB?: string;
  readonly VITE_UPLOAD_CONCURRENCY?: string;
  readonly VITE_UPLOAD_MAX_RETRIES?: string;
  readonly VITE_ALLOWED_MIME_TYPES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
