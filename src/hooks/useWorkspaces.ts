import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listWorkspaces, createWorkspace, deleteWorkspace,
  listMembers, inviteMember, updateMemberRole, removeMember,
  type Role,
} from '../api/workspaces';
import toast from 'react-hot-toast';

export function useWorkspaces() {
  return useQuery({ queryKey: ['workspaces'], queryFn: listWorkspaces });
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => listMembers(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workspaces'] }); toast.success('Workspace created'); },
    onError: () => toast.error('Failed to create workspace'),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workspaces'] }); toast.success('Workspace deleted'); },
    onError: () => toast.error('Failed to delete workspace'),
  });
}

export function useInviteMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { githubUsername?: string; userId?: string; role: Role }) =>
      inviteMember(workspaceId, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workspace-members', workspaceId] }); toast.success('Member invited'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? 'Failed to invite member'),
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      updateMemberRole(workspaceId, userId, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workspace-members', workspaceId] }); toast.success('Role updated'); },
    onError: () => toast.error('Failed to update role'),
  });
}

export function useRemoveMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workspace-members', workspaceId] }); toast.success('Member removed'); },
    onError: () => toast.error('Failed to remove member'),
  });
}

