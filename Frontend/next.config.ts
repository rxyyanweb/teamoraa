import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  async rewrites() {
    const backend = process.env.BACKEND_URL?.replace(/\/$/, '');
    if (!backend) return [];
    const url = new URL(backend);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('BACKEND_URL must be an origin without credentials, path or query.');
    }
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new Error('Production BACKEND_URL must use HTTPS.');
    }
    return [{ source: '/api/:path*', destination: `${url.origin}/api/:path*` }];
  },
  async redirects() {
    return [
      { source: '/dashboard', destination: '/admin/dashboard', permanent: false },
      { source: '/hr-accounts', destination: '/admin/hr-accounts', permanent: false },
      { source: '/leave-settings', destination: '/admin/leave-settings', permanent: false },
      { source: '/organization', destination: '/admin/organization', permanent: false },
      { source: '/audit', destination: '/admin/audit', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default config;
