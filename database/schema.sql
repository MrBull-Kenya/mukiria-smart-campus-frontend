CREATE DATABASE IF NOT EXISTS mtti_campus_db;
USE mtti_campus_db;

-- 1. Classes Table
CREATE TABLE IF NOT EXISTS classes (
  class_code VARCHAR(50) PRIMARY KEY,
  course VARCHAR(150) NOT NULL,
  module VARCHAR(50) NOT NULL,
  rep_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  role ENUM('student', 'student_rep', 'teacher', 'hod', 'admin') DEFAULT 'student',
  class_code VARCHAR(50),
  reset_token VARCHAR(255),
  reset_expiry DATETIME,
  device_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_code) REFERENCES classes(class_code) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 2a. Browser push subscriptions for notifications delivered while the app is closed
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint_hash CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  baseline_complete TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS push_deliveries (
  endpoint_hash CHAR(64) NOT NULL,
  notification_id VARCHAR(190) NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (endpoint_hash, notification_id),
  FOREIGN KEY (endpoint_hash) REFERENCES push_subscriptions(endpoint_hash) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Students Table
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  adm_no VARCHAR(50) UNIQUE NOT NULL,
  parent_email VARCHAR(255) NOT NULL,
  parent_phone VARCHAR(50) NOT NULL,
  points INT DEFAULT 0,
  attendance_pct DECIMAL(5,2) DEFAULT 100.00,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Timetable Versions (HOD Approval Flow)
CREATE TABLE IF NOT EXISTS timetable_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_code VARCHAR(50) NOT NULL,
  term VARCHAR(50) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  hod_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME NULL,
  FOREIGN KEY (class_code) REFERENCES classes(class_code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Timetable Slots
CREATE TABLE IF NOT EXISTS timetable_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version_id INT NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  unit_name VARCHAR(150) NOT NULL,
  venue VARCHAR(100) NOT NULL,
  lecturer_name VARCHAR(150) NOT NULL,
  FOREIGN KEY (version_id) REFERENCES timetable_versions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Sessions (FEAT 4: Late Thresholds)
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_code VARCHAR(50) NOT NULL,
  unit_name VARCHAR(150) NOT NULL,
  lecturer_name VARCHAR(150) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  late_threshold_mins INT DEFAULT 15,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (class_code) REFERENCES classes(class_code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Attendance Logs (FEAT 1, 2, 3, 4, 5, 16)
CREATE TABLE IF NOT EXISTS attendance_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  adm_no VARCHAR(50) NOT NULL,
  photo_url VARCHAR(255),
  gps_lat DECIMAL(10,8),
  gps_lng DECIMAL(11,8),
  rep_distance_m INT NULL,
  is_late BOOLEAN DEFAULT FALSE,
  is_offline_synced BOOLEAN DEFAULT FALSE,
  device_id VARCHAR(255),
  points_earned INT DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Device Locks (FEAT 2)
CREATE TABLE IF NOT EXISTS device_locks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adm_no VARCHAR(50) UNIQUE NOT NULL,
  device_fingerprint VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. Parent Alerts (FEAT 6)
CREATE TABLE IF NOT EXISTS parent_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adm_no VARCHAR(50) NOT NULL,
  parent_email VARCHAR(255) NOT NULL,
  alert_reason TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 10. Points Logs (FEAT 16)
CREATE TABLE IF NOT EXISTS points_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adm_no VARCHAR(50) NOT NULL,
  points INT NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 11. Badges (FEAT 16)
CREATE TABLE IF NOT EXISTS badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adm_no VARCHAR(50) NOT NULL,
  badge_name VARCHAR(100) NOT NULL,
  awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 12. Temp ID Requests (FEAT 18)
CREATE TABLE IF NOT EXISTS temp_id_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adm_no VARCHAR(50) NOT NULL,
  face_score DECIMAL(5,2) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 13. Chat Messages (FEAT 11)
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_code VARCHAR(50) NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_code) REFERENCES classes(class_code) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. Campus Check-ins (FEAT 12)
CREATE TABLE IF NOT EXISTS campus_checkins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adm_no VARCHAR(50) NOT NULL,
  service_type ENUM('library', 'games', 'fees') NOT NULL,
  status_details VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 15. Ministry Reports (FEAT 20)
CREATE TABLE IF NOT EXISTS ministry_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_title VARCHAR(250) NOT NULL,
  data_payload JSON NOT NULL,
  generated_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;