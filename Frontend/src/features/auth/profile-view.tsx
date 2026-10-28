'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useAuth } from './auth-provider';
import { api } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/forms/field';
import { Feedback } from '@/components/shared/feedback';
import { initials, formatDate } from '@/lib/utils';
import type { User } from '@/types/api';
export function ProfileView() {
  const { user, setUser } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const data = await api.mutate<{ user: User }>(
        '/profile',
        Object.fromEntries(new FormData(event.currentTarget).entries()),
        'PATCH',
      );
      setUser(data.user);
      setSuccess('Your profile has been updated.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save profile.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <p className="eyebrow mb-2">A LITTLE ABOUT YOU</p>
        <h1 className="page-heading">My profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Keep the everyday details up to date.</p>
      </div>
      <Card>
        <div className="flex items-center gap-4">
          <span className="avatar size-16 text-xl">{initials(user.name)}</span>
          <div>
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <dl className="mt-7 grid gap-6 border-t pt-6 sm:grid-cols-3">
          {[
            ['Employee ID', user.employeeCode],
            ['Department', user.department || 'Unassigned'],
            ['Joined', formatDate(user.joinedAt)],
          ].map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs text-muted-foreground">{key}</dt>
              <dd className="mt-2 text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <h2 className="font-semibold">Contact details</h2>
        <form className="mt-6 space-y-5" onSubmit={submit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Phone number"
              name="phone"
              type="tel"
              defaultValue={user.phone}
              maxLength={30}
            />
            <Field label="Address" name="address" defaultValue={user.address} maxLength={500} />
          </div>
          <Feedback message={error} />
          <Feedback message={success} success />
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="font-semibold">Account security</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a unique password to keep your workspace secure.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/change-password">Change password</Link>
        </Button>
      </Card>
    </div>
  );
}
