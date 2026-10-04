export class FaceCaptureService {
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.stream = null;
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
      }
      return true;
    } catch (err) {
      console.error('Error accessing webcam for face capture:', err);
      throw new Error('Unable to access camera. Please check permissions.');
    }
  }

  captureFrame() {
    if (!this.videoElement) throw new Error('Video element not initialized.');
    
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth || 640;
    canvas.height = this.videoElement.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}