import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#2e2e2e] flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#444]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#666]">{title}</p>
        {description && <p className="text-xs text-[#444] mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}
