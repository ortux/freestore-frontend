import { api } from './client';

export type SharePermission = 'VIEW' | 'EDIT' | 'MANAGE';

export interface FileShare {
  id: string;
  fileId: string;
  sharedWithId: string;
  sharedById: string;
  permission: SharePermission;
  expiresAt: string | null;
  createdAt: string;
  file?: { id: string; originalFilename: string; mimeType: string; fileSize: number; createdAt: string };
  sharedWith?: { id: string; githubUsername: string; email: string | null };
  sharedBy?:   { id: string; githubUsername: string; email: string | null };
}

export interface PublicFileLink {
  id: string;
  fileId: string;
  url: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface PublicFileMetadata {
  filename: string;
  mimeType: string;
  size: number;
  expiresAt: string | null;
}

export async function getPublicFileLink(fileId: string): Promise<PublicFileLink | null> {
  const { data } = await api.get(`/shares/file/${fileId}/link`);
  return data.data.link;
}

export async function createPublicFileLink(fileId: string, expiresAt: string | null): Promise<PublicFileLink> {
  const { data } = await api.post(`/shares/file/${fileId}/link`, { expiresAt });
  return data.data.link;
}

export async function revokePublicFileLink(fileId: string): Promise<void> {
  await api.delete(`/shares/file/${fileId}/link`);
}

export async function getPublicFile(token: string): Promise<PublicFileMetadata> {
  const { data } = await api.get(`/public-links/${token}`);
  return data.data.file;
}

export function getPublicFileContentUrl(token: string): string {
  return `/api/v1/public-links/${encodeURIComponent(token)}/content`;
}

export async function listSharedByMe(): Promise<FileShare[]> {
  const { data } = await api.get('/shares/by-me');
  return data.data;
}

export async function listSharedWithMe(): Promise<FileShare[]> {
  const { data } = await api.get('/shares/with-me');
  return data.data;
}

export async function listSharesForFile(fileId: string): Promise<FileShare[]> {
  const { data } = await api.get(`/shares/file/${fileId}`);
  return data.data;
}

export async function shareFile(
  fileId: string,
  payload: { recipientId: string; permission: SharePermission; expiresAt?: string }
): Promise<FileShare> {
  const { data } = await api.post(`/shares/file/${fileId}`, payload);
  return data.data;
}

export async function updateShare(
  shareId: string,
  payload: { permission?: SharePermission; expiresAt?: string | null }
): Promise<FileShare> {
  const { data } = await api.patch(`/shares/${shareId}`, payload);
  return data.data;
}

export async function revokeShare(shareId: string): Promise<void> {
  await api.delete(`/shares/${shareId}`);
}
