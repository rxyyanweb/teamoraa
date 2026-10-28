'use client';
import { useState, type FormEvent } from 'react';
import { useResource } from '@/hooks/use-resource';
import { api } from '@/services/api';
import type { Company, User } from '@/types/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/forms/field';
import { Feedback } from '@/components/shared/feedback';
export function PersonForm({
  kind,
  onCreated,
}: {
  kind: 'hr' | 'employee';
  onCreated: () => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);
  const organization = useResource<{ company: Company }>('/organization');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setCredential(null);
    const form = event.currentTarget;
    const values = new FormData(form);
    const input = Object.fromEntries(values.entries());
    try {
      const data = await api.mutate<{ user: User; temporaryPassword: string }>(
        kind === 'hr' ? '/users/hr' : '/employees',
        {
          ...input,
          ...(kind === 'employee' ? { basicSalary: Number(values.get('basicSalary')) } : {}),
        },
      );
      setCredential({ email: data.user.email, password: data.temporaryPassword });
      form.reset();
      onCreated();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <h2 className="font-semibold">
        {kind === 'hr' ? 'Welcome someone to your HR team' : 'Welcome a new team member'}
      </h2>
      <p className="mt-2 text-xs text-muted-foreground">
        A login and a temporary password will be created for them.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Full name"
            name="name"
            required
            minLength={2}
            maxLength={100}
            placeholder="Full name"
          />
          <Field
            label="Work email"
            name="email"
            type="email"
            required
            maxLength={254}
            placeholder="name@company.com"
          />
          <Field label="Phone number" name="phone" type="tel" maxLength={30} placeholder="+92" />
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="department">
              Department
            </label>
            <select id="department" name="department" className="select-field">
              <option value="">Unassigned</option>
              {organization.data?.company.departments.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="designation">
              Designation
            </label>
            <select id="designation" name="designation" className="select-field">
              <option value="">Unassigned</option>
              {organization.data?.company.designations.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <Field label="Joining date" name="joinedAt" type="date" required />
          {kind === 'employee' && (
            <Field
              label="Monthly basic salary (PKR)"
              name="basicSalary"
              type="number"
              min="1"
              step="0.01"
              required
            />
          )}
        </div>
        <Feedback message={error || organization.error} />
        <Button type="submit" disabled={busy || organization.loading || !!organization.error}>
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      {credential && (
        <div role="status" className="mt-6 rounded-xl border border-teal-200 bg-success-soft p-5">
          <h3 className="text-sm font-semibold">Account created. Share these details securely.</h3>
          <p className="mt-3 text-sm">
            Email: <strong className="break-all">{credential.email}</strong>
          </p>
          <p className="mt-2 text-sm">
            Temporary password:{' '}
            <code className="break-all select-all rounded bg-card px-2 py-1">
              {credential.password}
            </code>
          </p>
          <p className="mt-3 text-xs leading-5 text-success">
            This password is shown only now. It must be changed on first sign-in. Teamora does not
            email credentials.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setCredential(null)}>
            Dismiss credentials
          </Button>
        </div>
      )}
    </Card>
  );
}
