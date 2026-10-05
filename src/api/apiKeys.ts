import { api } from './client';

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  lastUsed: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface NewApiKeyResponse {
  key: string; // plaintext — shown only once
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  expiresAt: string | null;
}

export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  const { data } = await api.get('/api-keys');
  return data.data;
}

export async function createApiKey(
  name: string,
  expiresAt?: string
): Promise<NewApiKeyResponse> {
  const { data } = await api.post('/api-keys', { name, expiresAt });
  return data.data;
}

export async function deleteApiKey(id: string): Promise<void> {
  await api.delete(`/api-keys/${id}`);
}
