'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import { Card } from '@/components/ui/card';
import { Metrics, LoadState } from '@/components/workforce/primitives';
type Data = {
  kpis: {
    headcount: number;
    presentToday: number;
    lateToday: number;
    onLeaveToday: number;
    pendingApprovals: number;
  };
  attendanceTrends: { date: string; present: number; late: number; halfDay: number }[];
  topLateComers: { employeeId: string; name: string; lateCount: number }[];
};
export function HrAnalyticsSection() {
  const resource = useResource<Data>('/analytics/hr');
  const [metric, setMetric] = useState<'present' | 'late' | 'halfDay'>('present');
  const d = resource.data;
  if (!d) return <LoadState error={resource.error} retry={resource.reload} />;
  const maximum = Math.max(1, ...d.attendanceTrends.map((t) => t[metric]));
  return (
    <div className="space-y-5">
      <Metrics
        items={[
          { label: 'Team members', value: d.kpis.headcount },
          { label: 'Present today', value: d.kpis.presentToday },
          { label: 'Late today', value: d.kpis.lateToday },
          { label: 'On leave', value: d.kpis.onLeaveToday },
          {
            label: 'Pending approvals',
            value: (
              <Link href="/hr/leave" className="text-primary inline-flex items-center gap-2">
                {d.kpis.pendingApprovals}
                <ArrowUpRight size={18} />
              </Link>
            ),
          },
        ]}
      />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">Attendance at a glance</h2>
              <p className="text-xs text-muted-foreground mt-1">Latest seven recorded days</p>
            </div>
            <select
              aria-label="Attendance chart metric"
              className="filter-select"
              value={metric}
              onChange={(e) => setMetric(e.target.value as typeof metric)}
            >
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="halfDay">Half day</option>
            </select>
          </div>
          {d.attendanceTrends.length ? (
            <div
              className="attendance-chart"
              role="img"
              aria-label={`${metric} attendance by date`}
            >
              {d.attendanceTrends.map((t) => (
                <div
                  key={t.date}
                  className="chart-column"
                  tabIndex={0}
                  title={`${t.date}: ${t[metric]} ${metric}`}
                >
                  <span>{t[metric]}</span>
                  <div className="chart-bar-space">
                    <div
                      className="chart-bar"
                      style={{ height: `${Math.max(2, (t[metric] / maximum) * 100)}%` }}
                    />
                  </div>
                  <small>{t.date.slice(5)}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="chart-empty">Attendance will appear after your team checks in.</p>
          )}
        </Card>
        <Card>
          <h2 className="font-semibold text-sm">Punctuality this month</h2>
          <p className="text-xs text-muted-foreground mt-1">People who may need a follow-up</p>
          {d.topLateComers.length ? (
            <div className="mt-5 space-y-4">
              {d.topLateComers.map((e) => (
                <div className="flex justify-between gap-3 text-sm" key={e.employeeId}>
                  <span>{e.name}</span>
                  <span className="status-badge status-late">{e.lateCount} late</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="chart-empty">No late arrivals recorded this month.</p>
          )}
          <Link
            href="/hr/attendance"
            className="text-xs text-primary inline-flex gap-2 items-center mt-4"
          >
            Review attendance
            <ArrowUpRight size={14} />
          </Link>
        </Card>
      </div>
    </div>
  );
}
