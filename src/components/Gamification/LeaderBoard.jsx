import React from 'react';

export default function Leaderboard({ students = [] }) {
  // Default mock data tailored for ITECH class if none provided
  const rankList = students.length > 0 ? students : [
    { rank: 1, name: 'Purity Kainyu', adm: '12154', points: 480, badge: '🥇 Gold' },
    { rank: 2, name: 'Dennis Mwenda', adm: '12155', points: 455, badge: '🥈 Silver' },
    { rank: 3, name: 'Collins Kiprono', adm: '12160', points: 430, badge: '🥉 Bronze' },
    { rank: 4, name: 'Brenda Chebet', adm: '12162', points: 410, badge: 'Member' },
    { rank: 5, name: 'Brian Otieno', adm: '12168', points: 395, badge: 'Member' },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Class Leaderboard</h3>
        <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-semibold">Stage 16</span>
      </div>

      <div className="space-y-2">
        {rankList.map((student) => (
          <div 
            key={student.adm} 
            className={`flex items-center justify-between p-3 rounded-xl border transition ${
              student.rank === 1 ? 'bg-amber-50/50 border-amber-200' :
              student.rank === 2 ? 'bg-slate-50 border-slate-200' :
              student.rank === 3 ? 'bg-orange-50/40 border-orange-200' :
              'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                student.rank === 1 ? 'bg-amber-500 text-white' :
                student.rank === 2 ? 'bg-slate-400 text-white' :
                student.rank === 3 ? 'bg-orange-500 text-white' :
                'bg-gray-200 text-gray-700'
              }`}>
                {student.rank}
              </span>
              <div>
                <h4 className="text-sm font-bold text-gray-800">{student.name}</h4>
                <p className="text-xs text-gray-500">ADM: {student.adm}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-blue-600">{student.points} pts</span>
              <p className="text-[10px] text-gray-500 font-medium">{student.badge}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}