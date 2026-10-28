'use client';
import { useState } from 'react';
import { useResource } from '@/hooks/use-resource';
import { api } from '@/services/api';
import type { LeaveRequest, Balance, Page } from '@/types/workforce';
import { Button } from '@/components/ui/button';
import { DecisionForm } from '@/components/workforce/decision-form';
import { Drawer } from '@/components/workforce/drawer';
import {
  Detail,
  Status,
  LoadState,
  Notice,
  Empty,
  Pagination,
  dateLabel,
} from '@/components/workforce/primitives';
export function LeaveTable({
  data,
  onPage,
  onSelect,
  people = false,
}: {
  data: Page<LeaveRequest>;
  onPage: (v: number) => void;
  onSelect: (id: string) => void;
  people?: boolean;
}) {
  return (
    <>
      {data.items.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {people && <th>Employee</th>}
                <th>Leave type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  {people && (
                    <td className="font-medium">
                      {r.employee?.name}
                      <p className="text-xs font-normal text-muted-foreground mt-1">
                        {r.employee?.department || 'Unassigned'}
                      </p>
                    </td>
                  )}
                  <td>{r.typeName}</td>
                  <td>
                    {dateLabel(r.startDate)}
                    <p className="text-xs text-muted-foreground mt-1">to {dateLabel(r.endDate)}</p>
                  </td>
                  <td>{r.workingDays}</td>
                  <td>
                    <Status value={r.status} />
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => onSelect(r.id)}>
                      View request
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="No leave requests"
          description="Requests matching your selected year and filters will appear here."
        />
      )}
      <Pagination {...data} onPage={onPage} />
    </>
  );
}
function RequestDetails({
  id,
  review,
  onSaved,
}: {
  id: string;
  review: boolean;
  onSaved: () => void;
}) {
  const resource = useResource<{ request: LeaveRequest; availability: Balance[] }>(
    '/leave/requests/' + id,
  );
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function cancel() {
    setBusy(true);
    setError('');
    try {
      await api.mutate('/leave/requests/' + id + '/cancel');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to cancel leave.');
      resource.reload();
    } finally {
      setBusy(false);
    }
  }
  if (!resource.data) return <LoadState error={resource.error} retry={resource.reload} />;
  const r = resource.data.request;
  return (
    <>
      <Detail label="Employee">
        {r.employee?.name}
        <p className="text-xs text-muted-foreground mt-1">
          {r.employee?.department || 'Unassigned'}
        </p>
      </Detail>
      <Detail label="Status">
        <Status value={r.status} />
      </Detail>
      <Detail label="Leave type">{r.typeName}</Detail>
      <Detail label="Dates">
        {dateLabel(r.startDate)} – {dateLabel(r.endDate)}
      </Detail>
      <Detail label="Working days">{r.workingDays}</Detail>
      <Detail label="Reason">{r.reason}</Detail>
      <Detail label="Availability">
        {resource.data.availability.filter(Boolean).map((b) => (
          <p key={b.year}>
            {b.year}: {b.available ?? 'Unlimited'} {b.available === null ? '' : 'days available'}
          </p>
        ))}
      </Detail>
      <p className="text-xs text-muted-foreground my-3">
        Only approved leave consumes quota. Availability is checked again when HR approves.
      </p>
      {r.decisionComment && (
        <Detail label="Decision">
          {r.decisionComment}
          <p className="text-xs text-muted-foreground mt-1">{r.reviewer}</p>
        </Detail>
      )}
      {review && r.canDecide && <DecisionForm path={'/leave/requests/' + id} onSaved={onSaved} />}
      <Notice message={error} />
      {r.canCancel && (
        <div className="mt-6 border-t pt-5">
          {confirm ? (
            <>
              <p className="text-sm mb-3">Cancel this leave request?</p>
              <div className="flex gap-2">
                <Button variant="destructive" disabled={busy} onClick={() => void cancel()}>
                  {busy ? 'Cancelling…' : 'Confirm cancellation'}
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>
                  Keep request
                </Button>
              </div>
            </>
          ) : (
            <Button variant="outline" onClick={() => setConfirm(true)}>
              Cancel request
            </Button>
          )}
        </div>
      )}
    </>
  );
}
export function LeaveDetailsDrawer({
  id,
  onClose,
  onSaved,
  review = false,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
  review?: boolean;
}) {
  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      title="Leave request"
      description="Request details, balance and review history."
    >
      {id && <RequestDetails key={id} id={id} review={review} onSaved={onSaved} />}
    </Drawer>
  );
}
