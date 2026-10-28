'use client';
import { ThemeSwitch } from '@/components/theme/theme-provider';
import { initials } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  UserRound,
  Clock3,
  CalendarDays,
  ShieldCheck,
  Building2,
  ScrollText,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Leaf,
  Banknote,
  Receipt,
  type LucideIcon,
} from 'lucide-react';
import { Brand } from '@/components/shared/brand';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/workforce/drawer';
import { homeFor } from '@/lib/portal';
import type { User } from '@/types/api';
type NavItem = { href: string; label: string; icon: LucideIcon };
function NavGroup({
  title,
  links,
  compact,
  close,
  id,
}: {
  title: string;
  links: NavItem[];
  compact: boolean;
  close: () => void;
  id: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const path = usePathname();
  return (
    <div>
      <button
        className="nav-group-label"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={title}
      >
        {compact ? (
          <span>•••</span>
        ) : (
          <>
            {title}
            <ChevronDown size={13} className={expanded ? '' : '-rotate-90'} />
          </>
        )}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-1"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                title={compact ? link.label : undefined}
                aria-label={compact ? link.label : undefined}
                aria-current={path === link.href ? 'page' : undefined}
                onClick={close}
                className={'sidebar-link ' + (path === link.href ? 'active' : '')}
              >
                {path === link.href && (
                  <motion.span layoutId={'active-' + id} className="nav-highlight" />
                )}
                <link.icon size={18} strokeWidth={1.7} />
                {!compact && <span>{link.label}</span>}
              </Link>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
export function Sidebar({
  user,
  open,
  close,
  collapsed,
  toggle,
}: {
  user: User;
  open: boolean;
  close: () => void;
  collapsed: boolean;
  toggle: () => void;
}) {
  const base = user.role === 'admin' ? '/admin' : '/' + user.role;
  const operations: NavItem[] = [
    { href: homeFor(user), label: 'Overview', icon: LayoutDashboard },
    ...(user.role !== 'employee'
      ? [{ href: base + '/employees', label: 'People directory', icon: Users }]
      : []),
    { href: base + '/attendance', label: 'Attendance', icon: Clock3 },
    {
      href: base + '/leave',
      label: user.role === 'hr' ? 'Leave approvals' : 'Leave',
      icon: CalendarDays,
    },
    ...(user.role !== 'employee'
      ? [{ href: base + '/payroll', label: 'Payroll & Salaries', icon: Banknote }]
      : []),
    ...(user.role === 'employee'
      ? [{ href: '/employee/payslips', label: 'My Payslips', icon: Receipt }]
      : []),
  ];
  const personal: NavItem[] = [
    ...(user.role === 'hr'
      ? [
          { href: '/hr/my-attendance', label: 'My attendance', icon: Clock3 },
          { href: '/hr/my-leave', label: 'My leave', icon: CalendarDays },
        ]
      : []),
    { href: base + '/profile', label: 'My profile', icon: UserRound },
  ];
  const settings: NavItem[] = [
    { href: base + '/hr-accounts', label: 'HR accounts', icon: ShieldCheck },
    { href: base + '/organization', label: 'Organization', icon: Building2 },
    { href: base + '/leave-settings', label: 'Leave policy', icon: Settings2 },
    { href: base + '/audit', label: 'Audit history', icon: ScrollText },
  ];
  function content(compact: boolean, id: string) {
    return (
      <>
        <div className="px-3 mb-5">
          {compact ? <Leaf size={25} className="text-primary" /> : <Brand />}
        </div>
        {!compact && (
          <div className="mx-2 rounded-lg bg-muted px-3 py-3 mb-2">
            <p className="text-xs font-semibold capitalize">
              {user.role === 'admin' ? 'Company' : user.role} workspace
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Your people, in sync.</p>
          </div>
        )}
        <NavGroup title="Workspace" links={operations} compact={compact} close={close} id={id} />
        <NavGroup title="Personal" links={personal} compact={compact} close={close} id={id} />
        {user.role === 'admin' && (
          <NavGroup
            title="Administration"
            links={settings}
            compact={compact}
            close={close}
            id={id}
          />
        )}
        {!compact && (
          <div className="mt-6">
            <ThemeSwitch />
          </div>
        )}
        <div className="sidebar-profile">
          <span className="avatar">{initials(user.name)}</span>
          {!compact && (
            <div className="min-w-0">
              <p className="truncate">{user.name}</p>
              <small>{user.role} account</small>
            </div>
          )}
        </div>
      </>
    );
  }
  return (
    <>
      <aside className={'sidebar ' + (collapsed ? 'sidebar-compact' : '')}>
        {content(collapsed, 'desktop')}
        <div className="mt-auto pt-6 px-1">
          <Button
            variant="ghost"
            className="w-full"
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <>
                <PanelLeftClose size={17} />
                <span className="text-xs">Collapse sidebar</span>
              </>
            )}
          </Button>
        </div>
      </aside>
      <Drawer
        open={open}
        onClose={close}
        title="Teamora"
        description="Navigate your workspace"
        side="left"
      >
        {content(false, 'mobile')}
      </Drawer>
    </>
  );
}
