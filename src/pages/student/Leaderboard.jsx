import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leaderboard')
      .then(res => setLeaders(res.data.leaderboard || []))
      .catch(err => console.error('Leaderboard fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl space-y-4">
        <h1 className="text-xl font-black text-gray-900">MTTI Student Leaderboard</h1>
        <p className="text-xs text-gray-500">
          Rankings based on punctuality, attendance rate, and punctuality points.
        </p>

        {loading ? (
          <p className="text-xs text-center py-6 text-gray-400">Loading rankings...</p>
        ) : (
          <div className="space-y-2">
            {leaders.map((student, index) => (
              <div 
                key={student.adm_no} 
                className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                  index === 0 ? 'bg-amber-50 border-amber-200' : 
                  index === 1 ? 'bg-slate-50 border-slate-200' : 
                  index === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    index === 0 ? 'bg-amber-500 text-white' :
                    index === 1 ? 'bg-slate-400 text-white' :
                    index === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold text-gray-900">{student.name}</p>
                    <p className="text-[10px] text-gray-500">{student.adm_no} • {student.class_code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-green-600">{student.total_points} pts</p>
                  <p className="text-[10px] text-gray-400">{student.attendance_rate || 95}% Attendance</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}