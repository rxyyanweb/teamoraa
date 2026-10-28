import Link from 'next/link';
import { ArrowRight, Plus, Sprout } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { initials } from '@/lib/utils';
import type { User } from '@/types/api';
export function RecentEmployees({
  people,
  directoryHref,
  emptyMessage,
  actionHref,
  actionLabel,
}: {
  people: User[];
  directoryHref: string;
  emptyMessage: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-6 py-5">
        <div>
          <h2 className="text-sm font-semibold">Recently joined</h2>
          <p className="mt-1 text-xs text-muted-foreground">New faces. Fresh possibilities.</p>
        </div>
        <Link
          href={directoryHref}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          View people <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {people.length ? (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Team member</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="avatar">{initials(person.name)}</span>
                      <div>
                        <p className="font-semibold">{person.name}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {person.designation || person.employeeCode}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted-foreground">{person.department || 'Unassigned'}</td>
                  <td>
                    <Badge className={person.active ? '' : 'bg-muted text-muted-foreground'}>
                      {person.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid min-h-64 place-content-center px-6 text-center">
          <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[#f0f5eb]">
            <Sprout className="size-6 text-[#759267]" />
          </span>
          <p className="text-sm font-semibold">A fresh start for your people.</p>
          <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">{emptyMessage}</p>
          <Button asChild size="sm" variant="outline" className="mx-auto mt-5">
            <Link href={actionHref}>
              <Plus className="size-3.5" />
              {actionLabel}
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
