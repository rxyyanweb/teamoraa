'use client';
import Link from 'next/link';
import { CalendarDays, ArrowRight, Clock3, Users } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-provider';
import { useResource } from '@/hooks/use-resource';
import { Button } from '@/components/ui/button';
import { Feedback, Loading } from '@/components/shared/feedback';
import { RecentEmployees } from '@/features/employees/recent-employees';
import { HrAnalyticsSection } from './hr-analytics-section';
import { EmployeePersonalPayrollSection } from './employee-personal-payroll-section';
import { AnnouncementsCard } from '@/components/shared/announcements-card';
import { AiDashboardInsights } from '@/components/ai/ai-dashboard-insights';
import { LeaveSnapshot } from './leave-snapshot';
import type { Dashboard } from '@/types/api';
export function DashboardView() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useResource<Dashboard>('/dashboard');
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="space-y-4">
        <Feedback message={error} />
        <Button onClick={reload}>Try again</Button>
      </div>
    );
  if (!data || !user) return null;
  const employee = user.role === 'employee';
  return (
    <div className="space-y-6">
      <div className="page-title-row">
        <div>
          <p className="eyebrow mb-2">
            {data.company.name} / {employee ? 'YOUR WORKDAY' : 'PEOPLE OPERATIONS'}
          </p>
          <h1 className="page-heading">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {employee
              ? 'Everything you need for a good day at work.'
              : 'A clear view of today. More time for your people.'}
          </p>
        </div>
        <span className="inline-flex gap-2 items-center text-xs text-muted-foreground">
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'long',
            timeZone: data.company.timezone,
          }).format(new Date())}
        </span>
      </div>
      <section className="action-strip">
        <div>
          <h2>{employee ? 'Make today count' : 'Keep your team moving'}</h2>
          <p>
            {employee
              ? 'Your time and your next steps, in one place.'
              : 'Start with the requests and people who need your attention.'}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={employee ? '/employee/leave' : '/hr/employees'}>
            {employee ? <CalendarDays size={16} /> : <Users size={16} />}{' '}
            {employee ? 'Plan time off' : 'People directory'}
          </Link>
        </Button>
        <Button asChild>
          <Link href={employee ? '/employee/attendance' : '/hr/leave'}>
            {employee ? <Clock3 size={16} /> : <ArrowRight size={16} />}{' '}
            {employee ? 'My attendance' : 'Review leave requests'}
          </Link>
        </Button>
      </section>
      {employee ? (
        <>
          <EmployeePersonalPayrollSection />
          <LeaveSnapshot />
          <AnnouncementsCard userRole={user.role} />
        </>
      ) : (
        <>
          <HrAnalyticsSection />
          <div className="grid xl:grid-cols-2 gap-5 items-start">
            <RecentEmployees
              people={data.recentEmployees ?? []}
              directoryHref="/hr/employees"
              emptyMessage="Add your first employee to bring your team together."
              actionHref="/hr/employees"
              actionLabel="Add employee"
            />
            <AnnouncementsCard userRole={user.role} />
          </div>
          <AiDashboardInsights scope="hr" />
        </>
      )}
    </div>
  );
}
