'use client';
import { useEffect, useState, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-provider';
import { api } from '@/services/api';
import type { User, Company } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/forms/field';
import { Feedback } from '@/components/shared/feedback';
import { AuthFrame } from '@/components/auth/auth-frame';
export function SetupForm() {
  const { setUser } = useAuth();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [allowed, setAllowed] = useState(false),
    [step, setStep] = useState(0),
    [created, setCreated] = useState(false);
  const [values, setValues] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    timezone: 'Asia/Karachi',
    officeStart: '09:00',
    officeEnd: '17:00',
    graceMinutes: '15',
    address: '',
  });
  const [weekend, setWeekend] = useState([0, 6]);
  useEffect(() => {
    void api
      .get<{ setupRequired: boolean }>('/auth/setup-status')
      .then((d) => {
        setAllowed(d.setupRequired);
        if (!d.setupRequired) router.replace('/login');
      })
      .catch((e) => setError(e.message));
  }, [router]);
  function field(name: keyof typeof values) {
    return {
      name,
      value: values[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setValues((v) => ({ ...v, [name]: e.target.value })),
    };
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (!created) {
        const { user } = await api.mutate<{ user: User }>('/auth/setup', {
          companyName: values.companyName,
          name: values.name,
          email: values.email,
          password: values.password,
        });
        setUser(user);
        setCreated(true);
      }
      const { company } = await api.get<{ company: Company }>('/organization');
      await api.mutate(
        '/organization',
        {
          name: company.name,
          address: values.address,
          timezone: values.timezone,
          officeStart: values.officeStart,
          officeEnd: values.officeEnd,
          graceMinutes: Number(values.graceMinutes),
          weekend,
          departments: company.departments,
          designations: company.designations,
          halfDayHours: company.halfDayHours,
          officeLatitude: company.officeLatitude ?? null,
          officeLongitude: company.officeLongitude ?? null,
          officeRadius: company.officeRadius,
        },
        'PATCH',
      );
      router.replace('/admin/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to finish setup.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame back="/" role="Company setup">
      <p className="eyebrow">YOUR TEAM STARTS HERE</p>
      <h2 className="auth-title">
        Make room for
        <br />
        great people.
      </h2>
      <p className="auth-description">
        Create your company workspace with the administrator credentials provided to you.
      </p>
      <div className="setup-steps" aria-label="Setup progress">
        {['Company', 'Admin', 'Workplace', 'Review'].map((s, i) => (
          <span key={s} aria-current={step === i ? 'step' : undefined}>
            {i + 1}. {s}
          </span>
        ))}
      </div>
      <form ref={form} onSubmit={submit} className="space-y-5" aria-busy={busy}>
        {step === 0 && (
          <Field
            label="Company name"
            {...field('companyName')}
            required
            minLength={2}
            maxLength={120}
            placeholder="Your company"
            autoFocus
          />
        )}
        {step === 1 && (
          <>
            <Field
              label="Your full name"
              {...field('name')}
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              autoFocus
            />
            <Field
              label="Admin email"
              {...field('email')}
              type="email"
              required
              autoComplete="username"
            />
            <Field
              label="Initial Admin password"
              {...field('password')}
              type="password"
              required
              minLength={12}
              maxLength={72}
              autoComplete="current-password"
            />
          </>
        )}
        {step === 2 && (
          <>
            <Field label="Time zone" {...field('timezone')} required placeholder="Asia/Karachi" />
            <div className="form-grid">
              <Field label="Office start" {...field('officeStart')} type="time" required />
              <Field label="Office end" {...field('officeEnd')} type="time" required />
            </div>
            <Field
              label="Grace period (minutes)"
              {...field('graceMinutes')}
              type="number"
              min={0}
              max={180}
              required
            />
            <Field label="Office address" {...field('address')} maxLength={500} />
            <fieldset>
              <legend className="text-sm mb-3">Non-working days</legend>
              <div className="flex flex-wrap gap-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                  <label key={day} className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={weekend.includes(i)}
                      onChange={(e) =>
                        setWeekend((w) => (e.target.checked ? [...w, i] : w.filter((d) => d !== i)))
                      }
                    />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {step === 3 && (
          <div className="setup-review">
            <h3 className="font-semibold mb-3">Ready to welcome your team</h3>
            <p>{values.companyName}</p>
            <p className="text-muted-foreground mt-2">
              {values.name} · {values.email}
            </p>
            <p className="text-muted-foreground mt-2">
              {values.officeStart}–{values.officeEnd} · {values.timezone}
            </p>
            <p className="text-muted-foreground mt-2">{values.graceMinutes} minute grace period</p>
          </div>
        )}
        <Feedback message={error} />
        {created && error && (
          <p className="text-sm text-muted-foreground">
            Your account is created. Retry to save workplace settings, or{' '}
            <Link className="underline" href="/admin/organization">
              finish in Organization settings
            </Link>
            .
          </p>
        )}
        <div className="flex gap-3">
          {step > 0 && !created && (
            <Button
              variant="outline"
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={busy}
            >
              <ArrowLeft size={16} />
              Previous
            </Button>
          )}
          <Button className="flex-1" type="submit" disabled={!allowed || busy}>
            {busy
              ? 'Creating workspace…'
              : step < 3
                ? 'Continue'
                : created
                  ? 'Save workplace settings'
                  : 'Create company workspace'}
            {step < 3 ? <ArrowRight size={16} /> : <Check size={16} />}
          </Button>
        </div>
      </form>
      <Link href="/login" className="setup-link">
        Already set up? Sign in
      </Link>
    </AuthFrame>
  );
}
