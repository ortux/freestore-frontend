import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, File, X, CheckCircle, AlertCircle,
  XCircle, Clock, RefreshCw, Lock,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { initiateUpload, executeUpload, createUpload, getResumableUploadStatus, uploadChunk, completeUpload, abortUpload } from '../../api/files';
import { listResumableUploads, type ResumableUploadSession } from '../../api/files';
import { useFolders } from '../../hooks/useFiles';
import { formatBytes } from '../../utils/format';
import { config } from '../../config';
import toast from 'react-hot-toast';

async function uploadChunkWithRetry(
  uploadId: string,
  index: number,
  chunk: Blob,
  signal: AbortSignal,
  credentials: { url: string; token: string },
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await uploadChunk(credentials.url, credentials.token, index, chunk, signal);
      return;
    } catch (error) {
      if (signal.aborted || attempt >= config.uploadMaxRetries) throw error;
      const errorStatus = (error as { response?: { status?: number } }).response?.status;
      if (errorStatus === 401) {
        const refreshed = await getResumableUploadStatus(uploadId);
        credentials.url = refreshed.chunkUploadUrl;
        credentials.token = refreshed.chunkUploadToken;
        continue;
      }
      if (errorStatus && errorStatus < 500 && errorStatus !== 403 && errorStatus !== 429) throw error;
      await waitForRetry(1000 * 2 ** attempt, signal);
    }
  }
}

function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, delayMs);
    const abort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException('Upload aborted', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
  });
}

type Phase = 'waiting' | 'initiating' | 'uploading' | 'encrypting' | 'done' | 'error' | 'aborted';

interface QueueItem {
  id: string;
  file: File;
  phase: Phase;
  progress: number;
  uploadId?: string;
  token?: string;
  uploadUrl?: string;
  expiresAt?: string;
  error?: string;
  controller?: AbortController;
  chunkSize?: number;
  totalChunks?: number;
  fileId?: string;
  folderId: string | null;
  uploadedBytes?: number;
  completedChunks?: number;
  speedBytesPerSecond?: number;
}

const PHASE_COLOR: Record<Phase, string> = {
  waiting: 'text-[#555]', initiating: 'text-blue-400', uploading: 'text-blue-400',
  encrypting: 'text-amber-400', done: 'text-emerald-400', error: 'text-red-400', aborted: 'text-[#444]',
};
const PHASE_LABEL: Record<Phase, string> = {
  waiting: 'Waiting', initiating: 'Getting token…', uploading: 'Uploading',
  encrypting: 'Encrypting…', done: 'Done', error: 'Failed', aborted: 'Cancelled',
};

