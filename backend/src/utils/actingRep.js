import { one, sqlDate } from './dbHelpers.js';

export async function activeActingRepById(assignmentId, sessionId) {
  return one(
    `SELECT a.id, a.class_code
     FROM acting_rep_assignments a
     JOIN sessions s ON s.id = ? AND a.session_id = s.id
     JOIN users u ON u.id = a.acting_user_id
     JOIN users p ON p.id = a.appointed_by
     WHERE a.id = ? AND a.revoked_at IS NULL
       AND a.expires_at > ? AND s.is_active = 1
       AND u.role = 'student' AND u.status = 'active'
       AND u.class_code = a.class_code AND s.class_code = a.class_code
       AND p.role = 'student_rep' AND p.status = 'active' AND p.class_code = a.class_code`,
    [sessionId, assignmentId, sqlDate(new Date())]
  );
}

export async function activeActingRepForClass(userId, classCode) {
  return one(
    `SELECT a.id, a.class_code, a.session_id, a.expires_at, a.acting_user_id, u.name AS acting_name
     FROM acting_rep_assignments a
     JOIN users u ON u.id = a.acting_user_id
     JOIN users p ON p.id = a.appointed_by
     WHERE a.acting_user_id = ? AND a.class_code = ? AND a.revoked_at IS NULL
       AND a.expires_at > ? AND u.role = 'student' AND u.status = 'active'
       AND u.class_code = a.class_code
       AND p.role = 'student_rep' AND p.status = 'active' AND p.class_code = a.class_code
       AND (a.session_id IS NULL OR EXISTS (SELECT 1 FROM sessions s WHERE s.id = a.session_id AND s.is_active = 1))
     ORDER BY a.id DESC LIMIT 1`,
    [userId, classCode, sqlDate(new Date())]
  );
}
