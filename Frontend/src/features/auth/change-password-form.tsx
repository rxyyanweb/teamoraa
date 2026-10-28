'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { useAuth } from './auth-provider';
import { api } from '@/services/api';
import { homeFor } from '@/lib/portal';
import type { User } from '@/types/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuthFrame } from '@/components/auth/auth-frame';
import { Field } from '@/components/forms/field';
import { Feedback, Loading } from '@/components/shared/feedback';
export function ChangePasswordForm() {
  const auth = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!auth.loading && !auth.user && !auth.error) router.replace('/login');
  }, [auth.loading, auth.user, auth.error, router]);
  if (auth.loading) return <Loading />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const values = new FormData(event.currentTarget);
    if (values.get('newPassword') !== values.get('confirm')) {
      setError('The new passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { user } = await api.mutate<{ user: User }>('/auth/change-password', {
        currentPassword: values.get('currentPassword'),
        newPassword: values.get('newPassword'),
      });
      auth.setUser(user);
      router.replace(homeFor(user));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame role="Account security">
      <Card>
        <KeyRound className="mb-5 size-8 text-success" />
        <h1 className="text-2xl font-semibold">
          {auth.user?.mustChangePassword ? 'Make this workspace yours.' : 'Change your password'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Choose a new password with at least 12 characters. This signs out your other sessions.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            maxLength={72}
          />
          <Field
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
          />
          <Field
            label="Confirm new password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
          />
          <Feedback message={error || auth.error} />
          <Button type="submit" className="w-full" disabled={busy || !auth.user}>
            {busy ? 'Saving…' : 'Save password & continue'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              if (auth.user) void auth.logout().catch((error) => setError(error.message));
            }}
            disabled={busy}
          >
            Sign out
          </Button>
        </form>
      </Card>
    </AuthFrame>
  );
}
