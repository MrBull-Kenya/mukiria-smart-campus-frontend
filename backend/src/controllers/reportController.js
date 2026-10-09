import PDFDocument from 'pdfkit';
import { pool } from '../config/db.js';

export const reportController = {
  async generateMinistryCompliancePdf(req, res) {
    try {
      const { class_code, start_date, end_date } = req.query;

      // Fetch compliance attendance data from database
      const [rows] = await pool.query(
        `SELECT s.adm_no, s.name, s.class_code,
                COUNT(al.id) as sessions_attended,
                SUM(al.points_earned) as total_points
         FROM students s
         LEFT JOIN attendance_logs al ON s.adm_no = al.adm_no
         WHERE (? IS NULL OR s.class_code = ?)
         GROUP BY s.adm_no, s.name, s.class_code
         ORDER BY total_points DESC`,
        [class_code || null, class_code || null]
      );

      // Initialize PDF Document
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=MTTI_Ministry_Attendance_Compliance_Report.pdf');
      doc.pipe(res);

      // PDF Header
      doc.fontSize(18).font('Helvetica-Bold').text('Mukiria Technical Training Institute (MTTI)', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('Ministry of Education & ICT Authority Compliance Report', { align: 'center' });
      doc.moveDown(1.5);

      doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString()}`);
      doc.text(`Target Class Filter: ${class_code || 'All Institutional Classes'}`);
      doc.moveDown(1);

      // Table Header
      doc.font('Helvetica-Bold');
      doc.text('Adm No', 50, doc.y, { continued: true });
      doc.text('Student Name', 160, doc.y, { continued: true });
      doc.text('Class Code', 320, doc.y, { continued: true });
      doc.text('Sessions', 420, doc.y, { continued: true });
      doc.text('Points', 480, doc.y);
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Table Rows
      doc.font('Helvetica');
      rows.forEach(row => {
        if (doc.y > 700) doc.addPage(); // Page break if needed
        doc.text(row.adm_no, 50, doc.y, { continued: true });
        doc.text(row.name || 'N/A', 160, doc.y, { continued: true });
        doc.text(row.class_code || 'N/A', 320, doc.y, { continued: true });
        doc.text(String(row.sessions_attended || 0), 420, doc.y, { continued: true });
        doc.text(String(row.total_points || 0), 480, doc.y);
        doc.moveDown(0.4);
      });

      doc.end();
    } catch (err) {
      console.error('PDF Generation Error:', err);
      res.status(500).json({ error: 'Failed to generate Ministry compliance PDF.' });
    }
  }
};