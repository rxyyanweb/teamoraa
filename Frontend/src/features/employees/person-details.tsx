'use client';
import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-provider';
import { api } from '@/services/api';
import type { User } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/forms/field';
import { Feedback } from '@/components/shared/feedback';
export function PersonDetails({
  person,
  kind,
  onClose,
  onUpdated,
}: {
  person: User;
  kind: 'hr' | 'employee';
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const canEdit =
    (kind === 'hr' && user?.role === 'admin') || (kind === 'employee' && user?.role === 'hr');
  const endpoint = kind === 'hr' ? '/users/hr' : '/employees';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = new FormData(event.currentTarget);
    try {
      await api.mutate(`${endpoint}/${person.id}`, Object.fromEntries(values.entries()), 'PATCH');
      onUpdated();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  }
  async function manage(action: 'status' | 'reset-password') {
    setBusy(true);
    setError('');
    setPassword('');
    try {
      const result = await api.mutate<{ temporaryPassword?: string }>(
        `/users/accounts/${person.id}/${action}`,
        action === 'status' ? { active: !person.active } : {},
        action === 'status' ? 'PATCH' : 'POST',
      );
      if (result.temporaryPassword) setPassword(result.temporaryPassword);
      else onUpdated();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update account.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{person.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {person.email} · {person.employeeCode}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close details">
          <X className="size-4" />
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Joined {formatDate(person.joinedAt)} · {person.department || 'No department'} ·{' '}
        {person.designation || 'No designation'}
      </p>
      {canEdit && (
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              name="name"
              defaultValue={person.name}
              required
              minLength={2}
              maxLength={100}
            />
            <Field label="Phone number" name="phone" defaultValue={person.phone} maxLength={30} />
          </div>
          <Button type="submit" size="sm" disabled={busy}>
            Save details
          </Button>
        </form>
      )}
      {user?.role === 'admin' && (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void manage('reset-password')}
          >
            Reset password
          </Button>
          <Button
            variant={person.active ? 'destructive' : 'outline'}
            size="sm"
            disabled={busy}
            onClick={() => void manage('status')}
          >
            {person.active ? 'Deactivate login' : 'Reactivate login'}
          </Button>
        </div>
      )}
      <div className="mt-4">
        <Feedback message={error} />
      </div>
      {password && (
        <div role="status" className="mt-4 rounded-lg bg-success-soft p-4 text-sm">
          <p>
            New temporary password:{' '}
            <code className="break-all font-bold select-all">{password}</code>
          </p>
          <p className="mt-2 text-xs">Share securely. Their existing sessions are now invalid.</p>
        </div>
      )}
    </Card>
  );
}
