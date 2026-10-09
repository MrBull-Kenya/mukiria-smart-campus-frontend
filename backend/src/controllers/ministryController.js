import { MinistryReportModel } from '../models/MinistryReport.js';

export const ministryController = {
  async generateReport(req, res) {
    try {
      const { report_title, data_payload } = req.body;
      const generated_by = req.user.id;

      const result = await MinistryReportModel.create({
        report_title,
        data_payload,
        generated_by
      });

      res.status(201).json({ message: 'Ministry compliance report generated.', reportId: result.insertId });
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate ministry report.' });
    }
  },

  async getAllReports(req, res) {
    try {
      const reports = await MinistryReportModel.getAll();
      res.json(reports);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch ministry reports.' });
    }
  }
};