function PhaseIcon({ phase }: { phase: Phase }) {
  if (phase === 'done')    return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
  if (phase === 'error')   return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
  if (phase === 'aborted') return <XCircle    className="w-4 h-4 text-[#444] shrink-0" />;
  if (phase === 'waiting') return <Clock      className="w-4 h-4 text-[#444] shrink-0" />;
  return (
    <div className="w-4 h-4 shrink-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  );
}

export default function UploadPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const { data: folders = [] } = useFolders();
  const [serverUploads, setServerUploads] = useState<ResumableUploadSession[]>([]);
  const [resumeLoading, setResumeLoading] = useState(true);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const qc = useQueryClient();

  const patch = useCallback((id: string, p: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...p } : item)));
  }, []);

  useEffect(() => {
    listResumableUploads()
      .then(setServerUploads)
      .catch(() => {})
      .finally(() => setResumeLoading(false));
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    setQueue((prev) => [
      ...prev,
      ...accepted.map((file) => {
        const resumable = serverUploads.find((upload) => upload.originalFilename === file.name && upload.fileSize === file.size);
        return {
          id: Math.random().toString(36).slice(2),
          file,
          phase: 'waiting' as Phase,
          progress: 0,
          folderId,
          ...(resumable && {
            uploadId: resumable.id,
            fileId: resumable.fileId,
            chunkSize: resumable.chunkSize,
            totalChunks: resumable.totalChunks,
          }),
        };
      }),
    ]);
  }, [folderId, serverUploads]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(config.allowedMimeTypes.map((mimeType) => [mimeType, []])),
    maxSize: config.maxFileSizeMb * 1024 * 1024,
    multiple: true,
  });

  const uploadOne = useCallback(async (item: QueueItem) => {
    const ctrl = new AbortController();
    patch(item.id, { phase: 'initiating', progress: 0, controller: ctrl });
    try {
      if (item.file.size <= config.largeFileThresholdMb * 1024 * 1024 && !item.uploadId) {
        const init = await initiateUpload(item.file, item.folderId);
        patch(item.id, { phase: 'uploading', progress: 5, uploadId: init.uploadId });
        await executeUpload(init.uploadUrl, init.token, item.file, (pct) => patch(item.id, { progress: 5 + Math.round(pct * 0.9) }), ctrl.signal);
        patch(item.id, { phase: 'done', progress: 100 });
        qc.invalidateQueries({ queryKey: ['files'] });
        qc.invalidateQueries({ queryKey: ['file-activity'] });
        qc.invalidateQueries({ queryKey: ['user'] });
        return;
      }
      let uploadId = item.uploadId;
      let chunkSize = item.chunkSize;
      let totalChunks = item.totalChunks;
      if (!uploadId) {
        const created = await createUpload(item.file, item.folderId);
        uploadId = created.id;
        chunkSize = created.chunkSize;
        totalChunks = created.totalChunks;
        patch(item.id, { phase: 'uploading', progress: 0, uploadId, fileId: created.fileId, chunkSize, totalChunks });
      }
      const status = await getResumableUploadStatus(uploadId);
      const chunkCredentials = { url: status.chunkUploadUrl, token: status.chunkUploadToken };
      if (item.file.size !== status.fileSize) throw new Error('Selected file size does not match this upload session');
      for (const uploadedChunk of status.chunks) {
        const start = uploadedChunk.chunkIndex * status.chunkSize;
        const bytes = await item.file.slice(start, start + uploadedChunk.originalSize).arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const checksum = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
        if (checksum !== uploadedChunk.checksum) {
          throw new Error('Selected file does not match the chunks already uploaded for this session');
        }
      }
      const uploaded = new Set(status.uploadedChunks);
      let uploadedBytes = status.uploadedBytes;
      const uploadStartedAt = Date.now();
      patch(item.id, {
        uploadedBytes,
        completedChunks: uploaded.size,
        progress: Math.round((uploaded.size / totalChunks!) * 90),
      });
      const size = chunkSize!;
      const count = totalChunks!;
      let nextIndex = 0;
      const uploadWorker = async () => {
        while (nextIndex < count) {
          const index = nextIndex++;
          if (uploaded.has(index)) {
            patch(item.id, { progress: Math.round((uploaded.size / count) * 90) });
            continue;
          }
          const start = index * size;
          const chunk = item.file.slice(start, Math.min(start + size, item.file.size));
          await uploadChunkWithRetry(uploadId!, index, chunk, ctrl.signal, chunkCredentials);
          uploaded.add(index);
          uploadedBytes += chunk.size;
          const elapsedSeconds = Math.max((Date.now() - uploadStartedAt) / 1000, 0.001);
          patch(item.id, {
            phase: 'uploading',
            progress: Math.round((uploaded.size / count) * 90),
            completedChunks: uploaded.size,
            uploadedBytes,
            speedBytesPerSecond: Math.round((uploadedBytes - status.uploadedBytes) / elapsedSeconds),
          });
        }
      };
      await Promise.all(Array.from({ length: Math.min(config.uploadConcurrency, count) }, () => uploadWorker()));
      patch(item.id, { phase: 'encrypting', progress: 95 });
      await completeUpload(uploadId);
      patch(item.id, { phase: 'done', progress: 100 });

      qc.invalidateQueries({ queryKey: ['files'] });
      qc.invalidateQueries({ queryKey: ['file-activity'] });
      qc.invalidateQueries({ queryKey: ['user'] });
      setServerUploads((uploads) => uploads.filter((upload) => upload.id !== uploadId));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        patch(item.id, { phase: 'aborted', progress: 0 });
        return;
      }
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        .response?.data?.error?.message ?? (err instanceof Error ? err.message : 'Upload failed');
      patch(item.id, { phase: 'error', error: msg });
    }
  }, [patch, qc]);

  const resumeServerUpload = async (upload: ResumableUploadSession) => {
    const item = queueRef.current.find((queued) => queued.uploadId === upload.id);
    if (item) {
      await uploadOne(item);
      return;
    }
    const file = queueRef.current.find((queued) => queued.file.name === upload.originalFilename && queued.file.size === upload.fileSize)?.file;
    if (!file) {
      toast.error(`Choose ${upload.originalFilename} (${formatBytes(upload.fileSize)}) to resume this upload`);
      return;
    }
    const queueItem: QueueItem = {
      id: `resume-${upload.id}`,
      file,
      folderId: null,
      phase: 'waiting',
      progress: 0,
      uploadId: upload.id,
      fileId: upload.fileId,
      chunkSize: upload.chunkSize,
      totalChunks: upload.totalChunks,
    };
    setQueue((current) => [...current, queueItem]);
    await uploadOne(queueItem);
  };

  const uploadAll = async () => {
    for (const item of queueRef.current.filter((p) => p.phase === 'waiting')) {
      await uploadOne(item);
    }
  };

  const retry = (item: QueueItem) => {
    patch(item.id, { phase: 'waiting', progress: 0, error: undefined });
    setTimeout(() => uploadOne({ ...item, phase: 'waiting', progress: 0 }), 50);
  };

  const abort = async (item: QueueItem) => {
    item.controller?.abort();
    if (item.uploadId) await abortUpload(item.uploadId).catch(() => {});
    patch(item.id, { phase: 'aborted', progress: 0 });
  };

  const remove = (id: string) => setQueue((prev) => prev.filter((p) => p.id !== id));
  const clearDone = () => setQueue((prev) => prev.filter((p) => !['done', 'aborted', 'error'].includes(p.phase)));

  const waiting  = queue.filter((p) => p.phase === 'waiting').length;
  const active   = queue.filter((p) => ['initiating', 'uploading', 'encrypting'].includes(p.phase)).length;
  const done     = queue.filter((p) => p.phase === 'done').length;
  const failed   = queue.filter((p) => p.phase === 'error').length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <h1 className="text-base font-semibold text-[#ededed]">Upload Files</h1>

      <div className="flex items-center gap-3 max-w-sm">
        <label htmlFor="upload-folder" className="text-xs text-[#888]">Save to</label>
        <select id="upload-folder" className="select text-xs flex-1" value={folderId ?? ''} onChange={(event) => setFolderId(event.target.value || null)}>
          <option value="">My Drive</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
      </div>

      {!resumeLoading && serverUploads.length > 0 && (
        <div className="border-b border-[#242424] pb-4 space-y-2">
          <h2 className="text-xs font-medium text-[#aaa]">Uploads you can resume</h2>
          {serverUploads.map((upload) => (
            <div key={upload.id} className="flex items-center gap-3 text-xs">
              <File className="w-4 h-4 text-[#666]" />
              <span className="flex-1 min-w-0 truncate text-[#ccc]">{upload.originalFilename} · {formatBytes(upload.fileSize)}</span>
              <span className="text-[#666]">Expires {new Date(upload.expiresAt).toLocaleString()}</span>
              <button
                className="btn-secondary btn-sm"
                onClick={() => resumeServerUpload(upload)}
                disabled={!queue.some((item) => item.uploadId === upload.id)}
                title={queue.some((item) => item.uploadId === upload.id) ? 'Resume with selected file' : 'Select this file in the drop area first'}
              >Resume</button>
              <button className="btn-icon btn-sm" title="Cancel upload" onClick={() => abortUpload(upload.id).then(() => setServerUploads((items) => items.filter((item) => item.id !== upload.id)))}><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
          ${isDragActive
            ? 'border-blue-500/60 bg-blue-500/5'
            : 'border-[#2e2e2e] hover:border-[#444] bg-[#0a0a0a]'
          }`}
      >
        <input {...getInputProps()} />
        <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragActive ? 'text-blue-400' : 'text-[#333]'}`} />
        <p className="text-sm text-[#888]">
          {isDragActive ? 'Drop to upload' : 'Drag files here or click to browse'}
        </p>
        <p className="text-xs text-[#444] mt-1">Files up to {config.maxFileSizeMb} MB</p>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="card overflow-hidden">
          {/* Queue header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[#666]">{queue.length} file{queue.length !== 1 ? 's' : ''}</span>
              {active > 0  && <span className="text-blue-400">{active} uploading</span>}
              {done > 0    && <span className="text-emerald-400">{done} done</span>}
              {failed > 0  && <span className="text-red-400">{failed} failed</span>}
            </div>
            <div className="flex items-center gap-2">
              {(done > 0 || failed > 0) && (
                <button onClick={clearDone} className="btn-ghost btn-sm text-[10px]">
                  Clear
                </button>
              )}
              {waiting > 0 && active === 0 && (
                <button onClick={uploadAll} className="btn-primary btn-sm gap-1.5">
                  <Upload className="w-3 h-3" />
                  Upload {waiting}
                </button>
              )}
            </div>
          </div>

          {queue.map((item) => {
            const isActive   = ['initiating','uploading','encrypting'].includes(item.phase);
            const isTerminal = item.phase === 'done' || item.phase === 'aborted';

            return (
              <div key={item.id} className="px-4 py-3 border-b border-[#1a1a1a] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center shrink-0">
                    <File className="w-3.5 h-3.5 text-[#444]" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-[#ccc] truncate">{item.file.name}</p>
                      <span className="text-[10px] text-[#555] shrink-0 tabular-nums">{formatBytes(item.file.size)}</span>
                    </div>
                    {(isActive || item.phase === 'done') && (
                      <div className="progress-track h-0.5">
                        <div
                          className={`progress-fill h-0.5 ${item.phase === 'done' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[10px] ${PHASE_COLOR[item.phase]}`}>
                        {PHASE_LABEL[item.phase]}
                        {item.phase === 'uploading' && item.progress > 0 && ` ${item.progress}%`}
                      </p>
                      {item.totalChunks !== undefined && item.phase === 'uploading' && (
                        <p className="text-[10px] text-[#555]">
                          {item.completedChunks ?? 0} / {item.totalChunks} chunks · {formatBytes(item.uploadedBytes ?? 0)} / {formatBytes(item.file.size)}
                          {item.speedBytesPerSecond ? ` · ${formatBytes(item.speedBytesPerSecond)}/s` : ''}
                        </p>
                      )}
                      {item.phase === 'error' && (
                        <p className="text-[10px] text-red-400 truncate max-w-[180px]">{item.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <PhaseIcon phase={item.phase} />
                    {isActive && (
                      <button onClick={() => abort(item)} className="btn-icon" title="Cancel">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {item.phase === 'error' && (
                      <button onClick={() => retry(item)} className="btn-icon" title="Retry">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(isTerminal || item.phase === 'waiting' || item.phase === 'error') && (
                      <button onClick={() => remove(item.id)} className="btn-icon" title="Remove">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-3.5 h-3.5 text-[#555]" />
          <span className="text-xs font-semibold text-[#888]">How uploads work</span>
        </div>
        <div className="space-y-2">
          {[
            ['Get upload token', 'POST /uploads/initiate — backend issues a short-lived signed JWT'],
            ['PUT raw bytes', 'Client sends file directly to the presigned URL using Bearer token'],
            ['Encrypt', 'Backend encrypts with AES-256-GCM and pushes ciphertext to GitHub'],
            ['Single-use', 'Token is spent after one PUT — replay returns 409'],
          ].map(([title, desc], i) => (
            <div key={i} className="flex gap-3 text-xs">
              <span className="w-4 h-4 rounded bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center text-[10px] text-[#555] shrink-0 font-mono">
                {i + 1}
              </span>
              <span className="text-[#555]">
                <span className="text-[#888]">{title}</span> — {desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
