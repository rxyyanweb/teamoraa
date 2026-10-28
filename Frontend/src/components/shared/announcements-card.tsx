'use client';
import { AccessibleModal } from '@/components/workforce/modal';
import { useState } from 'react';
import {
  Megaphone,
  Pin,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  User as UserIcon,
} from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import { api } from '@/services/api';
import type { AnnouncementItem, Role } from '@/types/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Feedback, Loading } from '@/components/shared/feedback';

export function AnnouncementsCard({ userRole }: { userRole: Role }) {
  const { data, loading, error, reload } = useResource<
    { announcements: AnnouncementItem[] } | AnnouncementItem[]
  >('/announcements');

  const items: AnnouncementItem[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.announcements)
      ? data.announcements
      : [];

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const canManage = userRole === 'admin' || userRole === 'hr';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setFormError('');
    try {
      await api.mutate('/announcements', { title, content, priority, pinned }, 'POST');
      setTitle('');
      setContent('');
      setPriority('normal');
      setPinned(false);
      setModalOpen(false);
      void reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to publish announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      void reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete announcement.');
    }
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-warning">
            <Megaphone className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Company Announcements
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Official notices and workplace updates
            </p>
          </div>
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-8 gap-1.5 text-xs bg-primary hover:bg-[var(--primary-hover)] text-primary-foreground font-medium"
          >
            <Plus className="size-3.5" />
            Post notice
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6">
            <Loading text="Loading announcements..." />
          </div>
        ) : error ? (
          <div className="p-4">
            <Feedback message={error} />
          </div>
        ) : !items.length ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Megaphone className="size-6 mx-auto mb-2 opacity-30" />
            No announcements posted yet.
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {items.map((a) => {
              const authorName =
                typeof a.authorId === 'object' && a.authorId ? a.authorId.name : 'Management';
              const authorRole =
                typeof a.authorId === 'object' && a.authorId ? a.authorId.role : '';

              return (
                <div
                  key={a._id}
                  className={`p-4 transition-colors ${
                    a.pinned ? 'bg-amber-500/[0.04]' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {a.pinned && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning border border-amber-500/20">
                            <Pin className="size-3" /> Pinned
                          </span>
                        )}
                        {a.priority === 'urgent' && (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger border border-rose-500/20">
                            <AlertCircle className="size-3" /> Urgent
                          </span>
                        )}
                        <h4 className="text-sm font-semibold text-foreground">{a.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line leading-relaxed">
                        {a.content}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UserIcon className="size-3" />
                          {authorName}{' '}
                          {authorRole && <span className="capitalize">({authorRole})</span>}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(a.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(a._id)}
                        className="text-muted-foreground hover:text-danger shrink-0 h-7 w-7"
                        title="Delete announcement"
                        aria-label="Delete announcement"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* New Announcement Modal */}
      {modalOpen && (
        <AccessibleModal title="Company announcement" onClose={() => setModalOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-muted p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-1">Create Company Announcement</h3>
            <p className="text-xs text-muted-foreground mb-4">
              All company members will be notified immediately upon publishing.
            </p>

            {formError && (
              <div className="mb-4">
                <Feedback message={formError} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="announcement-title"
                  className="text-xs font-medium text-muted-foreground block mb-1"
                >
                  Announcement Title
                </label>
                <input
                  type="text"
                  required
                  id="announcement-title"
                  maxLength={160}
                  placeholder="e.g. Office holiday notice"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="announcement-content"
                  className="text-xs font-medium text-muted-foreground block mb-1"
                >
                  Message Content
                </label>
                <textarea
                  required
                  rows={4}
                  id="announcement-content"
                  maxLength={5000}
                  placeholder="Provide details, dates, or instructions…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priority === 'urgent'}
                    onChange={(e) => setPriority(e.target.checked ? 'urgent' : 'normal')}
                    className="rounded border-border bg-muted text-danger focus:ring-rose-500"
                  />
                  <span className="text-xs text-muted-foreground font-medium">Mark as Urgent</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="rounded border-border bg-muted text-warning focus:ring-amber-500"
                  />
                  <span className="text-xs text-muted-foreground font-medium">Pin to Top</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-primary hover:bg-[var(--primary-hover)] text-primary-foreground font-medium"
                >
                  {saving ? 'Publishing...' : 'Publish Announcement'}
                </Button>
              </div>
            </form>
          </div>
        </AccessibleModal>
      )}
    </Card>
  );
}
