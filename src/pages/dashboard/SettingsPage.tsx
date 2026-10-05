import {
  User, Mail, Github, Calendar, Shield,
  Lock, Key, Cookie, CheckCircle,
} from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { formatDate } from '../../utils/format';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';

export default function SettingsPage() {
  const { data: user, isLoading } = useUser();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <h1 className="text-base font-semibold text-[#ededed]">Settings</h1>

      {/* Profile */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center gap-3">
          {user
            ? <Avatar name={user.githubUsername} size="lg" />
            : <Skeleton className="w-10 h-10 rounded-full" />
          }
          <div>
            <p className="text-sm font-semibold text-[#ededed]">
              {isLoading ? <Skeleton className="w-32 h-4" /> : user?.githubUsername}
            </p>
            <p className="text-xs text-[#555] mt-0.5">
              {isLoading ? <Skeleton className="w-24 h-3 mt-1" /> : (user?.email ?? 'No email')}
            </p>
          </div>
        </div>

        <div>
          {[
            { icon: User,     label: 'Username',    value: user?.githubUsername ? `@${user.githubUsername}` : null },
            { icon: Mail,     label: 'Email',       value: user?.email ?? 'Not provided' },
            { icon: Github,   label: 'Repository',  value: user?.repositoryName ?? 'Pending creation' },
            { icon: Calendar, label: 'Member since', value: user?.createdAt ? formatDate(user.createdAt) : null },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-3 border-b border-[#1a1a1a] last:border-0">
              <Icon className="w-3.5 h-3.5 text-[#555] shrink-0" />
              <span className="text-xs text-[#555] w-28 shrink-0">{label}</span>
              {isLoading
                ? <Skeleton className="h-3 w-32" />
                : <span className="text-xs text-[#ccc]">{value ?? '—'}</span>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Security audit */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[#555]" />
          <span className="text-xs font-semibold text-[#888]">Security</span>
        </div>
        <div>
          {[
            { icon: Lock,   label: 'Encryption',           value: 'AES-256-GCM' },
            { icon: Key,    label: 'Key derivation',        value: 'HKDF-SHA256' },
            { icon: Shield, label: 'Master key storage',    value: 'Encrypted at rest' },
            { icon: Github, label: 'GitHub token storage',  value: 'Encrypted at rest' },
            { icon: Key,    label: 'API key storage',       value: 'SHA-256 hash only' },
            { icon: Cookie, label: 'Session cookies',       value: 'HttpOnly · SameSite · Secure' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-2.5 border-b border-[#1a1a1a] last:border-0">
              <Icon className="w-3.5 h-3.5 text-[#444] shrink-0" />
              <span className="text-xs text-[#555] flex-1">{label}</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-5 border-red-500/10">
        <p className="text-xs font-semibold text-red-400 mb-1">Danger zone</p>
        <p className="text-xs text-[#555] mb-4">
          Account deletion is not available in this version. Contact support if needed.
        </p>
        <button disabled className="btn-danger btn-sm opacity-30 cursor-not-allowed">
          Delete account
        </button>
      </div>
    </div>
  );
}
