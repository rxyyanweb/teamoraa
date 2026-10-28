'use client';
import { useState } from 'react';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/features/auth/auth-provider';
import type { AttendanceBoard, PersonalAttendance, Person } from '@/types/workforce';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/workforce/drawer';
import {
  PageHeading,
  Metrics,
  Panel,
  SelectFilter,
  SearchFilter,
  Status,
  LoadState,
  Empty,
  Pagination,
  queryString,
  clockTime,
  duration,
  label,
} from '@/components/workforce/primitives';
import { AttendanceHistory } from './attendance-history';
import { CorrectionList } from './corrections';
function EmployeeHistory({ person, month: initial }: { person: Person; month: string }) {
  const [month, setMonth] = useState(initial);
  const [page, setPage] = useState(1);
  const resource = useResource<PersonalAttendance>(
    '/attendance/employees/' + person.id + '?' + queryString({ month, page }),
  );
  return resource.data ? (
    <AttendanceHistory
      data={resource.data}
      onMonth={(m) => {
        setMonth(m);
        setPage(1);
      }}
      onPage={setPage}
    />
  ) : (
    <LoadState error={resource.error} retry={resource.reload} />
  );
}
export function AttendanceBoardPage() {
  const { user } = useAuth();
  const [date, setDate] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('board');
  const [person, setPerson] = useState<Person | null>(null);
  const resource = useResource<AttendanceBoard>(
    '/attendance/board?' + queryString({ date, department, status, search, page }),
  );
  const data = resource.data;
  return (
    <>
      <PageHeading
        title="Attendance"
        description={
          user?.role === 'admin'
            ? 'A company-wide view of attendance. HR reviews correction requests.'
            : 'See who is working, who is away, and what needs your attention.'
        }
      />
      {data && (
        <Metrics
          items={[
            { label: 'Headcount', value: data.summary.headcount },
            { label: 'Present', value: data.summary.present },
            { label: 'Late', value: data.summary.late },
            { label: 'On leave', value: data.summary.onLeave },
            { label: 'Absent', value: data.summary.absent },
            { label: 'Missing checkout', value: data.summary.missingCheckout },
          ]}
        />
      )}
      <div className="tabs" role="tablist" aria-label="Attendance views">
        <button role="tab" aria-selected={tab === 'board'} onClick={() => setTab('board')}>
          Daily attendance
        </button>
        <button
          role="tab"
          aria-selected={tab === 'corrections'}
          onClick={() => setTab('corrections')}
        >
          Corrections
        </button>
      </div>
      {tab === 'corrections' ? (
        <CorrectionList onChanged={resource.reload} />
      ) : (
        <Panel
          title="Daily attendance"
          description={
            data
              ? 'Company timezone: ' +
                data.timezone +
                '. Present includes late and half-day records.'
              : 'Loading company attendance…'
          }
        >
          <div className="toolbar">
            <SearchFilter
              onSearch={(v) => {
                setSearch(v);
                setPage(1);
              }}
            />
            <input
              type="date"
              aria-label="Attendance date"
              value={date || data?.date || ''}
              onChange={(e) => {
                setDate(e.target.value);
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
              options={[
                'present',
                'late',
                'half_day',
                'on_leave',
                'absent',
                'missing_checkout',
                'not_checked_in',
                'weekend',
                'holiday',
                'upcoming',
              ].map((value) => ({ value, label: label(value) }))}
            />
          </div>
          {!data ? (
            <LoadState error={resource.error} retry={resource.reload} />
          ) : (
            <>
              {data.items.length ? (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Check in</th>
                        <th>Check out</th>
                        <th>Worked</th>
                        <th>Status</th>
                        <th>
                          <span className="sr-only">History</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((r) => (
                        <tr key={r.employee.id}>
                          <td className="font-medium">
                            {r.employee.name}
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {r.employee.employeeCode || r.employee.role?.toUpperCase()}
                            </p>
                          </td>
                          <td>{r.employee.department || 'Unassigned'}</td>
                          <td>{clockTime(r.attendance?.checkedInAt, data.timezone)}</td>
                          <td>{clockTime(r.attendance?.checkedOutAt, data.timezone)}</td>
                          <td>
                            {r.attendance?.checkedOutAt
                              ? duration(r.attendance.workedMinutes)
                              : '—'}
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <Status value={r.status} />
                              {r.attendance?.isLate && r.status !== 'late' && (
                                <Status value="late" />
                              )}
                            </div>
                          </td>
                          <td>
                            <Button size="sm" variant="ghost" onClick={() => setPerson(r.employee)}>
                              View history
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="No matching attendance"
                  description="Try another date, department, or search."
                />
              )}
              <Pagination {...data} onPage={setPage} />
            </>
          )}
        </Panel>
      )}
      <Drawer
        open={!!person}
        onClose={() => setPerson(null)}
        title={person?.name ?? 'Employee attendance'}
        description="Monthly attendance history and official records."
      >
        {person && (
          <EmployeeHistory
            key={person.id}
            person={person}
            month={(date || data?.date || '').slice(0, 7)}
          />
        )}
      </Drawer>
    </>
  );
}
