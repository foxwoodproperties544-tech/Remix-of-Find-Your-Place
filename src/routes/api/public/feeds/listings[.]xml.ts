import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export const Route = createFileRoute('/api/public/feeds/listings.xml')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const county = url.searchParams.get('county');
        
        // Use any cast for the select string to bypass potential transient type mismatches during schema sync
        let query = supabaseAdmin
          .from('properties')
          .select('id, title, description, price, category, property_type, county, town, created_at, updated_at' as any)
          .eq('status', 'published')
          .order('created_at', { ascending: false });
          
        if (county) {
          query = query.eq('county', county);
        }
        
        const { data: listings } = await query.limit(500);
        
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Foxwood Properties - Latest Listings${county ? ` in ${county}` : ''}</title>
    <link>${url.origin}/properties</link>
    <description>Real estate listings from Foxwood Properties Kenya</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${(listings || []).map((l: any) => `
    <item>
      <title><![CDATA[${l.title}]]></title>
      <link>${url.origin}/properties/${l.id}</link>
      <guid>${url.origin}/properties/${l.id}</guid>
      <description><![CDATA[${l.description?.substring(0, 200)}...]]></description>
      <category>${l.category} - ${l.property_type || ''}</category>
      <dc:creator>Foxwood Properties</dc:creator>
      <pubDate>${new Date(l.created_at).toUTCString()}</pubDate>
    </item>`).join('')}
  </channel>
</rss>`;

        return new Response(xml, {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600'
          }
        });
      }
    }
  }
});
