export const lateCalculator = {
  calculateLateStatus(sessionStartTime, checkinTimestamp, thresholdMins = 15) {
    const start = new Date(sessionStartTime).getTime();
    const checkin = new Date(checkinTimestamp).getTime();
    const diffMins = (checkin - start) / (1000 * 60);

    const isLate = diffMins > thresholdMins;
    const minutesLate = isLate ? Math.round(diffMins - thresholdMins) : 0;

    return {
      isLate,
      minutesLate
    };
  }
};