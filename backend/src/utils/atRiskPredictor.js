export const atRiskPredictor = {
  evaluateRisk({ attendancePct, consecutiveAbsences, currentPoints }) {
    let riskLevel = 'LOW';
    let recommendations = [];

    if (attendancePct < 75.0 || consecutiveAbsences >= 3) {
      riskLevel = 'HIGH';
      recommendations.push('Trigger automated parent alert via SMS/Email.');
      recommendations.push('Flag student for HOD academic counseling review.');
    } else if (attendancePct < 85.0 || consecutiveAbsences >= 2) {
      riskLevel = 'MEDIUM';
      recommendations.push('Send gentle student reminder notification.');
    } else {
      recommendations.push('Student is in good standing.');
    }

    return {
      riskLevel,
      recommendations
    };
  }
};