export const enforceClassIsolation = (req, res, next) => {
  try {
    const userClassCode = req.user?.class_code;
    const requestedClassCode = req.params.class_code || req.body.class_code || req.query.class_code;

    // Admins, HODs, and system-wide lecturers bypass class isolation
    if (['admin', 'hod', 'teacher'].includes(req.user?.role)) {
      return next();
    }

    if (requestedClassCode && userClassCode !== requestedClassCode) {
      return res.status(403).json({
        error: 'Multi-class isolation violation: Access restricted to your assigned class code.'
      });
    }

    next();
  } catch (err) {
    console.error('Class isolation middleware error:', err);
    res.status(500).json({ error: 'Failed to enforce class isolation rules.' });
  }
};