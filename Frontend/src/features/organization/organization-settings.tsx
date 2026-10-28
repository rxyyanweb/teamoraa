'use client';
import { useState, type FormEvent } from 'react';
import { useResource } from '@/hooks/use-resource';
import { api } from '@/services/api';
import type { Company } from '@/types/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/forms/field';
import { Feedback, Loading } from '@/components/shared/feedback';
export function OrganizationSettings() {
  const {
    data,
    error: loadError,
    loading,
    reload,
  } = useResource<{ company: Company }>('/organization');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading text="Loading organization…" />;
  if (loadError || !data)
    return (
      <div className="space-y-4">
        <Feedback message={loadError} />
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  const company = data.company;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    const values = new FormData(event.currentTarget);
    const input = Object.fromEntries(values.entries());
    const list = (key: string) =>
      String(values.get(key))
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const number = (key: string) => Number(values.get(key));
    const coordinate = (key: string) => (values.get(key) === '' ? null : number(key));
    try {
      await api.mutate(
        '/organization',
        {
          ...input,
          departments: list('departments'),
          designations: list('designations'),
          graceMinutes: number('graceMinutes'),
          halfDayHours: number('halfDayHours'),
          officeRadius: number('officeRadius'),
          officeLatitude: coordinate('officeLatitude'),
          officeLongitude: coordinate('officeLongitude'),
          weekend: values.getAll('weekend').map(Number),
        },
        'PATCH',
      );
      setSuccess('Organization settings saved.');
      void reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save settings.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="eyebrow mb-2">A FOUNDATION FOR YOUR PEOPLE</p>
        <h1 className="page-heading">Organization settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Shape your workspace around the way your team works.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <Card>
          <h2 className="font-semibold">Company profile</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field
              label="Company name"
              name="name"
              defaultValue={company.name}
              required
              minLength={2}
              maxLength={120}
            />
            <Field
              label="Time zone"
              name="timezone"
              defaultValue={company.timezone}
              required
              placeholder="Asia/Karachi"
            />
            <Field
              label="Office address"
              name="address"
              className="sm:col-span-2"
              defaultValue={company.address}
              maxLength={500}
            />
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Working together</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Store the default working hours and thresholds for your workplace.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Office starts"
              name="officeStart"
              type="time"
              defaultValue={company.officeStart}
              required
            />
            <Field
              label="Office ends"
              name="officeEnd"
              type="time"
              defaultValue={company.officeEnd}
              required
            />
            <Field
              label="Grace time (minutes)"
              name="graceMinutes"
              type="number"
              min="0"
              max="180"
              defaultValue={company.graceMinutes}
              required
            />
            <Field
              label="Half day under (hours)"
              name="halfDayHours"
              type="number"
              min="0.5"
              max="12"
              step="0.5"
              defaultValue={company.halfDayHours}
              required
            />
          </div>
          <fieldset className="mt-6">
            <legend className="mb-3 text-sm font-medium">Weekend days</legend>
            <div className="flex flex-wrap gap-4">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
                (day, i) => (
                  <label
                    key={day}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <input
                      type="checkbox"
                      name="weekend"
                      value={i}
                      defaultChecked={company.weekend.includes(i)}
                      className="accent-teal-700"
                    />
                    {day}
                  </label>
                ),
              )}
            </div>
          </fieldset>
        </Card>
        <Card>
          <h2 className="font-semibold">Teams & roles</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Separate each department or designation with a comma.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field
              label="Departments"
              name="departments"
              defaultValue={company.departments.join(', ')}
              placeholder="Engineering, People, Operations"
            />
            <Field
              label="Designations"
              name="designations"
              defaultValue={company.designations.join(', ')}
              placeholder="Developer, HR Manager, Designer"
            />
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Office location</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Set the office boundary for future camera attendance. Leave both coordinates empty until
            you have the exact location.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <Field
              label="Latitude"
              name="officeLatitude"
              type="number"
              step="any"
              min="-90"
              max="90"
              defaultValue={company.officeLatitude ?? ''}
            />
            <Field
              label="Longitude"
              name="officeLongitude"
              type="number"
              step="any"
              min="-180"
              max="180"
              defaultValue={company.officeLongitude ?? ''}
            />
            <Field
              label="Office radius (meters)"
              name="officeRadius"
              type="number"
              min="10"
              max="10000"
              defaultValue={company.officeRadius}
              required
            />
          </div>
        </Card>
        <Feedback message={error} />
        <Feedback message={success} success />
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save organization settings'}
        </Button>
      </form>
    </div>
  );
}
