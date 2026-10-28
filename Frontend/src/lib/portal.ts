import type { User, Role } from '@/types/api';

export type Portal = 'admin' | 'staff';

export function getPortal(): Portal {
  if (typeof window === 'undefined') return 'staff';
  try {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/admin') || pathname.startsWith('/setup')) {
      return 'admin';
    }
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('role') === 'admin') {
      return 'admin';
    }
    const storedRole = localStorage.getItem('teamora-active-role');
    if (storedRole === 'admin') {
      return 'admin';
    }
  } catch {
    // Fallback for non-browser or storage restricted environments
  }
  return 'staff';
}

export function setActivePortalRole(role: Role | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (role) {
      localStorage.setItem('teamora-active-role', role);
    } else {
      localStorage.removeItem('teamora-active-role');
    }
  } catch {
    // Storage access restricted
  }
}

export const portal = 'staff' as Portal;
export const isAdminPortal = false;

export function homeFor(user: User): string {
  if (user.mustChangePassword) return '/change-password';
  return user.role === 'admin' ? '/admin/dashboard' : `/${user.role}/dashboard`;
}
