import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// =====================================================
// Middleware: Handle Old ID-based URLs
// =====================================================
// Redirects /anime/[number] to /anime/[slug] with 301
// Only runs when the path matches a numeric anime ID
// =====================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if URL matches /anime/[number] pattern
  const match = pathname.match(/^\/anime\/(\d+)$/);

  if (match) {
    const malId = parseInt(match[1]);

    // Fetch anime slug from Supabase
    const { data: anime } = await supabase
      .from('animes')
      .select('slug')
      .eq('mal_id', malId)
      .maybeSingle();

    if (anime?.slug) {
      // Redirect to slug-based URL with 301 permanent redirect
      const url = request.nextUrl.clone();
      url.pathname = `/anime/${anime.slug}`;
      return NextResponse.redirect(url, { status: 301 });
    }
  }

  // Continue to the next middleware or page
  return NextResponse.next();
}

// Configure which routes this middleware applies to
export const config = {
  matcher: '/anime/:path*',
};
