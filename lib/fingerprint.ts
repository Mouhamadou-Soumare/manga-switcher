/**
 * Browser Fingerprinting for Anonymous User Identification
 *
 * Combines multiple browser characteristics to create a unique
 * fingerprint that persists across sessions but is anonymous.
 *
 * Components:
 * - FingerprintJS visitorId (device + browser)
 * - Canvas fingerprint (GPU rendering characteristics)
 * - Screen dimensions and color depth
 * - Timezone
 *
 * Final fingerprint is SHA-256 hashed for privacy.
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Singleton promise for FingerprintJS agent
let fpPromise: Promise<any> | null = null;

/**
 * Generate a unique browser fingerprint
 *
 * @returns SHA-256 hash of combined fingerprint data
 */
export async function getVisitorFingerprint(): Promise<string> {
  try {
    // Load FingerprintJS agent (cached after first call)
    if (!fpPromise) {
      fpPromise = FingerprintJS.load();
    }

    const fp = await fpPromise;
    const result = await fp.get();

    // Combine multiple fingerprint components
    const canvas = await getCanvasFingerprint();
    const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Create combined fingerprint string
    const combined = `${result.visitorId}-${canvas}-${screen}-${timezone}`;

    // Hash for privacy and consistent length
    return await hashString(combined);
  } catch (error) {
    console.error('Fingerprint generation failed:', error);

    // Fallback: Generate from available data only
    const fallback = `fallback-${Date.now()}-${Math.random()}`;
    return await hashString(fallback);
  }
}

/**
 * Generate canvas fingerprint
 *
 * Canvas rendering is unique per GPU/driver combination,
 * creating a stable device identifier.
 *
 * @returns Base64 canvas data URL
 */
async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return 'no-canvas';

    // Draw text with specific styling
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('MangaSwitcher 🎌', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('MangaSwitcher 🎌', 4, 17);

    // Return canvas data
    return canvas.toDataURL();
  } catch (error) {
    console.error('Canvas fingerprint failed:', error);
    return 'canvas-error';
  }
}

/**
 * Hash string using SHA-256
 *
 * @param str - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
async function hashString(str: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('Hash generation failed:', error);

    // Fallback: Simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Check if fingerprinting is supported
 *
 * @returns true if crypto.subtle and canvas are available
 */
export function isFingerprintingSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof crypto !== 'undefined'
    && typeof crypto.subtle !== 'undefined'
    && typeof document !== 'undefined';
}
