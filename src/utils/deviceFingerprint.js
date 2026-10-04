/**
 * Generates a high-entropy, collision-resistant device fingerprint using 
 * WebGL renderer, hardware specs, screen geometry, timezone, and crypto SHA-256.
 */
export async function getDeviceFingerprint() {
  let fp = localStorage.getItem('mtti_device_fp');
  if (fp) return fp;

  try {
    // 1. Gather hardware & browser entropy signals
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    const screenRes = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const cpuCores = navigator.hardwareConcurrency || 'unknown';
    const deviceMem = navigator.deviceMemory || 'unknown';
    const tzOffset = new Date().getTimezoneOffset();

    // 2. WebGL Renderer info (distinguishes physical GPUs across same phone models)
    let glRenderer = 'unknown';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          glRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (e) {
      // Fallback if WebGL is restricted
    }

    // 3. Canvas text fingerprinting seed
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial'";
    ctx.fillText('MTTI Smart Campus v15 Secure FP', 2, 2);
    const canvasHashSeed = c.toDataURL().substring(50, 150);

    const rawEntropyString = [
      userAgent,
      language,
      screenRes,
      cpuCores,
      deviceMem,
      tzOffset,
      glRenderer,
      canvasHashSeed
    ].join('###');

    // 4. Compute cryptographic SHA-256 hash for 256-bit uniqueness
    const msgBuffer = new TextEncoder().encode(rawEntropyString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    fp = 'mtti_fp_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  } catch (err) {
    console.warn('Crypto fingerprint fallback triggered:', err);
    fp = 'mtti_fp_fb_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  }

  localStorage.setItem('mtti_device_fp', fp);
  return fp;
}