import { CampusCheckinModel } from '../models/CampusCheckin.js';

export const campusController = {
  async checkinService(req, res) {
    try {
      const { adm_no, service_type, status_details } = req.body; // library, games, fees
      const result = await CampusCheckinModel.create({ adm_no, service_type, status_details });
      res.status(201).json({ message: `Campus check-in recorded for ${service_type}.`, id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: 'Failed to record campus service check-in.' });
    }
  },

  async getCheckins(req, res) {
    try {
      const { adm_no } = req.params;
      const records = await CampusCheckinModel.getByAdm(adm_no);
      res.json(records);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch campus check-in records.' });
    }
  }
};