import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// =====================================================
// Middleware: Handle Old ID-based URLs & i18n
// =====================================================
// 1. Redirects /anime/[number] to /anime/[slug] with 301
// 2. Sets locale cookie for internationalization
// =====================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Set locale cookie if not already set
  const locale = request.cookies.get('NEXT_LOCALE')?.value || 'fr';
  if (!request.cookies.has('NEXT_LOCALE')) {
    response.cookies.set('NEXT_LOCALE', locale);
  }

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
      const redirectResponse = NextResponse.redirect(url, { status: 301 });
      // Preserve locale cookie in redirect
      redirectResponse.cookies.set('NEXT_LOCALE', locale);
      return redirectResponse;
    }
  }

  // Continue to the next middleware or page
  return response;
}

// Configure which routes this middleware applies to
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
