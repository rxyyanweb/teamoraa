'use client';
import { useState } from 'react';
import { useResource } from '@/hooks/use-resource';
import { Card } from '@/components/ui/card';
import { Metrics, LoadState } from '@/components/workforce/primitives';
type Data = {
  kpis: {
    totalHeadcount: number;
    activeHeadcount: number;
    attritionYtd: number;
    monthlyPayrollCost: number;
    averageSalary: number;
    payrollMonth: string | null;
    payrollStatus: string | null;
  };
  headcountByDepartment: { department: string; count: number }[];
  payrollCostByDepartment: { department: string; cost: number }[];
  payrollSpendingTrends: {
    month: string;
    status: string;
    netSalary: number;
    grossSalary: number;
    tax: number;
  }[];
};
const money = (n: number) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(n);
export function AdminAnalyticsSection() {
  const r = useResource<Data>('/analytics/admin');
  const [view, setView] = useState('headcount');
  const [months, setMonths] = useState(6);
  const d = r.data;
  if (!d) return <LoadState error={r.error} retry={r.reload} />;
  const departments =
    view === 'headcount'
      ? d.headcountByDepartment.map((x) => ({ name: x.department, value: x.count }))
      : d.payrollCostByDepartment.map((x) => ({ name: x.department, value: x.cost }));
  const max = Math.max(1, ...departments.map((x) => x.value));
  const trends = d.payrollSpendingTrends.slice(-months);
  const trendMax = Math.max(1, ...trends.map((x) => x.netSalary));
  return (
    <div className="space-y-5">
      <Metrics
        items={[
          {
            label: 'Total headcount',
            value: d.kpis.totalHeadcount,
            note: `${d.kpis.activeHeadcount} active employees`,
          },
          {
            label: 'Attrition',
            value: `${d.kpis.attritionYtd}%`,
            note: 'Inactive share of total employees',
          },
          {
            label: 'Net payroll',
            value: money(d.kpis.monthlyPayrollCost),
            note: d.kpis.payrollMonth
              ? `${d.kpis.payrollMonth} · ${d.kpis.payrollStatus}`
              : 'No payroll run yet',
          },
          {
            label: 'Average net salary',
            value: money(d.kpis.averageSalary),
            note: 'Per active employee',
          },
        ]}
      />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Your departments</h2>
            <select
              className="filter-select"
              aria-label="Department chart metric"
              value={view}
              onChange={(e) => setView(e.target.value)}
            >
              <option value="headcount">Headcount</option>
              <option value="payroll">Net payroll</option>
            </select>
          </div>
          {departments.length ? (
            <div className="space-y-5 mt-6">
              {departments.map((x) => (
                <div
                  key={x.name}
                  tabIndex={0}
                  title={`${x.name}: ${view === 'headcount' ? x.value : money(x.value)}`}
                >
                  <div className="flex justify-between text-xs gap-3 mb-2">
                    <span>{x.name}</span>
                    <strong>{view === 'headcount' ? x.value : money(x.value)}</strong>
                  </div>
                  <div className="progress-track !mt-0 !h-2">
                    <div className="progress-fill" style={{ width: `${(x.value / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="chart-empty">
              {view === 'headcount'
                ? 'Department totals will appear as your team grows.'
                : 'Create a payroll draft to see costs by department.'}
            </p>
          )}
        </Card>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Payroll over time</h2>
            <select
              className="filter-select"
              aria-label="Payroll chart period"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              <option value={6}>Last 6 runs</option>
              <option value={3}>Last 3 runs</option>
            </select>
          </div>
          {trends.length ? (
            <div className="attendance-chart" role="img" aria-label="Net payroll by month">
              {trends.map((t) => (
                <div
                  key={t.month}
                  className="chart-column"
                  tabIndex={0}
                  title={`${t.month}: ${money(t.netSalary)} · ${t.status}`}
                >
                  <span className="text-[10px]">{money(t.netSalary)}</span>
                  <div className="chart-bar-space">
                    <div
                      className="chart-bar"
                      style={{ height: `${Math.max(2, (t.netSalary / trendMax) * 100)}%` }}
                    />
                  </div>
                  <small>{t.month}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="chart-empty">Your payroll history will appear after the first run.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
