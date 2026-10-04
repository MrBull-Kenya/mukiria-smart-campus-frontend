/**
 * Starts the rear camera on <video> and calls onResult(text) once with the first QR code found.
 * Uses the native BarcodeDetector where available (Chrome/Android), otherwise jsQR.
 * Returns a stop() function that releases the camera.
 */
export async function startQrScanner(video, onResult) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play().catch(() => {});

  let stopped = false;
  const stop = () => {
    stopped = true;
    stream.getTracks().forEach((t) => t.stop());
    if (video.srcObject) video.srcObject = null;
  };

  let detector = null;
  if ('BarcodeDetector' in window) {
    try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch { detector = null; }
  }
  const jsQR = detector ? null : (await import('jsqr')).default;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const tick = async () => {
    if (stopped) return;
    if (video.readyState >= 2 && video.videoWidth) {
      try {
        let text = null;
        if (detector) {
          text = (await detector.detect(video))[0]?.rawValue || null;
        } else {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          text = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data || null;
        }
        if (text && !stopped) {
          stop();
          onResult(text);
          return;
        }
      } catch { /* keep scanning */ }
    }
    setTimeout(tick, 200);
  };
  tick();
  return stop;
}
