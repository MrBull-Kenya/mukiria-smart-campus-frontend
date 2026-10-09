export const pointsCalculator = {
  calculatePoints(actionType, isLate = false) {
    switch (actionType) {
      case 'attendance_ontime':
        return 15;
      case 'attendance_late':
        return 5;
      case 'campus_checkin':
        return 2;
      case 'peer_help':
        return 10;
      default:
        return 1;
    }
  }
};