import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

/**
 * GET /api/votes/[checkpointId]?fingerprint=xxx
 *
 * Retrieves the existing vote (if any) for a checkpoint by a specific user.
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing checkpointId
 * @returns JSON with vote type ('up', 'down', or null)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ checkpointId: string }> }
) {
  try {
    const { checkpointId } = await params;
    const fingerprint = request.nextUrl.searchParams.get('fingerprint');

    // No fingerprint provided - return null vote
    if (!fingerprint) {
      return NextResponse.json({
        vote: null,
        message: 'No fingerprint provided'
      });
    }

    // Query existing vote from database
    const { data, error } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('checkpoint_id', checkpointId)
      .eq('voter_fingerprint', fingerprint)
      .maybeSingle();

    if (error) {
      console.error('Error fetching vote:', error);
      return NextResponse.json(
        { vote: null, error: 'Database error' },
        { status: 500 }
      );
    }

    // Return existing vote or null
    return NextResponse.json({
      vote: data?.vote_type || null
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/votes/[checkpointId]:', error);
    return NextResponse.json(
      { vote: null, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
