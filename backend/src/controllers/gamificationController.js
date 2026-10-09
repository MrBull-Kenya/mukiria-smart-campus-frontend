import { PointsLogModel } from '../models/PointsLog.js';
import { BadgeModel } from '../models/Badge.js';
import { StudentModel } from '../models/Student.js';

export const gamificationController = {
  async getStudentScorecard(req, res) {
    try {
      const { adm_no } = req.params;
      const student = await StudentModel.findByAdm(adm_no);
      const pointsLogs = await PointsLogModel.getByAdm(adm_no);
      const badges = await BadgeModel.getByAdm(adm_no);

      res.json({
        student,
        pointsLogs,
        badges
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch gamification scorecard.' });
    }
  }
};