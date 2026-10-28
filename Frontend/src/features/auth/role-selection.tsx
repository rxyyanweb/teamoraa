'use client';
import Link from 'next/link';
import { ArrowUpRight, Building2, Users, UserRound } from 'lucide-react';
import { AuthFrame } from '@/components/auth/auth-frame';
export function RoleSelection() {
  const roles = [
    {
      name: 'Admin',
      tag: 'THE BIG PICTURE',
      description: 'Guide your organization, manage HR accounts, and oversee payroll.',
      Icon: Building2,
      href: '/login?role=admin',
    },
    {
      name: 'HR',
      tag: 'PEOPLE OPERATIONS',
      description: 'Support your team. Manage people, attendance, and leave requests.',
      Icon: Users,
      href: '/login?role=hr',
    },
    {
      name: 'Employee',
      tag: 'YOUR EVERYDAY',
      description: 'Check in, plan time off, and find your payslips in one place.',
      Icon: UserRound,
      href: '/login?role=employee',
    },
  ];
  return (
    <AuthFrame selection>
      <p className="eyebrow">WELCOME TO TEAMORA</p>
      <h2 className="auth-title">
        A place for
        <br />
        everyone on your team.
      </h2>
      <p className="auth-description">Choose your workspace to get started.</p>
      <div className="role-list">
        {roles.map(({ name, tag, description, Icon, href }, i) => (
          <Link
            key={name}
            href={href}
            className="role-card"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <span className="role-icon">
              <Icon size={23} strokeWidth={1.6} />
            </span>
            <span className="role-copy">
              <small>{tag}</small>
              <strong>{name}</strong>
              <span>{description}</span>
            </span>
            <ArrowUpRight className="role-arrow" size={20} />
          </Link>
        ))}
      </div>
      <p className="auth-help">
        Invited to Teamora? Sign in with the details shared by your Admin or HR team.
      </p>
    </AuthFrame>
  );
}
