'use client';
import { useEffect, useState, type FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useAuth } from './auth-provider';
import { api } from '@/services/api';
import { homeFor, isAdminPortal } from '@/lib/portal';
import type { User } from '@/types/api';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/shared/feedback';
import { AuthFrame } from '@/components/auth/auth-frame';
export function LoginForm() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
function LoginContent() {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const roleParam = params.get('role');
  const role =
    roleParam === 'admin'
      ? 'Admin'
      : roleParam === 'hr'
        ? 'HR'
        : roleParam === 'employee'
          ? 'Employee'
          : 'Team';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  useEffect(() => {
    if (auth.user) router.replace(homeFor(auth.user));
  }, [auth.user, router]);
  useEffect(() => {
    if (role === 'Admin')
      void api
        .get<{ setupRequired: boolean }>('/auth/setup-status')
        .then((data) => setSetupRequired(data.setupRequired))
        .catch(() => {});
  }, [role]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = new FormData(event.currentTarget);
    try {
      const { user } = await api.mutate<{ user: User }>('/auth/login', {
        email: values.get('email'),
        password: values.get('password'),
      });
      auth.setUser(user);
      router.replace(homeFor(user));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame back="/" role={`${role} workspace`}>
      <p className="eyebrow">{role.toUpperCase()} WORKSPACE</p>
      <h2 className="auth-title">Good to see you again.</h2>
      <p className="auth-description">
        {role === 'Admin'
          ? 'Your organization, clearly in view.'
          : role === 'HR'
            ? 'Everything you need to support your people.'
            : 'Your workday, time off, and payslips. All together.'}
      </p>
      {role !== 'Admin' && (
        <nav className="auth-role-tabs" aria-label="Sign-in role">
          <Link href="/login?role=hr" aria-current={role === 'HR' ? 'page' : undefined}>
            HR login
          </Link>
          <Link href="/login?role=employee" aria-current={role === 'Employee' ? 'page' : undefined}>
            Employee login
          </Link>
        </nav>
      )}
      <form onSubmit={submit} className="auth-form" aria-busy={busy}>
        <Field
          label="Work email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          required
          maxLength={254}
        />
        <div className="relative">
          <Field
            label="Password"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            maxLength={72}
          />
          <button
            type="button"
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            className="password-toggle"
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
        <Feedback message={error || auth.error} />
        <Button className="w-full" type="submit" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="animate-spin" size={17} />
              Signing in…
            </>
          ) : (
            <>
              Sign in to your workspace
              <ArrowRight size={17} />
            </>
          )}
        </Button>
      </form>
      <p className="auth-help">
        First time here? Use your temporary password.
        <br />
        Need help signing in? Contact your {role === 'Admin' ? 'system administrator' : 'HR team'}.
      </p>
      {role === 'Admin' && setupRequired && (
        <Link className="setup-link" href="/setup">
          Set up your company <ArrowRight size={16} />
        </Link>
      )}
    </AuthFrame>
  );
}
