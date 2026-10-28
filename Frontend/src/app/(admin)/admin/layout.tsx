import { WorkspaceShell } from '@/components/layout/workspace-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell role="admin">{children}</WorkspaceShell>;
}
