'use client';
import Link from 'next/link';
import { CalendarDays, Users, Banknote } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-provider';
import { useResource } from '@/hooks/use-resource';
import { Button } from '@/components/ui/button';
import { Feedback, Loading } from '@/components/shared/feedback';
import { RecentEmployees } from '@/features/employees/recent-employees';
import { AdminAnalyticsSection } from './admin-analytics-section';
import { AnnouncementsCard } from '@/components/shared/announcements-card';
import { AiDashboardInsights } from '@/components/ai/ai-dashboard-insights';
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
  return (
    <div className="space-y-6">
      <div className="page-title-row">
        <div>
          <p className="eyebrow mb-2">{data.company.name} / COMPANY OVERVIEW</p>
          <h1 className="page-heading">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Your people and payroll, clearly in view.
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
          <h2>Your organization at a glance</h2>
          <p>Build your people team and keep payroll on track.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/hr-accounts">
            <Users size={16} />
            Manage HR accounts
          </Link>
        </Button>
        <Button asChild>
          <Link href="/admin/payroll">
            <Banknote size={16} />
            Review payroll
          </Link>
        </Button>
      </section>
      <AdminAnalyticsSection />
      <div className="grid xl:grid-cols-2 gap-5 items-start">
        <RecentEmployees
          people={data.recentEmployees ?? []}
          directoryHref="/admin/employees"
          emptyMessage="Your HR team can welcome employees once their accounts are ready."
          actionHref="/admin/hr-accounts"
          actionLabel="Add HR account"
        />
        <AnnouncementsCard userRole={user.role} />
      </div>
      <AiDashboardInsights scope="admin" />
    </div>
  );
}
