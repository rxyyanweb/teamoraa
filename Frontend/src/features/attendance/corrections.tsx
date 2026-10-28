'use client';
import { useState } from 'react';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/features/auth/auth-provider';
import { api } from '@/services/api';
import type { Correction, Page } from '@/types/workforce';
import {
  Panel,
  Status,
  Pagination,
  Empty,
  LoadState,
  Detail,
  clockTime,
  duration,
  SelectFilter,
  label,
  queryString,
  Notice,
  dateLabel,
} from '@/components/workforce/primitives';
import { Drawer } from '@/components/workforce/drawer';
import { DecisionForm } from '@/components/workforce/decision-form';
import { Button } from '@/components/ui/button';
export function CorrectionList({
  personal = false,
  revision = 0,
  onChanged,
}: {
  personal?: boolean;
  revision?: number;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Correction | null>(null);
  const [notice, setNotice] = useState('');
  const resource = useResource<Page<Correction>>(
    '/attendance-corrections?' +
      queryString({ page, status, ...(personal ? { employeeId: user?.id ?? '' } : {}) }),
  );
  void revision;
  function saved() {
    setSelected(null);
    setNotice('Correction decision saved. Attendance has been refreshed.');
    resource.reload();
    onChanged?.();
  }
  return (
    <Panel
      title={personal ? 'Correction history' : 'Attendance corrections'}
      description={
        personal
          ? 'Requests never change official attendance until HR approves.'
          : 'Review the recorded and requested times before deciding.'
      }
    >
      <div className="toolbar">
        <SelectFilter
          label="All statuses"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={['pending', 'approved', 'rejected'].map((value) => ({
            value,
            label: label(value),
          }))}
        />
      </div>
      <div className="px-5">
        <Notice message={notice} success />
      </div>
      {!resource.data ? (
        <LoadState error={resource.error} retry={resource.reload} />
      ) : (
        <>
          {resource.data.items.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {!personal && <th>Employee</th>}
                    <th>Date</th>
                    <th>Requested shift</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((r) => (
                    <tr key={r.id}>
                      {!personal && (
                        <td>
                          {r.employee.name}
                          <p className="text-xs text-muted-foreground mt-1">
                            {r.employee.department || 'Unassigned'}
                          </p>
                        </td>
                      )}
                      <td>{dateLabel(r.date)}</td>
                      <td>
                        {clockTime(r.requested.checkedInAt, r.timezone)} –{' '}
                        {clockTime(r.requested.checkedOutAt, r.timezone)}
                      </td>
                      <td>
                        <Status value={r.status} />
                      </td>
                      <td>
                        <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                          View correction
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="No correction requests"
              description="Requests and their review outcomes will appear here."
            />
          )}
          <Pagination {...resource.data} onPage={setPage} />
        </>
      )}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Attendance correction"
        description={
          selected ? selected.employee.name + ' · ' + dateLabel(selected.date) : 'Review request'
        }
      >
        {selected && (
          <>
            <Detail label="Status">
              <Status value={selected.status} />
            </Detail>
            <Detail label="Recorded">
              {clockTime(selected.original.checkedInAt, selected.timezone)} –{' '}
              {clockTime(selected.original.checkedOutAt, selected.timezone)}
            </Detail>
            <Detail label="Requested">
              {clockTime(selected.requested.checkedInAt, selected.timezone)} –{' '}
              {clockTime(selected.requested.checkedOutAt, selected.timezone)}
              <p className="text-xs mt-1 text-muted-foreground">
                {duration(selected.requested.workedMinutes)} · {selected.timezone}
              </p>
            </Detail>
            <Detail label="Reason">{selected.reason}</Detail>
            <Detail label="New flags">
              {selected.requested.isLate ? 'Late. ' : ''}
              {selected.requested.isHalfDay ? 'Half day. ' : ''}
              {!selected.requested.isLate && !selected.requested.isHalfDay ? 'None' : ''}
            </Detail>
            {selected.decisionComment && (
              <Detail label="HR comment">
                {selected.decisionComment}
                <p className="text-xs text-muted-foreground mt-1">{selected.reviewer}</p>
              </Detail>
            )}
            {!personal && selected.canDecide && (
              <DecisionForm path={'/attendance-corrections/' + selected.id} onSaved={saved} />
            )}
          </>
        )}
      </Drawer>
    </Panel>
  );
}
export function CorrectionForm({ today, onSaved }: { today: string; onSaved: () => void }) {
  const [date, setDate] = useState(today);
  const [checkInTime, setIn] = useState('09:00');
  const [checkOutTime, setOut] = useState('18:00');
  const [nextDayCheckout, setNext] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.mutate('/attendance-corrections', {
        date,
        checkInTime,
        checkOutTime,
        nextDayCheckout,
        reason,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send request.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <label className="form-label">
        Attendance date
        <input
          required
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <div className="form-grid">
        <label className="form-label">
          Requested check in
          <input required type="time" value={checkInTime} onChange={(e) => setIn(e.target.value)} />
        </label>
        <label className="form-label">
          Requested check out
          <input
            required
            type="time"
            value={checkOutTime}
            onChange={(e) => setOut(e.target.value)}
          />
        </label>
      </div>
      <label className="flex gap-2 items-center text-xs mb-5">
        <input
          type="checkbox"
          checked={nextDayCheckout}
          onChange={(e) => setNext(e.target.checked)}
        />
        Check-out is on the following day
      </label>
      <label className="form-label">
        Reason
        <textarea
          required
          minLength={5}
          maxLength={1500}
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain what needs to be corrected…"
        />
      </label>
      <p className="text-xs text-muted-foreground mb-4">
        Times use the company timezone. HR will compare your request with the official record.
      </p>
      <Notice message={error} />
      <Button className="mt-4 w-full" disabled={busy}>
        {busy ? 'Sending…' : 'Submit correction request'}
      </Button>
    </form>
  );
}
