import React from 'react';

export default function BadgeSystem({ unlockedBadges = ['early_bird', 'perfect_week'] }) {
  const allBadges = [
    { id: 'early_bird', title: 'Early Bird', desc: 'Checked in 10 mins before class start', icon: '⚡', unlocked: unlockedBadges.includes('early_bird') },
    { id: 'perfect_week', title: 'Perfect Week', desc: '100% attendance across all sessions this week', icon: '🔥', unlocked: unlockedBadges.includes('perfect_week') },
    { id: 'geofence_master', title: 'Geofence Master', desc: 'Consistent precise check-ins within LAB1A', icon: '📍', unlocked: unlockedBadges.includes('geofence_master') },
    { id: 'offline_sync', title: 'Network Resilient', desc: 'Successfully synced offline attendance logs', icon: '🛡️️', unlocked: unlockedBadges.includes('offline_sync') },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Achievement Badges</h3>
        <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-semibold">Stage 16</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {allBadges.map((badge) => (
          <div 
            key={badge.id} 
            className={`p-3 rounded-xl border flex flex-col items-center text-center space-y-2 transition ${
              badge.unlocked ? 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200' : 'bg-gray-50 border-gray-200 opacity-50 grayscale'
            }`}
          >
            <span className="text-3xl">{badge.icon}</span>
            <div>
              <h4 className="text-xs font-bold text-gray-800">{badge.title}</h4>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{badge.desc}</p>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badge.unlocked ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
              {badge.unlocked ? 'Unlocked' : 'Locked'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}