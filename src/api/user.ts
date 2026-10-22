import { api, authApi } from './client';

export interface UserProfile {
  id: string;
  githubUsername: string;
  email: string | null;
  repositoryName: string | null;
  repositoryOwner: string | null;
  createdAt: string;
  stats: { fileCount: number; totalBytes: number };
}

export interface Repository {
  name: string;
  owner: string;
  url: string;
  size?: number;
  visibility: string;
  encryption: string;
  storageRepositories?: StorageRepository[];
}

export interface StorageRepository {
  id: string;
  name: string;
  owner: string;
  url: string;
  usedBytes: number;
  maxBytes: number;
  status: 'ACTIVE' | 'FULL';
  isPrimary: boolean;
}

export async function getUser(): Promise<UserProfile> {
  const { data } = await api.get('/user');
  return data.data;
}

export async function getRepository(): Promise<Repository> {
  const { data } = await api.get('/user/repository');
  return data.data;
}

export async function logout(): Promise<void> {
  await authApi.post('/auth/logout');
}
