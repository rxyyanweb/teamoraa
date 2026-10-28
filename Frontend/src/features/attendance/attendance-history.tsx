'use client';
import type { PersonalAttendance } from '@/types/workforce';
import {
  Panel,
  Calendar,
  MonthNav,
  Metrics,
  duration,
  clockTime,
  Status,
  Empty,
  Pagination,
  Detail,
  dateLabel,
} from '@/components/workforce/primitives';
import { Drawer } from '@/components/workforce/drawer';
import { useState } from 'react';
export function AttendanceHistory({
  data,
  onMonth,
  onPage,
}: {
  data: PersonalAttendance;
  onMonth: (v: string) => void;
  onPage: (v: number) => void;
}) {
  const [day, setDay] = useState('');
  const selected = data.calendar.find((d) => d.date === day);
  return (
    <>
      <div className="mt-5">
        <Metrics
          items={[
            { label: 'Days attended', value: data.summary.attendedDays },
            { label: 'Hours recorded', value: duration(data.summary.workedMinutes) },
            { label: 'Late arrivals', value: data.summary.late },
            { label: 'Half days', value: data.summary.halfDays },
            { label: 'Absent', value: data.summary.absent },
            { label: 'Missing checkout', value: data.summary.missingCheckouts },
          ]}
        />
      </div>
      <Panel
        title="Attendance calendar"
        description="Select a date to inspect its record."
        action={<MonthNav month={data.month} onChange={onMonth} />}
      >
        <Calendar month={data.month} days={data.calendar} onDay={setDay} />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {['present', 'late', 'half_day', 'on_leave', 'absent', 'missing_checkout'].map((s) => (
            <Status key={s} value={s} />
          ))}
        </div>
      </Panel>
      <Panel
        title="Monthly records"
        description="Official times are shown in the company timezone. Late and half-day flags are independent."
      >
        {data.items.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check in</th>
                  <th>Check out</th>
                  <th>Worked</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button className="font-medium text-primary" onClick={() => setDay(r.date)}>
                        {dateLabel(r.date)}
                      </button>
                      {r.corrected && (
                        <span className="block text-[10px] text-muted-foreground mt-1">
                          Corrected
                        </span>
                      )}
                    </td>
                    <td>{clockTime(r.checkedInAt, r.timezone)}</td>
                    <td>{clockTime(r.checkedOutAt, r.timezone)}</td>
                    <td>{r.checkedOutAt ? duration(r.workedMinutes) : 'Open shift'}</td>
                    <td>
                      <div className="flex gap-1">
                        <Status value={r.status} />
                        {r.isLate && r.status !== 'late' && <Status value="late" />}
                        {r.isHalfDay && r.status !== 'half_day' && <Status value="half_day" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No check-ins this month"
            description="Your official attendance records will appear here after check-in."
          />
        )}
        <Pagination {...data} onPage={onPage} />
      </Panel>
      <Drawer
        open={!!selected}
        onClose={() => setDay('')}
        title={selected ? dateLabel(selected.date) : 'Attendance day'}
        description="Company attendance record"
      >
        {selected && (
          <>
            <Detail label="Status">
              <Status value={selected.status} />
            </Detail>
            {selected.leaveType && <Detail label="Leave">{selected.leaveType}</Detail>}
            {selected.attendance && (
              <>
                <Detail label="Check in">
                  {clockTime(selected.attendance.checkedInAt, selected.attendance.timezone)}
                </Detail>
                <Detail label="Check out">
                  {clockTime(selected.attendance.checkedOutAt, selected.attendance.timezone)}
                </Detail>
                <Detail label="Worked">{duration(selected.attendance.workedMinutes)}</Detail>
                <Detail label="Flags">
                  {selected.attendance.isLate ? 'Late arrival. ' : ''}
                  {selected.attendance.isHalfDay ? 'Half day. ' : ''}
                  {!selected.attendance.isLate && !selected.attendance.isHalfDay ? 'None' : ''}
                </Detail>
                <Detail label="Timezone">{selected.attendance.timezone}</Detail>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
