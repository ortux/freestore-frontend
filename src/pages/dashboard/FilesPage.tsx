import { useMemo, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Download, Trash2, Copy, Share2,
  Eye, Files, X, FileText, Grid2X2, List,
  CheckSquare, Square, Folder, Upload, ArrowUpRight,
  HardDrive, FileImage, Sparkles, FolderPlus, Pencil, FolderMinus,
  Globe, Link2, Users, RotateCw,
} from 'lucide-react';
import {
  useFiles, useDeleteFile, useRenameFile, useFolders, useFileActivity,
  useCreateFolder, useUpdateFolder, useDeleteFolder, useMoveFile, useReorderFiles,
} from '../../hooks/useFiles';
import {
  useShareFile, useSharesForFile, useRevokeShare, useSharedWithMe,
  usePublicFileLink, useCreatePublicFileLink, useRevokePublicFileLink,
} from '../../hooks/useShares';
import { getImageUrl, getDownloadUrl, type FileRecord, type FolderRecord } from '../../api/files';
import { formatBytes, formatDate, isImage } from '../../utils/format';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRow } from '../../components/ui/Skeleton';
import type { SharePermission } from '../../api/shares';
import toast from 'react-hot-toast';

const PERM_BADGE: Record<SharePermission, string> = {
  VIEW: 'badge-gray',
  EDIT: 'badge-amber',
  MANAGE: 'badge-blue',
};

const FILTER_TABS = [
  { id: 'all', label: 'All files' },
  { id: 'images', label: 'Images' },
  { id: 'pdfs', label: 'PDFs' },
  { id: 'recent', label: 'Recent' },
] as const;

type ViewMode = 'grid' | 'list';
type TabId = 'all' | 'images' | 'pdfs' | 'recent';

type RenameTarget = {
  id: string;
  name: string;
};

function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

function getFileIcon(file: FileRecord) {
  if (isImage(file.mimeType)) return <FileImage className="w-4 h-4 text-sky-400" />;
  if (isPdf(file.mimeType)) return <FileText className="w-4 h-4 text-red-400" />;
  return <Files className="w-4 h-4 text-[#666]" />;
}

