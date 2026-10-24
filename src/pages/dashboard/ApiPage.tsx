import { useState } from 'react';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Terminal, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listApiKeys, createApiKey, deleteApiKey } from '../../api/apiKeys';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { formatDate } from '../../utils/format';
import { config } from '../../config';
import toast from 'react-hot-toast';

export default function ApiPage() {
  const apiOrigin = config.apiOrigin || window.location.origin;
  const qc = useQueryClient();
  const [showCreate,  setShowCreate]  = useState(false);
  const [newName,     setNewName]     = useState('');
  const [revealed,    setRevealed]    = useState<string | null>(null);
  const [showKey,     setShowKey]     = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery({ queryKey: ['api-keys'], queryFn: listApiKeys });

  const create = useMutation({
    mutationFn: () => createApiKey(newName.trim()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setRevealed(data.key);
      setShowKey(false);
      setCopied(false);
      setNewName('');
      setShowCreate(false);
    },
    onError: () => toast.error('Failed to create API key'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteApiKey(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['api-keys'] }); toast.success('API key deleted'); },
    onError: () => toast.error('Failed to delete key'),
  });

  const copyKey = (k: string) => {
    navigator.clipboard.writeText(k);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#ededed]">API Keys</h1>
          <p className="text-xs text-[#555] mt-0.5">Programmatic access to your files</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-secondary btn-sm gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Create key
        </button>
      </div>

      {/* Revealed key banner */}
      {revealed && (
        <div className="card border-amber-500/30 bg-amber-500/5 p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <p className="text-xs font-medium text-amber-400">
              Save this key — it won't be shown again
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#0a0a0a] rounded-md border border-[#2e2e2e] px-3 py-2">
            <span className="flex-1 font-mono text-xs text-[#ccc] break-all">
              {showKey ? revealed : `${revealed.slice(0, 20)}${'•'.repeat(40)}`}
            </span>
            <button
              onClick={() => setShowKey(!showKey)}
              className="btn-icon shrink-0"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => copyKey(revealed)} className="btn-icon shrink-0">
              {copied
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                : <Copy className="w-3.5 h-3.5" />
              }
            </button>
          </div>
          <button
            onClick={() => setRevealed(null)}
            className="text-[10px] text-[#555] hover:text-[#888] transition-colors"
          >
            I've saved it — dismiss
          </button>
        </div>
      )}

      {/* Keys table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header text-left">Name</th>
              <th className="table-header text-left">Key</th>
              <th className="table-header text-left hidden md:table-cell">Created</th>
              <th className="table-header text-left hidden md:table-cell">Last used</th>
              <th className="table-header text-right" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={5}><SkeletonRow /></td></tr>
              ))
            ) : !keys.length ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={Key}
                    title="No API keys"
                    description="Create a key to access the API programmatically"
                  />
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="table-row">
                  <td className="table-cell">
                    <span className="text-xs font-medium text-[#ccc]">{k.name}</span>
                  </td>
                  <td className="table-cell">
                    <span className="font-mono text-xs text-[#555]">{k.prefix}••••••••••••</span>
                  </td>
                  <td className="table-cell hidden md:table-cell text-xs text-[#666]">
                    {formatDate(k.createdAt)}
                  </td>
                  <td className="table-cell hidden md:table-cell text-xs text-[#666]">
                    {k.lastUsed ? formatDate(k.lastUsed) : <span className="text-[#444]">Never</span>}
                  </td>
                  <td className="table-cell text-right">
                    <button
                      onClick={() => setConfirmDel(k.id)}
                      className="btn-icon btn-sm hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Usage example */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#555]" />
          <span className="text-xs font-semibold text-[#888]">Usage</span>
        </div>
        <pre className="code-block">{`# Upload a file through the Free Store API
curl -X POST ${apiOrigin}/api/v1/uploads/initiate \\
  -H "Authorization: Bearer sk_live_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"filename":"photo.png","mimeType":"image/png","fileSize":183920}'

# Then PUT the raw bytes to the returned uploadUrl
curl -X PUT <uploadUrl> \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: image/png" \\
  --data-binary @photo.png

# List files
curl ${apiOrigin}/api/v1/files \\
  -H "Authorization: Bearer sk_live_xxxx"`}
        </pre>
      </div>

      {/* Create key modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create API key">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Key name</label>
            <input
              className="input text-xs"
              placeholder="Production, CI/CD, Mobile app…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newName.trim() && create.mutate()}
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setShowCreate(false)} className="btn-secondary btn-sm">Cancel</button>
            <button
              className="btn-primary btn-sm"
              disabled={!newName.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Creating…' : 'Create key'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete API key?">
        <p className="text-xs text-[#888] mb-4">
          Any application using this key will immediately lose access.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirmDel(null)} className="btn-secondary btn-sm">Cancel</button>
          <button
            className="btn-danger btn-sm"
            disabled={remove.isPending}
            onClick={() => remove.mutate(confirmDel!, { onSuccess: () => setConfirmDel(null) })}
          >
            {remove.isPending ? 'Deleting…' : 'Delete key'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
