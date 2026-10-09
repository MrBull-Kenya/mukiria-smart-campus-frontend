import { ClassModel } from '../models/Class.js';
import { UserModel } from '../models/User.js';
import { StudentModel } from '../models/Student.js';
import { TimetableVersionModel } from '../models/TimetableVersion.js';
import { TimetableSlotModel } from '../models/TimetableSlot.js';
import { SessionModel } from '../models/Session.js';
import { AttendanceLogModel } from '../models/AttendanceLog.js';
import { DeviceLockModel } from '../models/DeviceLock.js';
import { ParentAlertModel } from '../models/ParentAlert.js';
import { PointsLogModel } from '../models/PointsLog.js';
import { BadgeModel } from '../models/Badge.js';
import { TempIDRequestModel } from '../models/TempIDRequest.js';
import { ChatMessageModel } from '../models/ChatMessage.js';
import { CampusCheckinModel } from '../models/CampusCheckin.js';
import { MinistryReportModel } from '../models/MinistryReport.js';
import { runMigrations } from './migrate.js';

// Creates every table (in dependency order) and applies the schema additions. Safe to run repeatedly.
export async function initializeDatabaseTables() {
  for (const model of [ClassModel, UserModel, StudentModel, TimetableVersionModel, TimetableSlotModel, SessionModel, AttendanceLogModel,
    DeviceLockModel, ParentAlertModel, PointsLogModel, BadgeModel, TempIDRequestModel, ChatMessageModel, CampusCheckinModel, MinistryReportModel]) {
    await model.createTable();
  }
  await runMigrations();
}
