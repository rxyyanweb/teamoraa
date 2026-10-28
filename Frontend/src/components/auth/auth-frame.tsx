'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, CircleDot } from 'lucide-react';
import { Brand } from '@/components/shared/brand';
import { ThemeSwitch } from '@/components/theme/theme-provider';
import { OrbitalVisual } from './orbital-visual';
export function AuthFrame({
  children,
  back,
  role = 'Your people, in sync',
  selection = false,
}: {
  children: ReactNode;
  back?: string;
  role?: string;
  selection?: boolean;
}) {
  return (
    <main className={`auth-layout ${selection ? 'auth-selection' : 'auth-login'}`}>
      <section className="auth-art">
        <Link href="/" aria-label="Teamora home">
          <Brand light />
        </Link>
        <div className="auth-art-copy">
          <span className="auth-kicker">
            <CircleDot size={14} /> ONE CONNECTED WORKPLACE
          </span>
          <h1>
            Your people.
            <br />
            Their potential.
            <br />
            <em>In sync.</em>
          </h1>
          <p>
            A little less paperwork.
            <br />
            More space for the people who make it happen.
          </p>
        </div>
        <OrbitalVisual />
        <div className="auth-art-footer">
          <span>TEAMORA / PEOPLE OPERATIONS</span>
          <a href="/assets/CREDITS.txt" target="_blank" rel="noreferrer">
            ARTWORK CREDITS ↗
          </a>
        </div>
      </section>
      <section className="auth-main">
        <header className="auth-top">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          {back && (
            <Link href={back} className="auth-back">
              <ArrowLeft size={16} />
              Choose your role
            </Link>
          )}
          <ThemeSwitch compact />
        </header>
        <div className="auth-form-region" key={role}>
          {children}
        </div>
        <footer className="auth-footer">
          <ShieldCheck size={15} />
          <span>Secure access · {role}</span>
        </footer>
      </section>
    </main>
  );
}
