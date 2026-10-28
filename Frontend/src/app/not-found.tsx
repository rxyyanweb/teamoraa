import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-content-center gap-4 text-center p-6">
      <p className="eyebrow">404 / A LITTLE OFF TRACK</p>
      <h1 className="text-3xl font-semibold">This page isn’t in your workspace.</h1>
      <Link className="text-primary underline" href="/login">
        Back to Teamora
      </Link>
    </main>
  );
}
