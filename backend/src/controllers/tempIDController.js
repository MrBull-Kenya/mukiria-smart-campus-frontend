import { TempIDRequestModel } from '../models/TempIDRequest.js';

export const tempIDController = {
  async requestTempID(req, res) {
    try {
      const { adm_no, face_score } = req.body;
      const expires_at = new Date(Date.now() + 24 * 3600000); // 24 hours

      const result = await TempIDRequestModel.create({
        adm_no,
        face_score,
        status: 'pending',
        expires_at
      });

      res.status(201).json({ message: 'Temporary ID request submitted.', requestId: result.insertId });
    } catch (err) {
      res.status(500).json({ error: 'Failed to request temporary ID.' });
    }
  },

  async updateTempIDStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await TempIDRequestModel.updateStatus(id, status);
      res.json({ message: `Temporary ID status updated to ${status}.` });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update temporary ID status.' });
    }
  }
};