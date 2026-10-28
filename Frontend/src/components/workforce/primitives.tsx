'use client';
import { useState, type ReactNode } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { ChevronLeft, ChevronRight, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </MotionConfig>
  );
}
export function Entrance({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {children}
    </motion.div>
  );
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title-row">
      <div>
        <p className="eyebrow mb-2">PEOPLE OPERATIONS</p>
        <h1 className="page-heading">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="work-panel">
      {title && (
        <div className="panel-heading">
          <div>
            <h2 className="font-semibold text-sm">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-1.5">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Metrics({
  items,
}: {
  items: { label: string; value: ReactNode; note?: string }[];
}) {
  return (
    <div className="metric-grid">
      {items.map((item, i) => (
        <motion.div
          className="metric-cell"
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.035, 0.15) }}
        >
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="metric-value">{item.value}</p>
          {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
        </motion.div>
      ))}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  return <span className={'status-badge status-' + value}>{label(value)}</span>;
}
export const label = (value: string) =>
  value.replaceAll('_', ' ').replace(/^./, (s) => s.toUpperCase());
export const duration = (minutes: number) => Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'm';
export function clockTime(iso: string | null | undefined, zone: string) {
  return iso
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso))
    : '—';
}
export function dateLabel(date: string) {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
export function Empty({
  title = 'Nothing here yet',
  description = 'Records will appear here when your team gets started.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={23} />
      </span>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">{description}</p>
    </div>
  );
}
export function LoadState({ error, retry }: { error?: string; retry?: () => void }) {
  return error ? (
    <div className="p-6">
      <Notice message={error} />
      {retry && (
        <Button variant="outline" className="mt-3" onClick={retry}>
          <RefreshCw size={15} />
          Try again
        </Button>
      )}
    </div>
  ) : (
    <div className="skeleton-block" role="status" aria-label="Loading records">
      <div />
      <div />
      <div />
      <div />
    </div>
  );
}
export function Notice({ message, success = false }: { message: string; success?: boolean }) {
  return message ? (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={'notice ' + (success ? 'notice-success' : 'notice-error')}
      role={success ? 'status' : 'alert'}
    >
      {message}
    </motion.div>
  ) : null;
}
export function Pagination({
  total,
  page,
  pageSize,
  onPage,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total === 0
          ? '0 results'
          : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
      </span>
      <div className="flex gap-2">
        <Button
          size="icon"
          variant="outline"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Next page"
          disabled={page * pageSize >= total}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
export function MonthNav({
  month,
  onChange,
}: {
  month: string;
  onChange: (value: string) => void;
}) {
  function step(delta: number) {
    const d = new Date(month + '-01T12:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + delta);
    onChange(d.toISOString().slice(0, 7));
  }
  return (
    <div className="flex items-center gap-2">
      <Button size="icon" variant="ghost" aria-label="Previous month" onClick={() => step(-1)}>
        <ChevronLeft size={17} />
      </Button>
      <input
        aria-label="Calendar month"
        className="month-input"
        type="month"
        min="2000-01"
        max="2100-12"
        value={month}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
      />
      <Button size="icon" variant="ghost" aria-label="Next month" onClick={() => step(1)}>
        <ChevronRight size={17} />
      </Button>
    </div>
  );
}
export function Calendar({
  month,
  days,
  onDay,
}: {
  month: string;
  days: { date: string; status: string; caption?: string }[];
  onDay?: (date: string) => void;
}) {
  const offset = (new Date(month + '-01T12:00:00Z').getUTCDay() + 6) % 7;
  const count = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  return (
    <div className="calendar-wrap">
      <div className="calendar-week">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <motion.div
        key={month}
        initial={{ opacity: 0, x: 6 }}
        animate={{ opacity: 1, x: 0 }}
        className="calendar-grid"
      >
        {Array.from({ length: offset }, (_, i) => (
          <div className="calendar-blank" key={'blank' + i} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const date = month + '-' + String(i + 1).padStart(2, '0');
          const day = days.find((d) => d.date === date);
          return (
            <button
              key={date}
              type="button"
              className={'calendar-day ' + (day ? 'calendar-' + day.status : '')}
              onClick={() => onDay?.(date)}
              disabled={!onDay}
              aria-label={date + (day ? ' ' + label(day.status) : '')}
            >
              <span>{i + 1}</span>
              {day && (
                <>
                  <i className={'status-dot status-' + day.status} />
                  <small>{day.caption ?? label(day.status)}</small>
                </>
              )}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
export function SearchFilter({ onSearch }: { onSearch: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="search-filter"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value);
      }}
    >
      <input
        aria-label="Search employees"
        placeholder="Search name or employee ID"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button variant="ghost" size="sm" type="submit">
        Search
      </Button>
    </form>
  );
}
export function SelectFilter({
  label: name,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="filter-select"
      aria-label={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{name}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
export const queryString = (values: Record<string, string | number>) =>
  new URLSearchParams(
    Object.entries(values)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString();
export function Detail({ label: name, children }: { label: string; children: ReactNode }) {
  return (
    <div className="detail-row">
      <dt>{name}</dt>
      <dd>{children}</dd>
    </div>
  );
}
