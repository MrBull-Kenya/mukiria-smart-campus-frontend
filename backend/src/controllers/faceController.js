export const faceController = {
  async verifyFace(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No face image uploaded.' });
      }
      // Mock biometric facial recognition matching score
      const matchScore = 0.94;
      res.json({ verified: matchScore > 0.85, score: matchScore });
    } catch (err) {
      res.status(500).json({ error: 'Facial verification failed.' });
    }
  }
};