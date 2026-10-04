-- ====================================================================
-- MUKIRIA SMART CAMPUS v15 FINAL - FULL PRODUCTION DATABASE SCHEMA
-- Student: Purity Kainyu | ADM NO: 12154
-- Class Code: ITECH6/S/24/J/M/25 MOD IV
-- Features: 15 Stages + Multi-Class Support + Anti-Proxy & Offline Sync
-- ====================================================================

CREATE DATABASE IF NOT EXISTS mukiria_smart_campus_v15 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mukiria_smart_campus_v15;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. CLASSES - Master table for Multi-Class Support across MTTI
CREATE TABLE IF NOT EXISTS classes (
  class_code VARCHAR(100) PRIMARY KEY,
  course_name VARCHAR(150) NOT NULL,
  module VARCHAR(20) NOT NULL,
  department VARCHAR(100) NOT NULL,
  class_rep_id INT NULL,
  total_students INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. USERS - Core user profiles (Students, Reps, Teachers, HODs, Admins)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adm_no VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student','class_rep','teacher','hod','admin') NOT NULL,
  class_code VARCHAR(100),
  device_id VARCHAR(255) NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255) NULL,
  reset_token VARCHAR(255) NULL,
  reset_expiry DATETIME NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_code) REFERENCES classes(class_code) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. STUDENTS - Extended profile for student-specific tracking
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  parent_email VARCHAR(150) NULL,
  parent_phone VARCHAR(20) NULL,
  attendance_percent DECIMAL(5,2) DEFAULT 0.00,
  total_points INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  profile_photo_url VARCHAR(255) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. TIMETABLE_VERSIONS - HOD Approval Workflow
CREATE TABLE IF NOT EXISTS timetable_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_code VARCHAR(100) NOT NULL,
  uploaded_by INT NOT NULL,
  file_url VARCHAR(255) NULL,
  status ENUM('pending','approved','rejected','archived') DEFAULT 'pending',
  semester VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_code) REFERENCES classes(class_code),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- 5. TIMETABLE_SLOTS - Individual scheduled lessons (Venues: H15, LAB1A, etc.)
CREATE TABLE IF NOT EXISTS timetable_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version_id INT NOT NULL,
  day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject_code VARCHAR(50) NOT NULL,
  subject_name VARCHAR(150),
  venue VARCHAR(50) NOT NULL,
  teacher_id INT NULL,
  FOREIGN KEY (version_id) REFERENCES timetable_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- 6. SESSIONS - Active class instances featuring rotating QR tokens
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slot_id INT NOT NULL,
  class_code VARCHAR(100) NOT NULL,
  session_date DATE NOT NULL,
  qr_token VARCHAR(255) NOT NULL,
  qr_expiry DATETIME NOT NULL,
  late_threshold_minutes INT DEFAULT 15,
  status ENUM('scheduled','ongoing','completed','cancelled') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (slot_id) REFERENCES timetable_slots(id),
  FOREIGN KEY (class_code) REFERENCES classes(class_code)
) ENGINE=InnoDB;

-- 7. ATTENDANCE_LOGS - Enforces Stages 1, 2, 3, 4, 5, 16 (Face, GPS, Device, Points, Offline)
CREATE TABLE IF NOT EXISTS attendance_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  student_id INT NOT NULL,
  scan_time DATETIME NOT NULL,
  status ENUM('present','late','absent') DEFAULT 'present',
  photo_url VARCHAR(255) NULL,
  gps_lat DECIMAL(10,8) NULL,
  gps_lng DECIMAL(11,8) NULL,
  is_inside_fence BOOLEAN DEFAULT TRUE,
  device_id VARCHAR(255) NULL,
  device_fingerprint VARCHAR(255) NULL,
  is_late BOOLEAN DEFAULT FALSE,
  late_minutes INT DEFAULT 0,
  is_offline_synced BOOLEAN DEFAULT FALSE,
  points_earned INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  UNIQUE KEY unique_session_student (session_id, student_id)
) ENGINE=InnoDB;

