import api from './api';

export const attendanceService = {
  // Converts base64 / captured canvas blob into FormData for multer.single('photo')
  async submitScan(scanData) {
    const formData = new FormData();
    
    // Append standard fields expected by the backend
    formData.append('qr_code', scanData.qr_code || '');
    formData.append('latitude', scanData.latitude || '');
    formData.append('longitude', scanData.longitude || '');
    formData.append('device_hash', scanData.device_hash || '');

    // If a base64 photo string is provided, convert it to a Blob/File object
    if (scanData.photoBase64) {
      const response = await fetch(scanData.photoBase64);
      const blob = await response.blob();
      formData.append('photo', blob, 'face_verify.jpg');
    } else if (scanData.photoFile) {
      formData.append('photo', scanData.photoFile);
    }

    // This automatically triggers the interceptor to drop 'Content-Type' 
    // so the browser handles the multipart boundary correctly.
    const res = await api.post('/attendance/scan', formData);
    return res.data;
  }
};