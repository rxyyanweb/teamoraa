'use client';
import { useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { initials } from '@/lib/utils';
import type { User } from '@/types/api';
function Highlight({ text, query }: { text: string; query: string }) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0 || !query) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}
export function PeopleSearch({
  value,
  onChange,
  people,
  loading,
  error,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  people: User[];
  loading: boolean;
  error: string;
  onSelect: (person: User) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const visible = open && value.trim().length > 0;
  const results = people.slice(0, 6);
  const select = (person: User) => {
    setOpen(false);
    setActive(-1);
    onSelect(person);
  };
  return (
    <div
      className="people-search"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Search size={17} className="absolute left-3 top-3.5 text-muted-foreground" />
      <Input
        ref={input}
        role="combobox"
        aria-label="Search people"
        aria-autocomplete="list"
        aria-controls={id}
        aria-expanded={visible}
        aria-activedescendant={
          visible && active >= 0 && results[active] ? `${id}-${active}` : undefined
        }
        autoComplete="off"
        placeholder="Search name, ID, or department…"
        maxLength={100}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            setActive(-1);
            e.stopPropagation();
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
            if (results.length)
              setActive((i) =>
                e.key === 'ArrowDown'
                  ? (i + 1) % results.length
                  : (i - 1 + results.length) % results.length,
              );
          }
          if (e.key === 'Enter' && visible && active >= 0 && results[active]) {
            e.preventDefault();
            select(results[active]);
          }
        }}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-1 top-1 grid size-9 place-items-center text-muted-foreground"
          onClick={() => {
            onChange('');
            setOpen(false);
            input.current?.focus();
          }}
        >
          <X size={15} />
        </button>
      )}
      {visible && (
        <div
          id={id}
          role="listbox"
          aria-label="Matching employees"
          className="search-suggestions"
          aria-busy={loading}
        >
          {loading ? (
            <p role="status" className="search-message">
              Finding your people…
            </p>
          ) : error ? (
            <p role="alert" className="search-message">
              {error}
            </p>
          ) : results.length ? (
            results.map((person, i) => (
              <div
                key={person.id}
                id={`${id}-${i}`}
                role="option"
                aria-selected={active === i}
                className="search-option"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => select(person)}
                onPointerMove={() => setActive(i)}
              >
                <span className="avatar">{initials(person.name)}</span>
                <div className="min-w-0">
                  <strong>
                    <Highlight text={person.name} query={value.trim()} />
                  </strong>
                  <p>
                    <Highlight
                      text={`${person.department || 'No department'} · ${person.designation || 'Team member'}`}
                      query={value.trim()}
                    />
                  </p>
                  <p>
                    <Highlight text={person.employeeCode} query={value.trim()} /> ·{' '}
                    {person.active ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="search-message">No matches. Try a name, employee ID, or department.</p>
          )}
        </div>
      )}
    </div>
  );
}
