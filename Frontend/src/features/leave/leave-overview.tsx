'use client';
import { useState } from 'react';
import { motion } from 'motion/react';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/features/auth/auth-provider';
import type { LeaveOverview } from '@/types/workforce';
import {
  PageHeading,
  Metrics,
  Panel,
  SelectFilter,
  SearchFilter,
  LoadState,
  Notice,
  Empty,
  queryString,
  label,
} from '@/components/workforce/primitives';
import { LeaveTable, LeaveDetailsDrawer } from './leave-details';
export function LeaveOverviewPage() {
  const { user } = useAuth();
  const [year, setYear] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  const resource = useResource<LeaveOverview>(
    '/leave/overview?' + queryString({ year, status, department, search, page }),
  );
  const data = resource.data;
  const max = Math.max(...(data?.departmentUsage.map((d) => d.approvedDays) ?? []), 1);
  return (
    <>
      <PageHeading
        title={user?.role === 'hr' ? 'Leave approvals' : 'Leave overview'}
        description={
          user?.role === 'hr'
            ? 'Thoughtful time-off decisions, with the context you need. Your own requests require another HR reviewer.'
            : 'A clear picture of time away across your company. HR manages approval decisions.'
        }
      />
      <Notice message={notice} success />
      {data && (
        <Metrics
          items={[
            { label: 'Total requests', value: data.summary.total },
            { label: 'Pending', value: data.summary.pending },
            { label: 'Approved', value: data.summary.approved },
            { label: 'Rejected', value: data.summary.rejected },
            { label: 'Approved days', value: data.summary.approvedDays },
          ]}
        />
      )}
      <Panel
        title="Leave requests"
        description="Filter by year, team, status or employee. Open a request for its reason and current balance."
      >
        <div className="toolbar">
          <SearchFilter
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
          />
          <input
            type="number"
            aria-label="Leave year"
            min={2000}
            max={2100}
            className="w-24"
            value={year || data?.year || ''}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(1);
            }}
          />
          <SelectFilter
            label="All departments"
            value={department}
            onChange={(v) => {
              setDepartment(v);
              setPage(1);
            }}
            options={[
              { value: '__unassigned__', label: 'Unassigned' },
              ...(data?.departments ?? []).map((value) => ({ value, label: value })),
            ]}
          />
          <SelectFilter
            label="All statuses"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={['pending', 'approved', 'rejected', 'cancelled'].map((value) => ({
              value,
              label: label(value),
            }))}
          />
        </div>
        {data ? (
          <LeaveTable data={data} onPage={setPage} onSelect={setSelected} people />
        ) : (
          <LoadState error={resource.error} retry={resource.reload} />
        )}
      </Panel>
      {data && (
        <Panel
          title="Leave usage by department"
          description={
            'Approved working days in ' + data.year + '. Search and department filters apply.'
          }
        >
          {data.departmentUsage.length ? (
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              {data.departmentUsage.map((d) => (
                <div key={d.department}>
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="font-medium">{d.department}</span>
                    <span className="text-muted-foreground">
                      {d.approvedDays} days · {d.pending} pending
                    </span>
                  </div>
                  <div className="progress-track">
                    <motion.div
                      className="progress-fill"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: d.approvedDays / max }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No leave usage yet"
              description="Department summaries will appear as requests are submitted."
            />
          )}
        </Panel>
      )}
      <LeaveDetailsDrawer
        id={selected}
        onClose={() => setSelected('')}
        review={user?.role === 'hr'}
        onSaved={() => {
          setSelected('');
          setNotice('Decision saved. Leave balances and summaries are up to date.');
          resource.reload();
        }}
      />
    </>
  );
}
