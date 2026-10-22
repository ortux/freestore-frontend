import { useQuery } from '@tanstack/react-query';
import { Github, ExternalLink, Lock, Eye, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';
import { getRepository } from '../../api/user';
import { formatBytes } from '../../utils/format';
import { SkeletonCard } from '../../components/ui/Skeleton';

export default function RepositoryPage() {
  const { data: repo, isLoading } = useQuery({
    queryKey: ['repository'],
    queryFn: getRepository,
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <h1 className="text-base font-semibold text-[#ededed]">Repository</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !repo ? (
        <div className="card p-6 text-center text-xs text-[#555]">
          Repository not yet created. Sign out and sign back in to provision one.
        </div>
      ) : (
        <>
          {/* Repo header */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center">
                  <Github className="w-5 h-5 text-[#666]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#ededed]">{repo.name}</p>
                  <p className="text-xs text-[#555]">{repo.owner}</p>
                </div>
              </div>
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary btn-sm gap-1.5 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open
              </a>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Owner',      value: repo.owner,      icon: Github },
                { label: 'Visibility', value: repo.visibility, icon: Eye },
                { label: 'Encryption', value: repo.encryption, icon: Lock },
                { label: 'Size',       value: repo.size ? formatBytes(repo.size * 1024) : 'Unknown', icon: HardDrive },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-[#0a0a0a] rounded-md border border-[#1e1e1e] p-3">
                  <div className="flex items-center gap-1.5 text-[#555] mb-1.5">
                    <Icon className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wider">{label}</span>
                  </div>
                  <p className="text-xs font-medium text-[#ccc] font-mono">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {!!repo.storageRepositories?.length && (
            <div className="card p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#888]">Storage repositories</p>
                <p className="mt-1 text-[10px] text-[#555]">
                  New repositories are created automatically as a repository approaches its storage target.
                </p>
              </div>
              <div className="space-y-3">
                {repo.storageRepositories.map((storageRepo) => {
                  const percent = Math.min(100, Math.round((storageRepo.usedBytes / storageRepo.maxBytes) * 100));
                  return (
                    <div key={storageRepo.id} className="rounded-md border border-[#222] bg-[#0a0a0a] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <a
                          href={storageRepo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 font-mono text-xs text-[#ccc] hover:text-white"
                        >
                          {storageRepo.owner}/{storageRepo.name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className={`badge ${storageRepo.status === 'FULL' ? 'badge-amber' : 'badge-green'}`}>
                          {storageRepo.status === 'FULL' ? 'Rotated' : 'Active'}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-[#666]">
                        <span>Estimated committed storage</span>
                        <span>{formatBytes(storageRepo.usedBytes)} / {formatBytes(storageRepo.maxBytes)}</span>
                      </div>
                      <div className="progress-track mt-1.5 h-1">
                        <div
                          className={`progress-fill ${storageRepo.status === 'FULL' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] leading-relaxed text-[#555]">
                Estimates are cumulative because GitHub retains deleted content in repository history. GitHub account limits still apply.
              </p>
            </div>
          )}

          {/* Privacy model */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-[#888] mb-3">Privacy model</p>
            <div className="space-y-2">
              {[
                { ok: true,  text: 'All files encrypted with AES-256-GCM before commit — only ciphertext on GitHub' },
                { ok: true,  text: 'Random filenames used (.enc) — original names stored only in database' },
                { ok: true,  text: 'Per-file encryption keys, wrapped with your master key' },
                { ok: false, text: 'GitHub can see: owner, repo name, file sizes, timestamps, and ciphertext' },
              ].map(({ ok, text }, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  {ok
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  }
                  <p className="text-xs text-[#666] leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Structure */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-[#888] mb-3">Repository structure</p>
            <pre className="code-block">{`${repo.name}/
├── README.md
└── files/
    ├── 7f91a8b2.enc   ← AES-256-GCM ciphertext
    ├── 91ab32cd.enc   ← AES-256-GCM ciphertext
    └── a182ccef.enc   ← AES-256-GCM ciphertext`}</pre>
          </div>
        </>
      )}
    </div>
  );
}
