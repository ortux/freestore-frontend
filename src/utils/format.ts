export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return formatDate(d);
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function getImageUrl(id: string): string {
  return `/api/v1/images/${id}`;
}

export function getDownloadUrl(id: string): string {
  return `/api/v1/files/${id}`;
}

export function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WEBP',
    'image/gif': 'GIF', 'image/avif': 'AVIF', 'application/pdf': 'PDF',
  };
  return map[mimeType] ?? mimeType.split('/')[1]?.toUpperCase() ?? 'FILE';
}
