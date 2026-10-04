import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function LiveSessionMonitor({ sessionId }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await api.get(`/sessions/${sessionId}/live`);
        setAttendees(res.data.attendees || []);
      } catch (err) {
        console.error('Error fetching live attendance:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 5000); // Poll every 5s for real-time updates
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-black text-gray-900">Live Class Attendance Monitor</h2>
        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full animate-pulse">
          ● Live ({attendees.length} Checked In)
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500 py-4 text-center">Loading live records...</p>
      ) : attendees.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Waiting for students to scan attendance QR code...</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {attendees.map((student) => (
            <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
              <div className="flex items-center space-x-3">
                {student.photo_url ? (
                  <img src={student.photo_url} alt="" className="w-8 h-8 rounded-full object-cover border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                    {student.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-bold text-gray-900">{student.name}</p>
                  <p className="text-[10px] text-gray-500">{student.adm_no} • {student.class_code}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${student.is_late ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {student.is_late ? 'Late' : 'On Time'}
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">+{student.points_earned} pts</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}