'use client';
import { useState, useEffect } from 'react';
import { Plus, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/features/auth/auth-provider';
import type { Directory, User, Company } from '@/types/api';
import { PeopleSearch } from './people-search';
import { Drawer } from '@/components/workforce/drawer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Feedback, Loading } from '@/components/shared/feedback';
import { initials } from '@/lib/utils';
import { PersonForm } from './person-form';
import { PersonDetails } from './person-details';
export function PeopleDirectory({ kind = 'employee' }: { kind?: 'employee' | 'hr' }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [status, setStatus] = useState('');
  const [lastSelected, setLastSelected] = useState<User | null>(null);
  const organization = useResource<{ company: Company }>('/organization');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(draft.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [draft]);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);
  const endpoint = kind === 'hr' ? '/users/hr' : '/employees';
  const { data, loading, error, reload } = useResource<Directory>(
    `${endpoint}?page=${page}&search=${encodeURIComponent(search)}&department=${encodeURIComponent(department)}&designation=${encodeURIComponent(designation)}&active=${status}`,
  );
  const canCreate = kind === 'hr' ? user?.role === 'admin' : user?.role === 'hr';
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">PEOPLE & CONNECTIONS</p>
          <h1 className="page-heading">
            {kind === 'hr' ? 'Your people team' : 'People directory'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {kind === 'hr'
              ? 'The people who take care of your people.'
              : 'Every person brings something to the team.'}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setAdding(!adding)}>
            <Plus className="size-4" />
            {adding ? 'Close form' : kind === 'hr' ? 'Add HR account' : 'Add employee'}
          </Button>
        )}
      </div>
      {adding && (
        <PersonForm
          kind={kind}
          onCreated={() => {
            void reload();
          }}
        />
      )}
      {selected && (
        <Drawer
          open
          onClose={() => setSelected(null)}
          title="Employee details"
          description="Profile and account information"
        >
          <PersonDetails
            person={selected}
            kind={kind}
            onClose={() => setSelected(null)}
            onUpdated={() => {
              setSelected(null);
              void reload();
            }}
          />
        </Drawer>
      )}
      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5">
          <div>
            <h2 className="text-sm font-semibold">
              {kind === 'hr' ? 'HR accounts' : 'All team members'}{' '}
              <span className="ml-2 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                {data?.total ?? '—'}
              </span>
            </h2>
          </div>
          <PeopleSearch
            value={draft}
            onChange={setDraft}
            people={draft.trim() === search ? (data?.users ?? []) : []}
            loading={loading || draft.trim() !== search}
            error={error}
            onSelect={(person) => {
              setSelected(person);
              setLastSelected(person);
            }}
          />
        </div>
        <div className="toolbar">
          <select
            aria-label="Filter department"
            className="filter-select"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All departments</option>
            {organization.data?.company.departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Filter designation"
            className="filter-select"
            value={designation}
            onChange={(e) => {
              setDesignation(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All designations</option>
            {organization.data?.company.designations.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Filter account status"
            className="filter-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          {(draft || department || designation || status) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft('');
                setSearch('');
                setDepartment('');
                setDesignation('');
                setStatus('');
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}
          {lastSelected && (
            <span className="selection-chip">
              <button type="button" onClick={() => setSelected(lastSelected)}>
                {lastSelected.name}
              </button>
              <button
                type="button"
                aria-label="Clear selected employee"
                onClick={() => setLastSelected(null)}
              >
                <X size={14} />
              </button>
            </span>
          )}
        </div>
        {loading ? (
          <Loading text="Loading people…" />
        ) : error ? (
          <div className="space-y-4 p-6">
            <Feedback message={error} />
            <Button onClick={() => void reload()}>Try again</Button>
          </div>
        ) : !data?.users.length ? (
          <div className="py-20 text-center">
            <p className="font-semibold">
              {search ? 'No matching people' : 'Your team starts here.'}
            </p>
            <p className="mt-2 px-6 text-sm text-muted-foreground">
              {search
                ? 'Try another name, employee ID, or department.'
                : canCreate
                  ? 'Add an account to welcome someone to your workspace.'
                  : 'Your HR team will register employees here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team member</th>
                  <th>Employee ID</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="avatar">{initials(person.name)}</span>
                        <div>
                          <p className="font-semibold">{person.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{person.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground">{person.employeeCode}</td>
                    <td>{person.department || 'Unassigned'}</td>
                    <td>
                      <Badge className={person.active ? '' : 'bg-muted text-muted-foreground'}>
                        {person.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <Button variant="ghost" size="sm" onClick={() => setSelected(person)}>
                        View details <ArrowRight className="size-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-xs text-muted-foreground">
              Page {page} of {Math.ceil(data.total / data.pageSize)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ArrowLeft className="size-3" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ArrowRight className="size-3" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
