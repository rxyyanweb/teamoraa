'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, X } from 'lucide-react';
import { api } from '@/services/api';
import type { NotificationItem } from '@/types/api';
import { Button } from '@/components/ui/button';
export function NotificationsPopover() {
  const [open, setOpen] = useState(false),
    [items, setItems] = useState<NotificationItem[]>([]),
    [unread, setUnread] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    close = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const d = await api.get<{ notifications: NotificationItem[]; unreadCount: number }>(
          '/notifications',
        );
        if (active) {
          setItems(d.notifications);
          setUnread(d.unreadCount);
          setError('');
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Unable to load notifications.');
      }
    }
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const outside = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  async function read(item?: NotificationItem) {
    setLoading(true);
    try {
      await api.mutate(
        item ? `/notifications/${item._id}/read` : '/notifications/read-all',
        {},
        item ? 'PATCH' : 'POST',
      );
      setItems((old) => old.map((n) => (!item || n._id === item._id ? { ...n, read: true } : n)));
      setUnread((n) => (item ? Math.max(0, n - (item.read ? 0 : 1)) : 0));
      if (item?.link) {
        setOpen(false);
        router.push(item.link);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update notifications.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      className="relative"
      ref={container}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Button
        ref={trigger}
        variant="ghost"
        size="icon"
        aria-label="Open notifications"
        aria-expanded={open}
        aria-controls="notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-0 top-0 size-4 rounded-full bg-primary text-primary-foreground text-[10px]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>
      {open && (
        <section id="notifications" className="notification-panel" aria-label="Notifications">
          <header className="flex items-center justify-between p-4 border-b">
            <h2 className="text-sm font-semibold">Notifications {unread > 0 && `(${unread})`}</h2>
            <Button
              ref={close}
              variant="ghost"
              size="icon"
              aria-label="Close notifications"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <X size={16} />
            </Button>
          </header>
          {error && (
            <p role="alert" className="notice notice-error m-3">
              {error}
            </p>
          )}
          <div className="max-h-80 overflow-y-auto">
            {!items.length && !error ? (
              <div className="empty-state">
                <Bell className="text-muted-foreground mb-3" />
                <p className="text-sm">You’re all caught up</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Updates from your workplace will appear here.
                </p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  className="notification-item"
                  disabled={loading}
                  onClick={() => void read(n)}
                >
                  <span
                    className={`mt-2 size-2 shrink-0 rounded-full ${n.read ? 'bg-muted' : 'bg-primary'}`}
                  />
                  <span>
                    <strong className="block text-xs">{n.title}</strong>
                    <span className="block text-xs text-muted-foreground mt-1">{n.message}</span>
                    <small className="block text-[11px] text-muted-foreground mt-2">
                      {new Date(n.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </small>
                  </span>
                </button>
              ))
            )}
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              className="w-full rounded-none border-t"
              disabled={loading}
              onClick={() => void read()}
            >
              <CheckCheck size={15} />
              Mark all as read
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
