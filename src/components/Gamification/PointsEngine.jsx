// Stage 16: Gamification Points Engine Logic
export const PointsEngine = {
  BASE_POINTS: 10,
  LATE_PENALTY_POINTS: 5,
  STREAK_BONUS_THRESHOLD: 5, // 5 sessions in a row

  calculatePoints({ isLate = false, consecutiveStreak = 0 }) {
    let earned = isLate ? this.LATE_PENALTY_POINTS : this.BASE_POINTS;
    let bonusMessage = '';

    if (consecutiveStreak >= this.STREAK_BONUS_THRESHOLD) {
      earned += 5; // Streak bonus
      bonusMessage = 'Streak Bonus Applied (+5 pts)!';
    }

    return {
      points: earned,
      status: isLate ? 'Late Check-in' : 'On-Time Check-in',
      bonusMessage
    };
  },

  getBadgeThresholds(totalPoints) {
    if (totalPoints >= 500) return { tier: 'Elite Scholar', nextGoal: 750 };
    if (totalPoints >= 300) return { tier: 'Advanced Contender', nextGoal: 500 };
    if (totalPoints >= 150) return { tier: 'Active Participant', nextGoal: 300 };
    return { tier: 'Novice Starter', nextGoal: 150 };
  }
};