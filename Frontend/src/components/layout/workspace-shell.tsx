'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ThemeSwitch } from '@/components/theme/theme-provider';
import { Menu, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-provider';
import { homeFor } from '@/lib/portal';
import { initials } from '@/lib/utils';
import type { Role } from '@/types/api';
import { Entrance } from '@/components/workforce/primitives';
import { Sidebar } from '@/components/navigation/sidebar';
import { Button } from '@/components/ui/button';
import { Feedback, Loading } from '@/components/shared/feedback';
import { NotificationsPopover } from '@/components/shared/notifications-popover';
import { AiAssistantDrawer } from '@/components/ai/ai-assistant-drawer';
export function WorkspaceShell({ role, children }: { role: Role; children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setCollapsed(localStorage.getItem('teamora-sidebar') === 'collapsed');
      } catch {}
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  function toggleSidebar() {
    setCollapsed((value) => {
      try {
        localStorage.setItem('teamora-sidebar', value ? 'expanded' : 'collapsed');
      } catch {}
      return !value;
    });
  }

  useEffect(() => {
    if (auth.loading || auth.error) return;
    if (!auth.user) router.replace('/login');
    else if (auth.user.mustChangePassword || auth.user.role !== role)
      router.replace(homeFor(auth.user));
  }, [auth.loading, auth.error, auth.user, role, router, pathname]);
  if (auth.loading) return <Loading />;
  if (auth.error)
    return (
      <main className="mx-auto max-w-xl p-8">
        <Feedback message={auth.error} />
        <Button className="mt-4" onClick={() => void auth.refresh()}>
          Try again
        </Button>
      </main>
    );
  if (!auth.user || auth.user.mustChangePassword || auth.user.role !== role)
    return <Loading text="Opening your workspace…" />;
  const title = pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') ?? 'Overview';
  return (
    <div className={`workspace ${collapsed ? 'workspace-compact' : ''}`}>
      <a href="#workspace-content" className="skip-link">
        Skip to content
      </a>
      <Sidebar
        user={auth.user}
        open={open}
        close={() => setOpen(false)}
        collapsed={collapsed}
        toggle={toggleSidebar}
      />
      <div className="workspace-main">
        <header className="workspace-header">
          <div className="flex items-center gap-3">
            <Button
              className="md:hidden"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </Button>
            <span className="hidden text-xs text-muted-foreground sm:inline">Workspace</span>
            <ChevronRight className="hidden size-3.5 text-muted-foreground sm:inline" />
            <span className="text-xs font-medium capitalize">
              {title === 'dashboard' ? 'Overview' : title}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:block">
              <ThemeSwitch compact />
            </div>
            <NotificationsPopover />
            <div className="hidden h-6 border-l lg:block" />
            <span className="avatar">{initials(auth.user.name)}</span>
            <div className="hidden lg:block">
              <p className="text-xs font-semibold">{auth.user.name}</p>
              <p className="mt-1 text-[10px] text-muted-foreground capitalize">{auth.user.role}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => void auth.logout().catch((error) => setError(error.message))}
            >
              <LogOut className="size-[17px]" />
            </Button>
          </div>
        </header>
        <main id="workspace-content" tabIndex={-1} className="page-content">
          {error && (
            <div className="mb-5">
              <Feedback message={error} />
            </div>
          )}
          <Entrance key={pathname}>{children}</Entrance>
        </main>
        <AiAssistantDrawer userRole={auth.user.role} />
      </div>
    </div>
  );
}