-- 8. DEVICE_LOCKS - Stage 2 Anti-Proxy (One Admission Number = One Unique Device)
CREATE TABLE IF NOT EXISTS device_locks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adm_no VARCHAR(50) NOT NULL,
  student_id INT NOT NULL,
  device_fingerprint VARCHAR(255) NOT NULL,
  device_model VARCHAR(100) NULL,
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id),
  UNIQUE KEY unique_adm_device (adm_no, device_fingerprint)
) ENGINE=InnoDB;

-- 9. PARENT_ALERTS - Stage 6 & 7 (Automated absentee notifications and risk flags)
CREATE TABLE IF NOT EXISTS parent_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  alert_type ENUM('absent_3days','at_risk','exam_ineligible','general') NOT NULL,
  message TEXT NOT NULL,
  channel ENUM('email','sms','both') DEFAULT 'both',
  sent_to VARCHAR(150) NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP NULL,
  FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB;

-- 10. POINTS_LOGS - Stage 16 Gamification tracking
CREATE TABLE IF NOT EXISTS points_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  points INT NOT NULL,
  reason ENUM('present','early','late','perfect_week','streak_bonus') NOT NULL,
  session_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
) ENGINE=InnoDB;

-- 11. BADGES - Stage 16 Achievement Awards
CREATE TABLE IF NOT EXISTS badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  badge_name VARCHAR(100) NOT NULL,
  badge_icon VARCHAR(50) NULL,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB;

-- 12. TEMP_ID_REQUESTS - Stage 18 Lost ID Temporary Pass Management
CREATE TABLE IF NOT EXISTS temp_id_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  reason TEXT,
  face_match_score DECIMAL(5,2) NULL,
  temp_qr_token VARCHAR(255) NOT NULL,
  status ENUM('pending','approved','rejected','expired') DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INT NULL,
  expiry_at DATETIME NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- 13. CHAT_MESSAGES - Stage 11 Class-Isolated Real-time Messaging
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_code VARCHAR(100) NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  message_type ENUM('text','file','timetable_update') DEFAULT 'text',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_code) REFERENCES classes(class_code),
  FOREIGN KEY (sender_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- 14. CAMPUS_CHECKINS - Stage 12 Broad Campus Services (Library, Games, Fees Clearance)
CREATE TABLE IF NOT EXISTS campus_checkins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  checkin_type ENUM('library','games','fees','gate','exam') NOT NULL,
  venue VARCHAR(100) NULL,
  checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_by INT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (verified_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- 15. MINISTRY_REPORTS - Stage 20 TVET Audit Documentation
CREATE TABLE IF NOT EXISTS ministry_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_code VARCHAR(100) NOT NULL,
  term VARCHAR(50) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  total_students INT NOT NULL,
  avg_attendance_percent DECIMAL(5,2) NOT NULL,
  at_risk_count INT DEFAULT 0,
  eligible_count INT DEFAULT 0,
  report_file_url VARCHAR(255) NULL,
  generated_by INT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_code) REFERENCES classes(class_code),
  FOREIGN KEY (generated_by) REFERENCES users(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ====================================================================
-- INITIAL SEED DATA FOR TESTING
-- ====================================================================
INSERT INTO classes (class_code, course_name, module, department, total_students) VALUES 
('ITECH6/S/24/J/M/25 MOD IV', 'Information Technology Module IV', 'Module 4', 'ICT Department', 22);

INSERT INTO users (adm_no, full_name, email, phone, password_hash, role, class_code, email_verified) VALUES 
('12154', 'Purity Kainyu', 'purity.kainyu@mukiria.ac.ke', '+254700000000', '$2y$10$YourHashedPasswordHere', 'class_rep', 'ITECH6/S/24/J/M/25 MOD IV', TRUE);

UPDATE classes SET class_rep_id = 1 WHERE class_code = 'ITECH6/S/24/J/M/25 MOD IV';