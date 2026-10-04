export const POINTS_CONFIG = {
  LIBRARY_CHECKIN: 10,
  GAMES_PARTICIPATION: 20,
  TIMELY_FEES_CLEARANCE: 50,
  TIMELY_ATTENDANCE: 15,
  QUIZ_COMPLETION: 25
};

export function calculateTotalPoints(activityLogs = []) {
  return activityLogs.reduce((total, log) => {
    const points = POINTS_CONFIG[log.type] || 5;
    return total + points;
  }, 0);
}

export function getStudentBadgeRank(totalPoints) {
  if (totalPoints >= 500) return { rank: 'Platinum Scholar', color: 'text-purple-600 bg-purple-50' };
  if (totalPoints >= 300) return { rank: 'Gold Innovator', color: 'text-amber-600 bg-amber-50' };
  if (totalPoints >= 150) return { rank: 'Silver Contributor', color: 'text-blue-600 bg-blue-50' };
  return { rank: 'Bronze Member', color: 'text-gray-600 bg-gray-50' };
}