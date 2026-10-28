'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock3, ArrowRight, CheckCircle2, Plus } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-provider';
import { useResource } from '@/hooks/use-resource';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/workforce/drawer';
import {
  PageHeading,
  Panel,
  LoadState,
  Status,
  Notice,
  clockTime,
  duration,
  queryString,
  dateLabel,
} from '@/components/workforce/primitives';
import { AttendanceHistory } from './attendance-history';
import { CorrectionForm, CorrectionList } from './corrections';
import type { PersonalAttendance } from '@/types/workforce';
function LiveClock({ now, timezone }: { now: string; timezone: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 1000);
    return () => clearInterval(timer);
  }, [now]);
  return (
    <p className="clock-display" aria-label="Company time">
      {new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(new Date(now).getTime() + elapsed))}
    </p>
  );
}
export function PersonalAttendancePage() {
  const { user } = useAuth();
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const resource = useResource<PersonalAttendance>(
    '/attendance/me?' + queryString({ month, page }),
  );
  const data = resource.data;
  async function punch(action: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.mutate('/attendance/' + action);
      setNotice(
        action === 'check-in'
          ? 'You’re checked in. Have a productive day.'
          : 'Shift completed. Your attendance is saved.',
      );
      resource.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save attendance.');
    } finally {
      setBusy(false);
    }
  }
  const shift = data?.activeShift ?? data?.todayAttendance;
  return (
    <>
      <PageHeading
        title="My attendance"
        description="A clear view of your working day, from the first check-in to the last task."
        action={
          user?.role === 'employee' && (
            <Button variant="outline" disabled={!data} onClick={() => setForm(true)}>
              <Plus size={16} />
              Request correction
            </Button>
          )
        }
      />
      <Notice message={notice} success />
      <Notice message={error} />
      {!data ? (
        <LoadState error={resource.error} retry={resource.reload} />
      ) : (
        <>
          <Panel>
            <div className="clock-card">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 size={15} />
                  {dateLabel(data.today)} · {data.timezone}
                </div>
                <LiveClock key={data.now} now={data.now} timezone={data.timezone} />
                <p className="text-xs text-muted-foreground">
                  Office hours {data.officeStart}–{data.officeEnd}
                </p>
                <div className="clock-details">
                  <div>
                    <p>Check in</p>
                    <strong>{clockTime(shift?.checkedInAt, data.timezone)}</strong>
                  </div>
                  <div>
                    <p>Check out</p>
                    <strong>{clockTime(shift?.checkedOutAt, data.timezone)}</strong>
                  </div>
                  <div>
                    <p>Recorded</p>
                    <strong>{shift?.checkedOutAt ? duration(shift.workedMinutes) : '—'}</strong>
                  </div>
                </div>
              </div>
              <div className="clock-action">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={shift?.shiftState ?? 'ready'}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="w-full"
                  >
                    <Status value={shift?.shiftState ?? 'not_checked_in'} />
                    <h2 className="font-semibold text-lg mt-3 mb-2">
                      {shift?.checkedOutAt
                        ? 'Your day is wrapped up'
                        : shift
                          ? 'You’re on the clock'
                          : 'Ready for a fresh start?'}
                    </h2>
                    <p className="text-xs text-muted-foreground mb-5 leading-5">
                      {shift?.checkedOutAt
                        ? 'Your official times and status are available below.'
                        : shift
                          ? 'Check out when your working day is finished.'
                          : 'Check in to record the start of your working day.'}
                    </p>
                    {shift?.checkedOutAt ? (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <CheckCircle2 size={18} />
                        Attendance saved
                      </div>
                    ) : (
                      <Button
                        disabled={busy}
                        onClick={() => void punch(shift ? 'check-out' : 'check-in')}
                      >
                        {busy ? 'Saving…' : shift ? 'Check out' : 'Check in'}
                        <ArrowRight size={16} />
                      </Button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Panel>
          <AttendanceHistory
            data={data}
            onMonth={(m) => {
              setMonth(m);
              setPage(1);
            }}
            onPage={setPage}
          />
          <CorrectionList key={revision} personal />
          <Drawer
            open={form}
            onClose={() => setForm(false)}
            title="Request an attendance correction"
            description={'All times use ' + data.timezone + '.'}
          >
            <CorrectionForm
              today={data.today}
              onSaved={() => {
                setForm(false);
                setRevision((v) => v + 1);
                setNotice(
                  'Correction sent to HR. Your official record is unchanged until approval.',
                );
              }}
            />
          </Drawer>
        </>
      )}
    </>
  );
}