export default function FilesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [mime, setMime] = useState('');
  const [sort, setSort] = useState('sortOrder:asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<FileRecord | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<'restricted' | 'link'>('restricted');
  const [linkExpiryDays, setLinkExpiryDays] = useState('');
  const [recipient, setRecipient] = useState('');
  const [perm, setPerm] = useState<SharePermission>('VIEW');
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [folderTarget, setFolderTarget] = useState<FolderRecord | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');

  const { data: sharedWithMe = [] } = useSharedWithMe();
  const [sortBy, sortOrder] = sort.split(':') as [string, 'asc' | 'desc'];
  const activeFolderId = activeTab === 'recent' ? undefined : currentFolderId;
  const { data, isLoading } = useFiles({ search, mimeType: mime, folderId: activeFolderId, sortBy, sortOrder, limit: 1000 });
  const { data: folders = [] } = useFolders();
  const { data: recentActivity = [] } = useFileActivity(8);
  const deleteFile = useDeleteFile();
  const renameFileMutation = useRenameFile();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const moveFile = useMoveFile();
  const reorderFiles = useReorderFiles();
  const shareFile = useShareFile(shareId ?? '');
  const { data: shares = [] } = useSharesForFile(shareId ?? '');
  const revokeShare = useRevokeShare();
  const { data: publicLink, isLoading: publicLinkLoading } = usePublicFileLink(shareId ?? '');
  const createPublicLink = useCreatePublicFileLink(shareId ?? '');
  const revokePublicLink = useRevokePublicFileLink(shareId ?? '');

  const files = data?.files ?? [];
  const orderedFolders = useMemo(() => {
    const byParent = new Map<string | null, FolderRecord[]>();
    for (const folder of folders) {
      const siblings = byParent.get(folder.parentId) ?? [];
      siblings.push(folder);
      byParent.set(folder.parentId, siblings);
    }
    for (const siblings of byParent.values()) {
      siblings.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }
    const result: FolderRecord[] = [];
    const visit = (parentId: string | null) => {
      for (const folder of byParent.get(parentId) ?? []) {
        result.push(folder);
        visit(folder.id);
      }
    };
    visit(null);
    return result;
  }, [folders]);

  const visibleFiles = useMemo(() => {
    const base = [...files].filter((file) => {
      const matchesTab = (() => {
        if (activeTab === 'images') return isImage(file.mimeType);
        if (activeTab === 'pdfs') return isPdf(file.mimeType);
        if (activeTab === 'recent') return new Date(file.createdAt).getTime() > Date.now() - 1000 * 60 * 60 * 24 * 7;
        return true;
      })();

      if (!matchesTab) return false;
      if (!search.trim()) return true;

      const query = search.toLowerCase();
      return file.filename.toLowerCase().includes(query) || file.mimeType.toLowerCase().includes(query);
    });

    base.sort((a, b) => {
      if (sortBy === 'sortOrder') return a.sortOrder - b.sortOrder;
      const direction = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'fileSize') return (a.size - b.size) * direction;
      if (sortBy === 'originalFilename') return a.filename.localeCompare(b.filename) * direction;
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return (aDate - bDate) * direction;
    });

    return base;
  }, [activeTab, files, search, sortBy, sortOrder]);

  const filteredFiles = visibleFiles;

  const totalStorage = files.reduce((sum, file) => sum + file.size, 0);
  const imageCount = files.filter((file) => isImage(file.mimeType)).length;
  const pdfCount = files.filter((file) => isPdf(file.mimeType)).length;

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFiles.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredFiles.map((file) => file.id));
  };

  const bulkDeleteSelected = async () => {
    if (!selectedIds.length) return;
    const ids = [...selectedIds];
    for (const id of ids) {
      await deleteFile.mutateAsync(id);
    }
    setSelectedIds([]);
  };

  const copyUrl = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/api/v1/images/${id}`);
      toast.success('Public image URL copied');
    } catch {
      toast.error('Unable to copy URL');
    }
  };

  const copyShareLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied');
    } catch {
      toast.error('Unable to copy share link');
    }
  };

  const displayedFileIds = filteredFiles.map((file) => file.id);
  const canReorder = sortBy === 'sortOrder' && activeTab === 'all' && !search.trim() && !mime;
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));

  const handleFileDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('application/file-id');
    const fromIndex = displayedFileIds.indexOf(draggedId);
    const toIndex = displayedFileIds.indexOf(targetId);
    if (!draggedId || fromIndex < 0 || toIndex < 0 || draggedId === targetId) return;
    const nextOrder = [...displayedFileIds];
    nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, draggedId);
    reorderFiles.mutate({ fileIds: nextOrder, folderId: currentFolderId === 'root' ? null : currentFolderId });
  };

  const handleDropOnFolder = (event: DragEvent, folderId: string | null) => {
    event.preventDefault();
    const fileId = event.dataTransfer.getData('application/file-id');
    const draggedFolderId = event.dataTransfer.getData('application/folder-id');
    if (fileId) {
      moveFile.mutate({ id: fileId, folderId });
    } else if (draggedFolderId && draggedFolderId !== folderId) {
      updateFolder.mutate({ id: draggedFolderId, parentId: folderId });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">Drive</p>
          <h1 className="text-xl font-semibold text-[#ededed]">My files</h1>
        </div>

        <div className="flex items-center gap-2 self-start xl:self-auto">
          <button className="btn-secondary btn-sm" onClick={() => navigate('/dashboard/upload')}>
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
          <button className="btn-primary btn-sm" onClick={() => navigate('/dashboard/upload')}>
            <ArrowUpRight className="w-3.5 h-3.5" />
            New upload
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="stat-card">
          <div className="stat-label"><Files className="w-3.5 h-3.5" />Files</div>
          <div className="stat-value">{files.length}</div>
          <div className="stat-sub">Across your secure GitHub storage</div>
        </div>

        <div className="stat-card">
          <div className="stat-label"><HardDrive className="w-3.5 h-3.5" />Storage used</div>
          <div className="stat-value">{formatBytes(totalStorage)}</div>
          <div className="stat-sub">Encrypted and synced to GitHub</div>
        </div>

        <div className="stat-card">
          <div className="stat-label"><Sparkles className="w-3.5 h-3.5" />Previewable</div>
          <div className="stat-value">{imageCount + pdfCount}</div>
          <div className="stat-sub">{imageCount} images · {pdfCount} PDFs</div>
        </div>
      </div>

      <div className="card p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={activeTab === id ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
              <input
                className="input pl-8 text-xs"
                placeholder="Search files…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select className="select text-xs w-[150px]" value={mime} onChange={(e) => setMime(e.target.value)}>
              <option value="">All types</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/png">PNG</option>
              <option value="image/webp">WebP</option>
              <option value="image/gif">GIF</option>
              <option value="application/pdf">PDF</option>
            </select>

            <select className="select text-xs w-[160px]" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="sortOrder:asc">Manual order</option>
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="fileSize:desc">Largest first</option>
              <option value="fileSize:asc">Smallest first</option>
              <option value="originalFilename:asc">Name A→Z</option>
            </select>

            <div className="inline-flex rounded-md border border-[#2e2e2e] bg-[#0a0a0a] p-0.5">
              <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}>
                <Grid2X2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-[#2e2e2e] bg-[#0d0d0d] px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#666]">{selectedIds.length} selected</p>
            <div className="flex items-center gap-2">
              <button className="btn-secondary btn-sm" onClick={() => setSelectedIds([])}>Clear</button>
              <button className="btn-secondary btn-sm" onClick={bulkDeleteSelected}><Trash2 className="w-3.5 h-3.5" />Delete</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="card p-3 h-fit">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#555]">Folders</span>
            <button className="btn-ghost btn-sm" title="Create folder" onClick={() => { setFolderTarget(null); setNewFolderName(''); setCreatingFolder(true); }}>
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {[
              { id: 'root', name: 'My Drive', icon: Folder },
              { id: 'recent', name: 'Recent', icon: Sparkles },
              { id: 'shared', name: 'Shared with me', icon: Share2 },
            ].map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  if (id === 'shared') navigate('/dashboard/shared');
                  else if (id === 'recent') setActiveTab('recent');
                  else { setActiveTab('all'); setCurrentFolderId('root'); }
                }}
                className={currentFolderId === id ? 'sidebar-item-active' : 'sidebar-item'}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => id === 'root' && handleDropOnFolder(event, null)}
              >
                <Icon className="w-4 h-4" />
                {name}
              </button>
            ))}
          </div>

          <div className="divider my-3" />
          <div className="space-y-1">
            {orderedFolders.map((folder) => {
              let depth = 0;
              let parentId = folder.parentId;
              while (parentId) {
                depth += 1;
                parentId = folderById.get(parentId)?.parentId ?? null;
              }
              return (
                <div key={folder.id} className="flex items-center gap-1 group" style={{ paddingLeft: `${Math.min(depth, 5) * 12}px` }}>
                  <button
                    onClick={() => { setActiveTab('all'); setCurrentFolderId(folder.id); }}
                    className={`sidebar-item flex-1 min-w-0 ${currentFolderId === folder.id ? 'sidebar-item-active' : ''}`}
                    draggable={canReorder}
                    onDragStart={(event) => event.dataTransfer.setData('application/folder-id', folder.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDropOnFolder(event, folder.id)}
                  >
                    <Folder className="w-4 h-4 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <button
                    className="btn-icon btn-sm opacity-0 group-hover:opacity-100"
                    title="Rename folder"
                    onClick={() => { setFolderTarget(folder); setNewFolderName(folder.name); }}
                  ><Pencil className="w-3 h-3" /></button>
                  <button
                    className="btn-icon btn-sm opacity-0 group-hover:opacity-100 hover:text-red-400"
                    title="Delete folder"
                    onClick={() => deleteFolder.mutate(folder.id, { onSuccess: () => { if (currentFolderId === folder.id) setCurrentFolderId('root'); } })}
                  ><FolderMinus className="w-3 h-3" /></button>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="space-y-4">
          {isLoading ? (
            <div className="card p-4"><SkeletonRow /></div>
          ) : filteredFiles.length === 0 ? (
            <div className="card p-10">
              <EmptyState icon={Folder} title="No files match your filters" description="Try another search, switch tabs, or upload a new file." />
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredFiles.map((file) => {
                const selected = selectedIds.includes(file.id);
                return (
                  <div
                    key={file.id}
                    className="card hover:border-[#444] transition-colors overflow-hidden group"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/file-id', file.id);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleFileDrop(event, file.id)}
                  >
                    <div className="relative">
                      <div className="absolute left-2 top-2 z-10">
                        <button onClick={() => toggleSelection(file.id)} className="bg-black/60 rounded p-1 border border-[#2e2e2e]">
                          {selected ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <Square className="w-3.5 h-3.5 text-[#d0d0d0]" />}
                        </button>
                      </div>

                      <div className="h-36 border-b border-[#2e2e2e] bg-[#0a0a0a] cursor-pointer overflow-hidden" onClick={() => (isImage(file.mimeType) || isPdf(file.mimeType)) && setPreview(file)}>
                        {isImage(file.mimeType) ? (
                          <img src={getImageUrl(file.id)} alt={file.filename} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            {isPdf(file.mimeType) ? (
                              <div className="flex flex-col items-center gap-2 text-red-400">
                                <FileText className="w-8 h-8" />
                                <span className="text-[10px] uppercase tracking-[0.18em]">PDF</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-[#666]">
                                <Files className="w-8 h-8" />
                                <span className="text-[10px] uppercase tracking-[0.18em]">File</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#ededed]">{file.filename}</p>
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#555]">
                            {getFileIcon(file)}
                            <span>{file.mimeType}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#555]">
                        <span>{formatBytes(file.size)}</span>
                        <span>{formatDate(file.createdAt)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {(isImage(file.mimeType) || isPdf(file.mimeType)) && (
                          <button className="btn-secondary btn-sm flex-1" onClick={() => setPreview(file)}>
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                          </button>
                        )}
                        <a href={getDownloadUrl(file.id)} download className="btn-secondary btn-sm flex-1">
                          <Download className="w-3.5 h-3.5" />
                          Save
                        </a>
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-icon btn-sm" onClick={() => setRenameTarget({ id: file.id, name: file.filename })} title="Rename">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button className="btn-icon btn-sm" onClick={() => copyUrl(file.id)} title="Copy URL">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button className="btn-icon btn-sm" onClick={() => { setShareId(file.id); setShareMode('restricted'); }} title="Share">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button className="btn-icon btn-sm hover:text-red-400" onClick={() => setDelId(file.id)} title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header w-10">
                      <button onClick={toggleSelectAll} className="flex items-center justify-center w-full">
                        {selectedIds.length === filteredFiles.length && filteredFiles.length > 0 ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <Square className="w-3.5 h-3.5 text-[#666]" />}
                      </button>
                    </th>
                    <th className="table-header text-left">Name</th>
                    <th className="table-header text-left hidden md:table-cell">Type</th>
                    <th className="table-header text-left hidden lg:table-cell">Size</th>
                    <th className="table-header text-left hidden xl:table-cell">Modified</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => {
                    const selected = selectedIds.includes(file.id);
                    return (
                      <tr key={file.id} className="table-row" draggable={canReorder} onDragStart={(event) => { event.dataTransfer.setData('application/file-id', file.id); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleFileDrop(event, file.id)}>
                        <td className="table-cell w-10">
                          <button onClick={() => toggleSelection(file.id)} className="flex items-center justify-center w-full">
                            {selected ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <Square className="w-3.5 h-3.5 text-[#666]" />}
                          </button>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center shrink-0">{getFileIcon(file)}</div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-[#ccc]">{file.filename}</p>
                              <p className="text-[10px] text-[#555]">{file.status}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell hidden md:table-cell text-xs text-[#666]">{file.mimeType}</td>
                        <td className="table-cell hidden lg:table-cell text-xs text-[#666]">{formatBytes(file.size)}</td>
                        <td className="table-cell hidden xl:table-cell text-xs text-[#666]">{formatDate(file.createdAt)}</td>
                        <td className="table-cell">
                          <div className="flex items-center justify-end gap-1">
                            <button className="btn-icon btn-sm" onClick={() => setRenameTarget({ id: file.id, name: file.filename })} title="Rename">
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            {(isImage(file.mimeType) || isPdf(file.mimeType)) && (
                              <button className="btn-icon btn-sm" onClick={() => setPreview(file)} title="Preview"><Eye className="w-3.5 h-3.5" /></button>
                            )}
                            <a href={getDownloadUrl(file.id)} download className="btn-icon btn-sm" title="Download"><Download className="w-3.5 h-3.5" /></a>
                            <button className="btn-icon btn-sm" onClick={() => copyUrl(file.id)} title="Copy URL"><Copy className="w-3.5 h-3.5" /></button>
                            <button className="btn-icon btn-sm" onClick={() => { setShareId(file.id); setShareMode('restricted'); }} title="Share"><Share2 className="w-3.5 h-3.5" /></button>
                            <button className="btn-icon btn-sm hover:text-red-400" onClick={() => setDelId(file.id)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="card p-3 h-fit">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#555]">Recent activity</span>
            <button className="btn-ghost btn-sm" onClick={() => setActiveTab('recent')}>View all</button>
          </div>

          <div className="space-y-2">
            {recentActivity.length === 0 ? <p className="text-xs text-[#555]">No activity yet.</p> : recentActivity.map((item) => (
              <div key={item.id} className="rounded-md border border-[#222] bg-[#0c0c0c] p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#666]">{item.action.toLowerCase()}</span>
                  <span className="text-[10px] text-[#555]">{formatDate(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-[#d0d0d0] truncate">{item.fileName}</p>
              </div>
            ))}
          </div>

          <div className="divider my-3" />

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">Shared with me</p>
            {sharedWithMe.length === 0 && <p className="text-xs text-[#555]">No files shared with you.</p>}
            {sharedWithMe.slice(0, 3).map((share) => (
              <div key={share.id} className="rounded-md border border-[#222] bg-[#0c0c0c] p-2">
                <p className="text-xs text-[#d0d0d0] truncate">{share.file?.originalFilename ?? share.fileId}</p>
                <p className="text-[10px] text-[#555]">Shared by @{share.sharedBy?.githubUsername ?? 'team'} · {share.permission}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e2e2e]">
              <div className="flex items-center gap-2 min-w-0">
                {getFileIcon(preview)}
                <span className="text-xs font-medium text-[#ccc] truncate">{preview.filename}</span>
              </div>
              <button onClick={() => setPreview(null)} className="btn-icon"><X className="w-4 h-4" /></button>
            </div>

            {isPdf(preview.mimeType) ? (
              <iframe title={preview.filename} src={`${getDownloadUrl(preview.id)}?inline=1`} className="w-full h-[70vh] bg-white" />
            ) : (
              <img src={getImageUrl(preview.id)} alt={preview.filename} className="max-h-[70vh] w-auto mx-auto" />
            )}

            <div className="px-4 py-2 border-t border-[#2e2e2e] flex items-center gap-3 text-[10px] text-[#555]">
              <span>{formatBytes(preview.size)}</span>
              <span>·</span>
              <span>{preview.mimeType}</span>
              <span>·</span>
              <span>{formatDate(preview.createdAt)}</span>
            </div>
          </div>
        </div>
      )}

      {renameTarget && (
        <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title="Rename file">
          <div className="space-y-3">
            <input
              className="input text-xs"
              value={renameTarget.name}
              onChange={(e) => setRenameTarget((prev) => prev ? { ...prev, name: e.target.value } : prev)}
              autoFocus
            />
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setRenameTarget(null)} className="btn-secondary btn-sm">Cancel</button>
              <button
                className="btn-primary btn-sm"
                onClick={async () => {
                  const clean = renameTarget.name.trim();
                  if (!clean) return;
                  await renameFileMutation.mutateAsync({ id: renameTarget.id, filename: clean });
                  setRenameTarget(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Modal
        open={creatingFolder || !!folderTarget}
        onClose={() => { setCreatingFolder(false); setFolderTarget(null); }}
        title={folderTarget ? 'Rename folder' : 'Create folder'}
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const name = newFolderName.trim();
            if (!name) return;
            if (folderTarget) {
              updateFolder.mutate({ id: folderTarget.id, name }, { onSuccess: () => setFolderTarget(null) });
            } else {
              createFolder.mutate({ name, parentId: currentFolderId === 'root' ? null : currentFolderId }, { onSuccess: () => setCreatingFolder(false) });
            }
          }}
        >
          <input className="input text-xs" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Folder name" autoFocus maxLength={255} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => { setCreatingFolder(false); setFolderTarget(null); }}>Cancel</button>
            <button type="submit" className="btn-primary btn-sm" disabled={!newFolderName.trim() || createFolder.isPending || updateFolder.isPending}>Save</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!shareId} onClose={() => { setShareId(null); setRecipient(''); }} title="Share file">
        <div className="flex gap-1 border-b border-[#252525] pb-3 mb-4">
          <button
            onClick={() => setShareMode('restricted')}
            className={`btn-sm ${shareMode === 'restricted' ? 'btn-primary' : 'btn-secondary'}`}
          ><Users className="w-3.5 h-3.5" />Restricted</button>
          <button
            onClick={() => setShareMode('link')}
            className={`btn-sm ${shareMode === 'link' ? 'btn-primary' : 'btn-secondary'}`}
          ><Globe className="w-3.5 h-3.5" />Anyone with the link</button>
        </div>

        {shareMode === 'restricted' ? (
          <div className="space-y-3">
            {shares.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">People with access</p>
                <div className="space-y-1.5">
                  {shares.map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5 p-2 bg-[#0a0a0a] rounded-md border border-[#222]">
                      <Avatar name={s.sharedWith?.githubUsername ?? '?'} size="sm" />
                      <span className="text-xs text-[#888] flex-1">@{s.sharedWith?.githubUsername}</span>
                      <span className={`${PERM_BADGE[s.permission]} text-[10px]`}>{s.permission}</span>
                      <button onClick={() => revokeShare.mutate(s.id)} className="text-[#444] hover:text-red-400 transition-colors" title="Remove access"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                <div className="my-4 divider" />
              </div>
            )}

            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Recipient User ID</label>
              <input className="input text-xs" placeholder="user-uuid-here" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </div>

            <div>
              <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Permission</label>
              <select className="select text-xs" value={perm} onChange={(e) => setPerm(e.target.value as SharePermission)}>
                <option value="VIEW">VIEW — read only</option>
                <option value="EDIT">EDIT — can modify</option>
                <option value="MANAGE">MANAGE — full control</option>
              </select>
            </div>

            <p className="text-[10px] text-[#555] leading-relaxed">Restricted shares require the recipient to sign in. Their file key is wrapped for their account.</p>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setShareId(null)} className="btn-secondary btn-sm">Done</button>
              <button className="btn-primary btn-sm" disabled={!recipient.trim() || shareFile.isPending} onClick={() => shareFile.mutate({ recipientId: recipient.trim(), permission: perm }, { onSuccess: () => setRecipient('') })}>
                {shareFile.isPending ? 'Sharing…' : 'Share with person'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Globe className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-[#ddd]">Anyone with the link can view</p>
                <p className="mt-1 text-[10px] leading-relaxed text-[#666]">No sign-in required. The link grants view and download access only. Revoke it any time.</p>
              </div>
            </div>

            {publicLinkLoading ? (
              <div className="h-9 rounded border border-[#252525] bg-[#101010] animate-pulse" />
            ) : publicLink ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input className="input min-w-0 text-xs" value={publicLink.url} readOnly aria-label="Public share link" />
                  <button className="btn-secondary btn-sm shrink-0" title="Copy link" onClick={() => copyShareLink(publicLink.url)}><Copy className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-[10px] text-[#666]">
                  {publicLink.expiresAt ? `Expires ${formatDate(publicLink.expiresAt)}` : 'No expiration'}
                </p>
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Link expiration</label>
                <select className="select text-xs" value={linkExpiryDays} onChange={(event) => setLinkExpiryDays(event.target.value)}>
                  <option value="">Never</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
              {publicLink ? (
                <button
                  className="btn-secondary btn-sm"
                  disabled={createPublicLink.isPending || revokePublicLink.isPending}
                  onClick={() => {
                    const expiresAt = linkExpiryDays ? new Date(Date.now() + Number(linkExpiryDays) * 86400000).toISOString() : null;
                    createPublicLink.mutate(expiresAt);
                  }}
                  title="Rotate the link and apply the selected expiry"
                ><RotateCw className="w-3.5 h-3.5" />Replace link</button>
              ) : (
                <button
                  className="btn-primary btn-sm"
                  disabled={createPublicLink.isPending || publicLinkLoading}
                  onClick={() => {
                    const expiresAt = linkExpiryDays ? new Date(Date.now() + Number(linkExpiryDays) * 86400000).toISOString() : null;
                    createPublicLink.mutate(expiresAt);
                  }}
                ><Link2 className="w-3.5 h-3.5" />{createPublicLink.isPending ? 'Creating…' : 'Create link'}</button>
              )}
            </div>

            {publicLink && (
              <div className="flex justify-end border-t border-[#252525] pt-3">
                <button className="btn-danger btn-sm" disabled={revokePublicLink.isPending} onClick={() => revokePublicLink.mutate()}>
                  {revokePublicLink.isPending ? 'Revoking…' : 'Revoke link'}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!delId} onClose={() => setDelId(null)} title="Delete file?">
        <p className="text-xs text-[#888] mb-4 leading-relaxed">This permanently removes the file from GitHub and the database. This action cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setDelId(null)} className="btn-secondary btn-sm">Cancel</button>
          <button className="btn-danger btn-sm" disabled={deleteFile.isPending} onClick={() => deleteFile.mutate(delId!, { onSuccess: () => setDelId(null) })}>{deleteFile.isPending ? 'Deleting…' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
