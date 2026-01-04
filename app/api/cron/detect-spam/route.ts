import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

/**
 * Cron Job: Detect Spam Patterns
 *
 * This endpoint is called periodically by Vercel Cron (every 15 minutes).
 * It analyzes voting patterns and flags suspicious users for CAPTCHA validation.
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * Spam patterns detected:
 * 1. Multiple rapid votes on different checkpoints (>5 in 5 minutes)
 * 2. Same IP address with different fingerprints
 * 3. Excessive voting frequency (>8 votes in 10 minutes)
 */
export async function GET(request: NextRequest) {
  try {
    // ===============================================
    // SECURITY: Verify Cron Secret
    // ===============================================
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== expectedAuth) {
      console.warn('Unauthorized cron job access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ===============================================
    // EXECUTE SPAM DETECTION
    // ===============================================
    const { error } = await supabase.rpc('detect_spam_patterns');

    if (error) {
      console.error('Spam detection error:', error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    // ===============================================
    // SUCCESS
    // ===============================================
    return NextResponse.json({
      success: true,
      message: 'Spam patterns detected and users flagged',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Unexpected error in spam detection cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Optional: Allow POST method as well (Vercel Cron can use both)
export async function POST(request: NextRequest) {
  return GET(request);
}
