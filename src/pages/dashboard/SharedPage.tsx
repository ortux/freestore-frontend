import { useState } from 'react';
import { Share2, Inbox, Users, Download, Trash2, Clock, Eye, Edit, Shield, Lock, Sparkles } from 'lucide-react';
import { useSharedByMe, useSharedWithMe, useRevokeShare } from '../../hooks/useShares';
import { getImageUrl, getDownloadUrl } from '../../api/files';
import { formatDate, formatBytes, isImage } from '../../utils/format';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRow } from '../../components/ui/Skeleton';
import type { SharePermission } from '../../api/shares';

const PERM_CONFIG: Record<SharePermission, { label: string; cls: string; icon: React.ElementType }> = {
  VIEW:   { label: 'VIEW',   cls: 'badge-gray',   icon: Eye },
  EDIT:   { label: 'EDIT',   cls: 'badge-amber',  icon: Edit },
  MANAGE: { label: 'MANAGE', cls: 'badge-blue',   icon: Shield },
};

function PermBadge({ permission }: { permission: SharePermission }) {
  const { label, cls, icon: Icon } = PERM_CONFIG[permission];
  return (
    <span className={`${cls} badge`}>
      <Icon className="w-2.5 h-2.5" /> {label}
    </span>
  );
}

export default function SharedPage() {
  const [tab, setTab] = useState<'with-me' | 'by-me'>('with-me');
  const { data: withMe = [], isLoading: loadingWith } = useSharedWithMe();
  const { data: byMe = [], isLoading: loadingBy } = useSharedByMe();
  const revoke = useRevokeShare();

  const items = tab === 'with-me' ? withMe : byMe;
  const loading = tab === 'with-me' ? loadingWith : loadingBy;
  const granted = byMe.filter((share) => share.permission === 'MANAGE').length;
  const active = withMe.filter((share) => !share.expiresAt || new Date(share.expiresAt) >= new Date()).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#555]">Collaboration</p>
          <h1 className="text-base font-semibold text-[#ededed]">Shared Files</h1>
        </div>
        <div className="badge badge-blue">
          <Sparkles className="w-2.5 h-2.5" />
          {tab === 'with-me' ? 'Shared with me' : 'Shared by me'}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="stat-card">
          <div className="stat-label"><Inbox className="w-3.5 h-3.5" /> Received</div>
          <div className="stat-value">{withMe.length}</div>
          <div className="stat-sub">Files shared directly with you</div>
        </div>

        <div className="stat-card">
          <div className="stat-label"><Users className="w-3.5 h-3.5" /> Active</div>
          <div className="stat-value">{active}</div>
          <div className="stat-sub">Files currently available</div>
        </div>

        <div className="stat-card">
          <div className="stat-label"><Lock className="w-3.5 h-3.5" /> Managed</div>
          <div className="stat-value">{granted}</div>
          <div className="stat-sub">Files you control with manager access</div>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-[#111] border border-[#2e2e2e] rounded-lg w-fit">
        {([
          { id: 'with-me', icon: Inbox, label: 'Shared with me', count: withMe.length },
          { id: 'by-me', icon: Users, label: 'Shared by me', count: byMe.length },
        ] as const).map(({ id, icon: Icon, label, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              tab === id ? 'bg-[#1e1e1e] text-[#ededed]' : 'text-[#555] hover:text-[#888]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${tab === id ? 'bg-[#333] text-[#888]' : 'bg-[#1a1a1a] text-[#444]'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header w-10" />
              <th className="table-header text-left">File</th>
              <th className="table-header text-left hidden sm:table-cell">
                {tab === 'by-me' ? 'Shared with' : 'Shared by'}
              </th>
              <th className="table-header text-left">Permission</th>
              <th className="table-header text-left hidden md:table-cell">Expires</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={6}><SkeletonRow /></td></tr>
              ))
            ) : !items.length ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={Share2}
                    title={tab === 'with-me' ? 'Nothing shared with you' : 'You haven\'t shared any files'}
                    description={tab === 'with-me' ? 'Ask a teammate to share a file' : 'Share a file from the Files page'}
                  />
                </td>
              </tr>
            ) : (
              items.map((share) => {
                const file = share.file;
                const isExpired = share.expiresAt && new Date(share.expiresAt) < new Date();
                const counterpart = tab === 'by-me' ? share.sharedWith : share.sharedBy;

                return (
                  <tr key={share.id} className={`table-row ${isExpired ? 'opacity-40' : ''}`}>
                    <td className="table-cell">
                      <div className="w-8 h-8 rounded bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center overflow-hidden">
                        {file && isImage(file.mimeType) ? (
                          <img
                            src={getImageUrl(file.id)}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <Share2 className="w-3.5 h-3.5 text-[#444]" />
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <p className="text-xs font-medium text-[#ccc] truncate max-w-[140px]">
                        {file?.originalFilename ?? share.fileId}
                      </p>
                      {file && <p className="text-[10px] text-[#555]">{formatBytes(file.fileSize)}</p>}
                    </td>
                    <td className="table-cell hidden sm:table-cell text-xs text-[#666]">
                      {counterpart ? `@${counterpart.githubUsername}` : '—'}
                    </td>
                    <td className="table-cell">
                      <PermBadge permission={share.permission} />
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      {share.expiresAt ? (
                        <span className={`text-xs flex items-center gap-1 ${isExpired ? 'text-red-400' : 'text-[#666]'}`}>
                          <Clock className="w-3 h-3" />
                          {isExpired ? 'Expired' : formatDate(share.expiresAt)}
                        </span>
                      ) : (
                        <span className="text-xs text-[#444]">Never</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-0.5">
                        {file && (
                          <a href={getDownloadUrl(file.id)} download className="btn-icon btn-sm" title="Download">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => revoke.mutate(share.id)}
                          className="btn-icon btn-sm hover:text-red-400"
                          title="Revoke"
                          disabled={revoke.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
