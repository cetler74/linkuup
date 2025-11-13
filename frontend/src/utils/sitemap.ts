/**
 * Sitemap generation utility
 * This can be used to generate a dynamic sitemap or static sitemap
 */

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export const publicRoutes: SitemapUrl[] = [
  {
    loc: '/',
    changefreq: 'daily',
    priority: 1.0,
  },
  {
    loc: '/search',
    changefreq: 'hourly',
    priority: 0.9,
  },
  {
    loc: '/about',
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    loc: '/contact',
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    loc: '/pricing',
    changefreq: 'weekly',
    priority: 0.9,
  },
  {
    loc: '/join',
    changefreq: 'weekly',
    priority: 0.9,
  },
  {
    loc: '/privacy-policy',
    changefreq: 'yearly',
    priority: 0.3,
  },
  {
    loc: '/terms-of-service',
    changefreq: 'yearly',
    priority: 0.3,
  },
];

export function generateSitemap(urls: SitemapUrl[], baseUrl: string): string {
  const urlEntries = urls.map((url) => {
    const loc = url.loc.startsWith('http') ? url.loc : `${baseUrl}${url.loc}`;
    const lastmod = url.lastmod || new Date().toISOString().split('T')[0];
    const changefreq = url.changefreq || 'weekly';
    const priority = url.priority !== undefined ? url.priority : 0.5;

    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

