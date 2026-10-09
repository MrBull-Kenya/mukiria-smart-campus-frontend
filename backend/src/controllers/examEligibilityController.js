import { StudentModel } from '../models/Student.js';

export const examEligibilityController = {
  async checkEligibility(req, res) {
    try {
      const { adm_no } = req.params;
      const student = await StudentModel.findByAdm(adm_no);

      if (!student) return res.status(404).json({ error: 'Student not found.' });

      const attendancePct = parseFloat(student.attendance_pct || 0);
      const isEligible = attendancePct >= 75.00;

      res.json({
        adm_no,
        attendancePct,
        isEligible,
        reason: isEligible ? 'Meets 75% minimum attendance requirement.' : 'Failed 75% attendance threshold.'
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to verify exam eligibility.' });
    }
  }
};