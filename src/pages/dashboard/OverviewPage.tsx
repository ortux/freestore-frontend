import { Link } from 'react-router-dom';
import {
  Files, HardDrive, Github, Key, ArrowUpRight,
  Lock, Activity, Plus, Clock,
} from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { useFiles } from '../../hooks/useFiles';
import { formatBytes, formatDate, isImage, getImageUrl } from '../../utils/format';
import { SkeletonCard, SkeletonRow } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

function UsageMeter({ label, used, total, icon: Icon, color = 'bg-white' }: {
  label: string; used: number; total: number;
  icon: React.ElementType; color?: string;
}) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#1a1a1a] last:border-0">
      <div className="w-5 h-5 flex items-center justify-center text-[#666]">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#888]">{label}</span>
          <span className="text-xs text-[#555] tabular-nums">
            {formatBytes(used)} / {formatBytes(total)}
          </span>
        </div>
        <div className="progress-track h-1">
          <div className={`progress-fill h-1 ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: filesData, isLoading: filesLoading } = useFiles({ limit: 6 } as Parameters<typeof useFiles>[0]);

  const maxStorageBytes = 1 * 1024 * 1024 * 1024; // 1 GB display cap
  const usedBytes = user?.stats.totalBytes ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#ededed]">Overview</h1>
          <p className="text-xs text-[#555] mt-0.5">
            {user ? `@${user.githubUsername}` : '—'}
          </p>
        </div>
        <Link to="/dashboard/upload" className="btn-primary btn-sm gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Upload
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {userLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-label"><Files className="w-3.5 h-3.5" /> Files</div>
              <div className="stat-value">{user?.stats.fileCount ?? 0}</div>
              <div className="stat-sub">total uploaded</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><HardDrive className="w-3.5 h-3.5" /> Storage</div>
              <div className="stat-value">{formatBytes(usedBytes)}</div>
              <div className="stat-sub">encrypted on GitHub</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><Github className="w-3.5 h-3.5" /> Repository</div>
              <div className="stat-value text-sm pt-1">
                {user?.repositoryName ? (
                  <span className="badge-green badge">Connected</span>
                ) : (
                  <span className="badge-amber badge">Pending</span>
                )}
              </div>
              <div className="stat-sub">{user?.repositoryName ?? 'not yet created'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><Lock className="w-3.5 h-3.5" /> Encryption</div>
              <div className="stat-value text-sm pt-1">
                <span className="badge-blue badge">AES-256-GCM</span>
              </div>
              <div className="stat-sub">per-file keys</div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Usage */}
        <div className="card p-4">
          <div className="section-header mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#555]" />
              <span className="section-title">Usage</span>
            </div>
            <span className="text-[10px] text-[#444] bg-[#1a1a1a] px-2 py-0.5 rounded">
              Last 30 days
            </span>
          </div>
          <UsageMeter
            label="Encrypted Storage"
            used={usedBytes}
            total={maxStorageBytes}
            icon={HardDrive}
            color="bg-blue-500"
          />
          <UsageMeter
            label="Files"
            used={user?.stats.fileCount ?? 0}
            total={1000}
            icon={Files}
            color="bg-emerald-500"
          />
          <UsageMeter
            label="API Requests"
            used={0}
            total={10000}
            icon={Key}
            color="bg-purple-500"
          />
        </div>

        {/* Recent files */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#555]" />
              <span className="section-title">Recent Files</span>
            </div>
            <Link
              to="/dashboard/files"
              className="text-xs text-[#555] hover:text-[#ededed] flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {filesLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
          ) : !filesData?.files.length ? (
            <EmptyState
              icon={Files}
              title="No files yet"
              description="Upload your first encrypted file"
              action={
                <Link to="/dashboard/upload" className="btn-secondary btn-sm">
                  Upload file
                </Link>
              }
            />
          ) : (
            <div>
              {filesData.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1a1a1a] last:border-0 hover:bg-[#0a0a0a] transition-colors"
                >
                  <div className="w-8 h-8 rounded bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center overflow-hidden shrink-0">
                    {isImage(file.mimeType) ? (
                      <img
                        src={getImageUrl(file.id)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Files className="w-3.5 h-3.5 text-[#444]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#ccc] truncate">{file.filename}</p>
                    <p className="text-[10px] text-[#555]">{file.mimeType.split('/')[1]}</p>
                  </div>
                  <span className="text-xs text-[#555] tabular-nums shrink-0">
                    {formatBytes(file.size)}
                  </span>
                  <span className="text-[10px] text-[#444] shrink-0 hidden sm:block">
                    {formatDate(file.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { to: '/dashboard/api', icon: Key, title: 'API Keys', sub: 'Programmatic access' },
          { to: '/dashboard/repository', icon: Github, title: 'Repository', sub: 'View GitHub store' },
          { to: '/dashboard/storage', icon: HardDrive, title: 'Storage', sub: 'Configure provider' },
        ].map(({ to, icon: Icon, title, sub }) => (
          <Link key={to} to={to} className="card-hover p-4 flex items-center gap-3 group">
            <div className="w-8 h-8 rounded bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-[#555] group-hover:text-[#888] transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#ccc]">{title}</p>
              <p className="text-[10px] text-[#555]">{sub}</p>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#333] group-hover:text-[#666] transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
