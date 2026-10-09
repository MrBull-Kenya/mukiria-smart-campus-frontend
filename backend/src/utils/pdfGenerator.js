import PDFDocument from 'pdfkit';

export const pdfGenerator = {
  generateAttendancePDF(data, writeStream) {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(writeStream);

    // Header
    doc.fontSize(20).text('Mukiria Technical Training Institute (MTTI)', { align: 'center' });
    doc.fontSize(12).text('Official Attendance & Ministry TVET Compliance Report', { align: 'center' });
    doc.moveDown(2);

    // Metadata
    doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString()}`);
    doc.text(`Class Code: ${data.class_code || 'N/A'}`);
    doc.moveDown();

    // Table / Content
    doc.fontSize(12).text('Summary Statistics:', { underline: true });
    doc.text(`Total Enrolled Students: ${data.total_students || 0}`);
    doc.text(`Average Attendance Rate: ${data.avg_attendance || '0'}%`);
    doc.moveDown();

    doc.text('Attendance Logs:', { underline: true });
    if (data.logs && data.logs.length > 0) {
      data.logs.forEach((log, index) => {
        doc.fontSize(10).text(`${index + 1}. Adm: ${log.adm_no} | Time: ${log.timestamp} | Status: ${log.is_late ? 'Late' : 'On Time'}`);
      });
    } else {
      doc.fontSize(10).text('No logs recorded for this report cycle.');
    }

    doc.end();
  }
};