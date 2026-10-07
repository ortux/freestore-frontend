import { api } from './client';

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  role?: Role;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  role: Role;
  createdAt: string;
  user: { id: string; githubUsername: string; email: string | null };
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const { data } = await api.get('/workspaces');
  return data.data;
}

export async function getWorkspace(id: string): Promise<Workspace> {
  const { data } = await api.get(`/workspaces/${id}`);
  return data.data;
}

export async function createWorkspace(payload: {
  name: string;
  description?: string;
}): Promise<Workspace> {
  const { data } = await api.post('/workspaces', payload);
  return data.data;
}

export async function updateWorkspace(
  id: string,
  payload: {
    name?: string;
    description?: string;
  }
): Promise<Workspace> {
  const { data } = await api.patch(`/workspaces/${id}`, payload);
  return data.data;
}

export async function deleteWorkspace(id: string): Promise<void> {
  await api.delete(`/workspaces/${id}`);
}

export async function listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data } = await api.get(`/workspaces/${workspaceId}/members`);
  return data.data;
}

export async function inviteMember(
  workspaceId: string,
  payload: { githubUsername?: string; userId?: string; role: Role }
): Promise<WorkspaceMember> {
  const { data } = await api.post(`/workspaces/${workspaceId}/members`, payload);
  return data.data;
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: Role
): Promise<WorkspaceMember> {
  const { data } = await api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role });
  return data.data;
}

export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
}

export async function leaveWorkspace(workspaceId: string): Promise<void> {
  await api.delete(`/workspaces/${workspaceId}/members/me`);
}

