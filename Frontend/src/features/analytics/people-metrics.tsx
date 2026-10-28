import { Users, UserCheck, Building2, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Dashboard } from '@/types/api';
export function PeopleMetrics({
  statistics,
}: {
  statistics: NonNullable<Dashboard['statistics']>;
}) {
  const metrics = [
    {
      label: 'Total employees',
      value: statistics.totalEmployees,
      icon: Users,
      note: 'People in your organization',
      tint: 'bg-success-soft text-success',
    },
    {
      label: 'Active employees',
      value: statistics.activeEmployees,
      icon: UserCheck,
      note: 'Ready to do their best work',
      tint: 'bg-info-soft text-info',
    },
    {
      label: 'Departments',
      value: statistics.departments,
      icon: Building2,
      note: 'Teams moving forward together',
      tint: 'bg-warning-soft text-warning',
    },
    ...(statistics.hrAccounts !== undefined
      ? [
          {
            label: 'HR accounts',
            value: statistics.hrAccounts,
            icon: ShieldCheck,
            note: 'Taking care of your people',
            tint: 'bg-violet-50 text-violet-600',
          },
        ]
      : []),
  ];
  return (
    <section
      className={`grid gap-4 sm:grid-cols-2 ${metrics.length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}
      aria-label="People statistics"
    >
      {metrics.map((metric) => (
        <Card key={metric.label} className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
            <span className={`grid size-9 place-items-center rounded-xl ${metric.tint}`}>
              <metric.icon className="size-[17px]" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{metric.value}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">{metric.note}</p>
        </Card>
      ))}
    </section>
  );
}
