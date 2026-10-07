import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSharedByMe, listSharedWithMe, listSharesForFile, shareFile, revokeShare,
  getPublicFileLink, createPublicFileLink, revokePublicFileLink,
  type SharePermission,
} from '../api/shares';
import toast from 'react-hot-toast';

export function useSharedByMe() {
  return useQuery({ queryKey: ['shares-by-me'], queryFn: listSharedByMe });
}

export function useSharedWithMe() {
  return useQuery({ queryKey: ['shares-with-me'], queryFn: listSharedWithMe });
}

export function useSharesForFile(fileId: string) {
  return useQuery({
    queryKey: ['shares-for-file', fileId],
    queryFn: () => listSharesForFile(fileId),
    enabled: !!fileId,
  });
}

export function usePublicFileLink(fileId: string) {
  return useQuery({
    queryKey: ['public-file-link', fileId],
    queryFn: () => getPublicFileLink(fileId),
    enabled: !!fileId,
  });
}

export function useCreatePublicFileLink(fileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expiresAt: string | null) => createPublicFileLink(fileId, expiresAt),
    onSuccess: (link) => {
      qc.setQueryData(['public-file-link', fileId], link);
      qc.invalidateQueries({ queryKey: ['file-activity'] });
      toast.success('Link sharing enabled');
    },
    onError: () => toast.error('Could not create a share link'),
  });
}

export function useRevokePublicFileLink(fileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => revokePublicFileLink(fileId),
    onSuccess: () => {
      qc.setQueryData(['public-file-link', fileId], null);
      qc.invalidateQueries({ queryKey: ['file-activity'] });
      toast.success('Share link revoked');
    },
    onError: () => toast.error('Could not revoke the share link'),
  });
}

export function useShareFile(fileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { recipientId: string; permission: SharePermission; expiresAt?: string }) =>
      shareFile(fileId, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shares-for-file', fileId] });
      qc.invalidateQueries({ queryKey: ['shares-by-me'] });
      toast.success('File shared');
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? 'Failed to share file'),
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => revokeShare(shareId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shares-by-me'] });
      qc.invalidateQueries({ queryKey: ['shares-with-me'] });
      qc.invalidateQueries({ queryKey: ['shares-for-file'] });
      toast.success('Share revoked');
    },
    onError: () => toast.error('Failed to revoke share'),
  });
}
