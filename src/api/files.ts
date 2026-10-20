import axios from 'axios';
import { api } from './client';

export interface FileRecord {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  status: string;
  checksum: string;
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
  sortOrder: number;
  url?: string;
}

export interface FolderRecord {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileActivityRecord {
  id: string;
  userId: string;
  fileId: string | null;
  action: 'UPLOAD' | 'RENAME' | 'MOVE' | 'REORDER' | 'DELETE' | 'SHARE' | 'UNSHARE';
  fileName: string;
  createdAt: string;
}

export interface FilesResponse {
  files: FileRecord[];
  total: number;
  limit: number;
  offset: number;
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listFiles(params?: {
  search?: string;
  mimeType?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  folderId?: string;
}): Promise<FilesResponse> {
  const { data } = await api.get('/files', { params });
  return data.data;
}

export async function listFolders(): Promise<FolderRecord[]> {
  const { data } = await api.get('/folders');
  return data.data.folders;
}

export async function createFolder(payload: { name: string; parentId: string | null }): Promise<FolderRecord> {
  const { data } = await api.post('/folders', payload);
  return data.data.folder;
}

export async function updateFolder(id: string, payload: { name?: string; parentId?: string | null; sortOrder?: number }): Promise<FolderRecord> {
  const { data } = await api.patch(`/folders/${id}`, payload);
  return data.data.folder;
}

export async function deleteFolder(id: string): Promise<void> {
  await api.delete(`/folders/${id}`);
}

export async function listFileActivity(limit = 20): Promise<FileActivityRecord[]> {
  const { data } = await api.get('/activity', { params: { limit } });
  return data.data.activities;
}

export async function moveFile(id: string, folderId: string | null): Promise<FileRecord> {
  const { data } = await api.patch(`/files/${id}/move`, { folderId });
  return data.data.file as FileRecord;
}

export async function reorderFiles(fileIds: string[], folderId: string | null): Promise<void> {
  await api.put('/files/reorder', { fileIds, folderId });
}

// ── Tokenized upload flow ────────────────────────────────────────────────────

export interface InitiateUploadResponse {
  uploadId: string;
  uploadUrl: string;
  token: string;
  expiresAt: string;
  expiresInSeconds: number;
  filename: string;
  mimeType: string;
  fileSize: number;
}

export interface ResumableUpload {
  id: string;
  fileId: string;
  chunkSize: number;
  totalChunks: number;
  expiresAt: string;
  originalFilename: string;
  fileSize: number;
  status: string;
  chunkUploadUrl: string;
  chunkUploadToken: string;
}

export interface ResumableUploadStatus {
  uploadId: string;
  fileId: string;
  filename: string;
  fileSize: number;
  chunkSize: number;
  status: string;
  totalChunks: number;
  uploadedChunks: number[];
  uploadedBytes: number;
  chunks: Array<{ chunkIndex: number; originalSize: number; checksum: string }>;
  expiresAt: string;
  chunkUploadUrl: string;
  chunkUploadToken: string;
}

export async function createUpload(file: File, folderId: string | null = null): Promise<ResumableUpload> {
  const { data } = await api.post('/uploads', {
    filename: file.name,
    mimeType: file.type,
    fileSize: file.size,
    folderId,
  });
  return {
    ...data.data.upload,
    chunkUploadUrl: data.data.chunkUploadUrl,
    chunkUploadToken: data.data.chunkUploadToken,
  };
}

export async function getResumableUploadStatus(uploadId: string): Promise<ResumableUploadStatus> {
  const { data } = await api.get(`/uploads/${uploadId}/status`);
  return data.data;
}

export interface ResumableUploadSession {
  id: string;
  fileId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export async function listResumableUploads(): Promise<ResumableUploadSession[]> {
  const { data } = await api.get('/uploads');
  return data.data.uploads;
}

export async function uploadChunk(
  chunkUploadUrl: string,
  token: string,
  index: number,
  chunk: Blob,
  signal?: AbortSignal,
): Promise<void> {
  await axios.put(`${chunkUploadUrl}/${index}`, chunk, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
    },
    signal,
    withCredentials: false,
  });
}

export async function completeUpload(uploadId: string): Promise<FileRecord> {
  const { data } = await api.post(`/uploads/${uploadId}/complete`);
  return data.data.file as FileRecord;
}

export interface UploadStatus {
  uploadId: string;
  status: 'waiting' | 'in_progress' | 'complete' | 'failed' | 'deleted';
  rawStatus: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  url?: string;
}

/**
 * Step 1 — ask the backend for a signed upload token + URL.
 * Requests a short-lived upload token and URL from the GitHub-backed API.
 */
export async function initiateUpload(file: File, folderId: string | null = null): Promise<InitiateUploadResponse> {
  const { data } = await api.post('/uploads/initiate', {
    filename: file.name,
    mimeType: file.type,
    fileSize: file.size,
    folderId,
  });
  return data.data;
}

/**
 * Step 2 — PUT raw file bytes to the presigned URL using the upload token.
 * Sends raw file bytes to the temporary upload URL.
 *
 * The token is sent as Authorization: Bearer <token> — NOT the session cookie.
 * Progress is reported via onProgress(0–100).
 */
export async function executeUpload(
  uploadUrl: string,
  token: string,
  file: File,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<FileRecord> {
  const { data } = await axios.put(uploadUrl, file, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'Content-Length': String(file.size),
    },
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
    },
    signal,
    // Axios default withCredentials does not apply here — auth is via Bearer token
    withCredentials: false,
  });
  return data.data.file as FileRecord;
}

/**
 * Combined helper — initiates then executes in one call.
 * Use this for simple uploads. Use initiate + execute separately
 * if you need to store the token for resumable behaviour.
 */
export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
  folderId: string | null = null,
): Promise<FileRecord> {
  // Phase 1: get presigned token (0–5% of progress bar)
  onProgress?.(0);
  const initiated = await initiateUpload(file, folderId);
  onProgress?.(5);

  // Phase 2: PUT raw bytes to presigned URL (5–100%)
  const scaledProgress = (pct: number) => onProgress?.(5 + Math.round(pct * 0.95));
  return executeUpload(initiated.uploadUrl, initiated.token, file, scaledProgress, signal);
}

/**
 * Abort a pending upload that hasn't been executed yet.
 * Aborts a pending upload.
 */
export async function abortUpload(uploadId: string): Promise<void> {
  await api.delete(`/uploads/${uploadId}`);
}

/**
 * Poll upload status — useful for resumable UI.
 * Reads the current upload status.
 */
export async function getUploadStatus(uploadId: string): Promise<UploadStatus> {
  const { data } = await api.get(`/uploads/${uploadId}/status`);
  return data.data;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteFile(id: string): Promise<void> {
  await api.delete(`/files/${id}`);
}

export async function renameFile(id: string, filename: string): Promise<FileRecord> {
  const { data } = await api.patch(`/files/${id}`, { filename });
  return data.data.file as FileRecord;
}

// ── URL helpers ───────────────────────────────────────────────────────────────

export function getImageUrl(id: string): string {
  return `/api/v1/images/${id}`;
}

export function getDownloadUrl(id: string): string {
  return `/api/v1/files/${id}`;
}
