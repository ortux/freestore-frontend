import { useState } from 'react';
import {
  Users, Plus, Trash2, ChevronDown, Crown,
  Shield, Eye, UserCheck, UserPlus,
} from 'lucide-react';
import {
  useWorkspaces, useCreateWorkspace, useDeleteWorkspace,
  useWorkspaceMembers, useInviteMember, useUpdateMemberRole, useRemoveMember,
} from '../../hooks/useWorkspaces';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { formatDate } from '../../utils/format';
import type { Role } from '../../api/workspaces';

const ROLE_CONFIG: Record<Role, { cls: string; icon: React.ElementType; label: string }> = {
  OWNER:  { cls: 'badge-blue',   icon: Crown,     label: 'Owner' },
  ADMIN:  { cls: 'badge-green',  icon: Shield,    label: 'Admin' },
  MEMBER: { cls: 'badge-amber',  icon: UserCheck, label: 'Member' },
  VIEWER: { cls: 'badge-gray',   icon: Eye,       label: 'Viewer' },
};

function RoleBadge({ role }: { role: Role }) {
  const { cls, icon: Icon, label } = ROLE_CONFIG[role];
  return <span className={`${cls} badge`}><Icon className="w-2.5 h-2.5" />{label}</span>;
}

function MembersPanel({ workspaceId, myRole }: { workspaceId: string; myRole: Role }) {
  const { data: members = [], isLoading } = useWorkspaceMembers(workspaceId);
  const invite     = useInviteMember(workspaceId);
  const updateRole = useUpdateMemberRole(workspaceId);
  const remove     = useRemoveMember(workspaceId);
  const [showInvite, setShowInvite] = useState(false);
  const [username, setUsername]     = useState('');
  const [role, setRole]             = useState<Role>('MEMBER');

  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  return (
    <div className="px-4 pb-4 pt-3 border-t border-[#1a1a1a] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#555]">{members.length} member{members.length !== 1 ? 's' : ''}</span>
        {canManage && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="btn-ghost btn-sm gap-1"
          >
            <UserPlus className="w-3 h-3" /> Invite
          </button>
        )}
      </div>

      {showInvite && (
        <div className="flex gap-2 p-3 bg-[#0a0a0a] rounded-md border border-[#222]">
          <input
            className="input text-xs flex-1"
            placeholder="GitHub username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <select className="select text-xs w-28" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="VIEWER">Viewer</option>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            className="btn-primary btn-sm"
            disabled={!username.trim() || invite.isPending}
            onClick={() => {
              invite.mutate({ githubUsername: username.trim(), role });
              setUsername('');
              setShowInvite(false);
            }}
          >
            {invite.isPending ? '…' : 'Add'}
          </button>
        </div>
      )}

      <div className="space-y-1">
        {isLoading ? (
          <div className="text-xs text-[#444] py-2">Loading…</div>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 py-1.5">
              <Avatar name={m.user.githubUsername} size="sm" />
              <span className="text-xs text-[#888] flex-1 truncate">@{m.user.githubUsername}</span>
              {canManage && m.role !== 'OWNER' ? (
                <select
                  className="bg-[#111] border border-[#2e2e2e] rounded text-[10px] text-[#888] px-1.5 py-0.5"
                  value={m.role}
                  onChange={(e) => updateRole.mutate({ userId: m.user.id, role: e.target.value as Role })}
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              ) : (
                <RoleBadge role={m.role} />
              )}
              {canManage && m.role !== 'OWNER' && (
                <button
                  onClick={() => remove.mutate(m.user.id)}
                  className="text-[#444] hover:text-red-400 transition-colors p-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function WorkspacesPage() {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const create    = useCreateWorkspace();
  const deleteWs  = useDeleteWorkspace();
  const [expanded,      setExpanded]      = useState<string | null>(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [newName,       setNewName]       = useState('');
  const [newDesc,       setNewDesc]       = useState('');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#ededed]">Workspaces</h1>
          <p className="text-xs text-[#555] mt-0.5">Role-based access control for team collaboration</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-secondary btn-sm gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, { cls, icon: Icon, label }]) => (
          <div key={role} className="card p-3 space-y-1.5">
            <span className={`${cls} badge`}><Icon className="w-2.5 h-2.5" />{label}</span>
            <p className="text-[10px] text-[#444] leading-relaxed">
              {role === 'OWNER'  && 'Full control, delete workspace'}
              {role === 'ADMIN'  && 'Manage files, members, storage'}
              {role === 'MEMBER' && 'Upload and share files'}
              {role === 'VIEWER' && 'Read-only access'}
            </p>
          </div>
        ))}
      </div>

      {/* Workspace list */}
      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !workspaces.length ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="No workspaces yet"
            description="Create one to start collaborating with your team"
            action={
              <button onClick={() => setShowCreate(true)} className="btn-secondary btn-sm">
                Create workspace
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          {workspaces.map((ws) => (
            <div key={ws.id} className="card overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#0a0a0a] transition-colors"
                onClick={() => setExpanded(expanded === ws.id ? null : ws.id)}
              >
                <div className="w-8 h-8 rounded bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5 text-[#444]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[#ededed]">{ws.name}</span>
                    {ws.role && <RoleBadge role={ws.role} />}
                  </div>
                  {ws.description && (
                    <p className="text-[10px] text-[#555] truncate mt-0.5">{ws.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-[#444] hidden sm:block">{formatDate(ws.createdAt)}</span>
                  {ws.role === 'OWNER' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(ws.id); }}
                      className="btn-icon p-1 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-[#444] transition-transform ${expanded === ws.id ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>
              {expanded === ws.id && ws.role && (
                <MembersPanel workspaceId={ws.id} myRole={ws.role} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create workspace">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Name</label>
            <input
              className="input text-xs"
              placeholder="My team"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">
              Description <span className="normal-case text-[#444]">(optional)</span>
            </label>
            <input
              className="input text-xs"
              placeholder="What this workspace is for"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setShowCreate(false)} className="btn-secondary btn-sm">Cancel</button>
            <button
              className="btn-primary btn-sm"
              disabled={!newName.trim() || create.isPending}
              onClick={() => {
                create.mutate(
                  { name: newName, description: newDesc || undefined },
                  { onSuccess: () => { setShowCreate(false); setNewName(''); setNewDesc(''); } }
                );
              }}
            >
              {create.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete workspace?">
        <p className="text-xs text-[#888] mb-4 leading-relaxed">
          This permanently deletes the workspace and removes all members.
          Files in storage are not affected.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary btn-sm">Cancel</button>
          <button
            className="btn-danger btn-sm"
            disabled={deleteWs.isPending}
            onClick={() => deleteWs.mutate(confirmDelete!, { onSuccess: () => setConfirmDelete(null) })}
          >
            {deleteWs.isPending ? 'Deleting…' : 'Delete workspace'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
