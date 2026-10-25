# MUKIRIA SMART CAMPUS v15 - FINAL
## Overview
An enterprise-grade, multi-class attendance and campus management system designed to eliminate proxy signing using biometric face capture, GPS geofencing, device fingerprinting, and offline PWA synchronization.

## Features List (15 Stages)
1. **Face Verification on Scan**: Captures photo on check-in to prevent proxy.
2. **Device Lock Anti-Proxy**: Binds one ADM NO to one unique device fingerprint.
3. **GPS Geofence (10,000m / 10km)**: Restricts attendance scans to the configured MTTI area; each scan must also be within 30m of the QR display.
4. **Late vs. Present Intelligence**: Automated threshold calculation (Present / Late / Absent).
5. **Offline PWA Sync**: IndexedDB sync for supported queued actions. Attendance check-in requires an internet connection and an enrolled passkey.
6. **Parent Automated Alerts**: SMS/Email notifications via Africa's Talking & Nodemailer.
7. **At-Risk Student Predictor**: Red-flag indicators for students falling below 70% attendance.
8. **Exam Eligibility (75% Rule)**: Automatic blocking for CAT/Exam registration if attendance is insufficient.
9. **Topic-Based Absenteeism**: Tracks missed specific syllabus topics.
10. **TTS Voice Alerts**: Text-to-speech audio announcements for timetable changes.
11. **Class-Isolated Chat**: Real-time Socket.io chat restricted by `class_code`.
12. **Campus-Wide Check-ins**: Extends QR verification to Library, Games, and Fees Clearance.
13. **Gamification Leaderboard**: Points engine rewarding early birds and streaks with badges.
14. **Lost ID 24hr Replacement**: Temporary secure QR pass verified via face match.
15. **Ministry TVET PDF Export**: One-click audit reports for the Ministry of Education.
16. **Background notifications**: Opt-in browser push alerts for the role-specific campus notifications, including while the app is closed.