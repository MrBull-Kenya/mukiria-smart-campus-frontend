import React from 'react';

export default function TopicAbsenteeism() {
  const topics = [
    { name: 'Computer Repair & Maintenance', absenteeismRate: 12, status: 'Normal' },
    { name: 'Computer Network Setup', absenteeismRate: 28, status: 'High Absenteeism' },
    { name: 'AI Innovation Principles', absenteeismRate: 8, status: 'Excellent' },
    { name: 'Database Architecture', absenteeismRate: 19, status: 'Moderate' },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Topic Absenteeism Heatmap</h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-semibold">Stage 7/9</span>
      </div>

      <div className="space-y-3">
        {topics.map((topic, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-gray-700">
              <span>{topic.name}</span>
              <span className={topic.absenteeismRate > 25 ? 'text-rose-600 font-bold' : 'text-gray-600'}>
                {topic.absenteeismRate}% absent
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  topic.absenteeismRate > 25 ? 'bg-rose-500' :
                  topic.absenteeismRate > 15 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${topic.absenteeismRate * 2.5}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}