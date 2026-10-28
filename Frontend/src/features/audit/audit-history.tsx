'use client';
import { useState } from 'react';
import {
  Search,
  Filter,
  Shield,
  Eye,
  X,
  Calendar,
  Globe,
  Terminal,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Feedback, Loading } from '@/components/shared/feedback';
import type { AuditLogItem } from '@/types/api';

const ENTITY_OPTIONS = [
  { label: 'All Entities', value: '' },
  { label: 'Company', value: 'company' },
  { label: 'User / Account', value: 'user' },
  { label: 'Employee', value: 'employee' },
  { label: 'Attendance', value: 'attendance' },
  { label: 'Leave', value: 'leave' },
  { label: 'Payroll', value: 'payroll' },
  { label: 'Announcement', value: 'announcement' },
];

const ACTION_OPTIONS = [
  { label: 'All Actions', value: '' },
  { label: 'Auth Sign In', value: 'auth.login' },
  { label: 'Password Changed', value: 'auth.password_changed' },
  { label: 'Company Initialized', value: 'company.setup' },
  { label: 'HR Created', value: 'user.hr_created' },
  { label: 'Employee Registered', value: 'employee.registered' },
  { label: 'Attendance Recorded', value: 'attendance.record' },
  { label: 'Leave Applied', value: 'leave.created' },
  { label: 'Leave Decided', value: 'leave.decided' },
  { label: 'Payroll Finalized', value: 'payroll.finalized' },
  { label: 'Announcement Created', value: 'announcement.created' },
  { label: 'Announcement Deleted', value: 'announcement.deleted' },
];

export function AuditHistory() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AuditLogItem | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', '25');
  if (search) queryParams.set('search', search);
  if (action) queryParams.set('action', action);
  if (entity) queryParams.set('entity', entity);
  if (startDate) queryParams.set('startDate', startDate);
  if (endDate) queryParams.set('endDate', endDate);

  const { data, loading, error, reload } = useResource<{
    events: AuditLogItem[];
    total: number;
    pageSize: number;
  }>(`/audit?${queryParams.toString()}`);

  const handleResetFilters = () => {
    setSearch('');
    setAction('');
    setEntity('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">ACCOUNTABILITY & SECURITY</p>
          <h1 className="page-heading flex items-center gap-2">
            <Shield className="size-6 text-success" />
            Audit History & Security Trail
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Immutable, append-only record of all company activity, access attempts, and
            administrative changes.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono text-success bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/40">
            Total Logged Events: {data?.total ?? '…'}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 bg-muted border-border/60">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search keyword..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-border bg-muted pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <select
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* End Date & Reset */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {(search || action || entity || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-white shrink-0"
                title="Reset filters"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Events Table Card */}
      <Card className="overflow-hidden p-0 border-border/60">
        {loading ? (
          <div className="p-8">
            <Loading text="Retrieving audit records..." />
          </div>
        ) : error ? (
          <div className="space-y-4 p-6">
            <Feedback message={error} />
            <Button onClick={() => void reload()}>Try again</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Actor</th>
                  <th>Network / Client</th>
                  <th>Timestamp</th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {data?.events.map((event) => {
                  const actorName =
                    typeof event.actorId === 'object' && event.actorId
                      ? event.actorId.name
                      : String(event.actorId ?? 'System');
                  const actorRole =
                    typeof event.actorId === 'object' && event.actorId
                      ? event.actorId.role
                      : event.actorRole;

                  return (
                    <tr key={event._id} className="hover:bg-muted">
                      <td>
                        <Badge className="font-mono text-[10px]">{event.action}</Badge>
                      </td>
                      <td>
                        <span className="capitalize text-xs font-medium text-muted-foreground">
                          {event.entity || 'General'}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white">{actorName}</span>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            Role: {actorRole}
                          </span>
                        </div>
                      </td>
                      <td className="text-[11px] font-mono text-muted-foreground">
                        {event.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString('en-GB', {
                          timeZone: 'Asia/Karachi',
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEvent(event)}
                          className="h-7 px-2.5 text-xs text-success hover:text-success gap-1.5"
                        >
                          <Eye className="size-3.5" />
                          <span>Inspect</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!data?.events.length && (
              <p className="p-12 text-center text-sm text-muted-foreground">
                No audit events matched your search filters.
              </p>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-between border-t border-border/40 p-4">
            <p className="text-xs text-muted-foreground">
              Showing page {page} of {Math.ceil(data.total / data.pageSize)} ({data.total} total)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Event Details Slide-Over Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex h-full w-full max-w-md flex-col bg-muted border-l border-border shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="size-5 text-success" />
                <h3 className="text-sm font-bold text-white">Audit Event Details</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedEvent(null)}
                className="text-muted-foreground hover:text-white"
              >
                <X className="size-5" />
              </Button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block">Event ID</span>
                <span className="font-mono text-muted-foreground">{selectedEvent._id}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Action</span>
                  <Badge className="font-mono text-[10px] mt-1">{selectedEvent.action}</Badge>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Entity</span>
                  <span className="font-semibold text-white capitalize mt-1 block">
                    {selectedEvent.entity}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground block">Actor Information</span>
                <div className="rounded-lg bg-muted p-2.5 mt-1 border border-border/40">
                  <p className="font-semibold text-white">
                    {typeof selectedEvent.actorId === 'object' && selectedEvent.actorId
                      ? selectedEvent.actorId.name
                      : String(selectedEvent.actorId ?? 'System')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Role:{' '}
                    <span className="capitalize text-success">
                      {typeof selectedEvent.actorId === 'object' && selectedEvent.actorId
                        ? selectedEvent.actorId.role
                        : selectedEvent.actorRole}
                    </span>
                  </p>
                  {typeof selectedEvent.actorId === 'object' && selectedEvent.actorId?.email && (
                    <p className="text-[11px] text-muted-foreground">
                      Email: {selectedEvent.actorId.email}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground block">Client & Network</span>
                <div className="rounded-lg bg-muted p-2.5 mt-1 border border-border/40 space-y-1">
                  <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                    <Globe className="size-3 text-success" />
                    IP: {selectedEvent.ipAddress || '127.0.0.1'}
                  </p>
                  {selectedEvent.userAgent && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      UA: {selectedEvent.userAgent}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground block">Recorded Timestamp</span>
                <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Clock className="size-3 text-success" />
                  {new Date(selectedEvent.createdAt).toUTCString()} (
                  {new Date(selectedEvent.createdAt).toLocaleString('en-GB', {
                    timeZone: 'Asia/Karachi',
                  })}{' '}
                  PKT)
                </p>
              </div>

              {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-1">
                    Event Payload / Metadata:
                  </span>
                  <pre className="rounded-lg bg-muted p-3 font-mono text-[10px] text-success border border-border/50 overflow-x-auto max-h-60 leading-normal">
                    {JSON.stringify(selectedEvent.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
