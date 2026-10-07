import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Files, Upload, Share2, Users,
  Key, Github, Database, Settings, LogOut,
  Shield, Menu, ChevronRight,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../hooks/useUser';
import { authApi } from '../../api/client';
import { Avatar } from '../../components/ui/Avatar';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/dashboard',            icon: LayoutDashboard, label: 'Overview',   end: true },
  { to: '/dashboard/files',      icon: Files,           label: 'Files' },
  { to: '/dashboard/upload',     icon: Upload,          label: 'Upload' },
  { to: '/dashboard/shared',     icon: Share2,          label: 'Shared' },
  { to: '/dashboard/workspaces', icon: Users,           label: 'Workspaces' },
  { to: '/dashboard/api',        icon: Key,             label: 'API Keys' },
  { to: '/dashboard/repository', icon: Github,          label: 'Repository' },
  { to: '/dashboard/storage',    icon: Database,        label: 'Storage' },
  { to: '/dashboard/settings',   icon: Settings,        label: 'Settings' },
];

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const { data: user } = useUser();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const logout = async () => {
    try {
      await authApi.post('/auth/logout');
      qc.clear();
      navigate('/login');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center shrink-0">
            <Shield className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="text-sm font-semibold text-[#ededed]">Free Store</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNav}
            className={({ isActive }) =>
              isActive ? 'sidebar-item-active' : 'sidebar-item'
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#1a1a1a] p-2">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-[#1a1a1a] transition-colors group">
            <Avatar name={user.githubUsername} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#ededed] truncate">{user.githubUsername}</p>
              <p className="text-[10px] text-[#555] truncate">{user.email ?? 'GitHub user'}</p>
            </div>
            <button
              onClick={logout}
              className="opacity-0 group-hover:opacity-100 p-1 text-[#555] hover:text-red-400 rounded transition-all"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col border-r border-[#1a1a1a] bg-black">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[220px] bg-black border-r border-[#1a1a1a] flex flex-col animate-slide-in">
            <SidebarContent onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-12 border-b border-[#1a1a1a] flex items-center justify-between px-4 shrink-0">
          <button
            className="lg:hidden btn-icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 text-xs text-[#555]">
            <span>Free Store</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#888]">Dashboard</span>
          </div>
          <div className="w-8" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
