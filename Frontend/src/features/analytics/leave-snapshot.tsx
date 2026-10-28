'use client';
import Link from 'next/link';
import { useResource } from '@/hooks/use-resource';
import type { PersonalLeave } from '@/types/workforce';
import { Card } from '@/components/ui/card';
import { LoadState } from '@/components/workforce/primitives';
export function LeaveSnapshot() {
  const r = useResource<PersonalLeave>('/leave/me');
  if (!r.data) return <LoadState error={r.error} retry={r.reload} />;
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="text-sm font-semibold">Time for you</h2>
        <Link href="/employee/leave" className="text-xs text-primary">
          View leave requests →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {r.data.balances.map((b) => (
          <div key={b.code}>
            <p className="text-xs text-muted-foreground">{b.name}</p>
            <p className="text-2xl font-semibold mt-2">
              {b.available === null ? '—' : b.available}
              <span className="text-xs font-normal text-muted-foreground ml-2">days left</span>
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
