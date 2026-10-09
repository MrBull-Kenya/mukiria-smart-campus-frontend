import { TimetableVersionModel } from '../models/TimetableVersion.js';
import { TimetableSlotModel } from '../models/TimetableSlot.js';

export const timetableController = {
  async createTimetableVersion(req, res) {
    try {
      const { class_code, term, slots } = req.body;
      const versionResult = await TimetableVersionModel.create({ class_code, term, status: 'pending' });
      const version_id = versionResult.insertId;

      for (const slot of slots) {
        await TimetableSlotModel.create({
          version_id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          unit_name: slot.unit_name,
          venue: slot.venue,
          lecturer_name: slot.lecturer_name
        });
      }

      res.status(201).json({ message: 'Timetable submitted for HOD approval.', version_id });
    } catch (err) {
      console.error('Timetable creation error:', err);
      res.status(500).json({ error: 'Failed to create timetable.' });
    }
  },

  async updateHODApproval(req, res) {
    try {
      const { id } = req.params;
      const { status, hod_comment } = req.body; // approved / rejected
      await TimetableVersionModel.updateStatus(id, status, hod_comment);
      res.json({ message: `Timetable status updated to ${status}.` });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update timetable approval status.' });
    }
  }
};