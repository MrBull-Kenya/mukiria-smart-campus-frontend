import React, { useState, useEffect } from 'react';

export default function ClassChat({ classCode = "ITECH6/S/24/J/M/25", currentStudent = "Purity Kainyu" }) {
  const [messages, setMessages] = useState([
    { sender: 'Dennis Mwenda', text: 'Are we meeting at LAB1A for networking setup?', time: '10:15 AM' },
    { sender: 'Collins Kiprono', text: 'Yes, bring your laptop and patch cables.', time: '10:16 AM' }
  ]);
  const [inputText, setInputText] = useState('');

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      sender: currentStudent,
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMsg]);
    setInputText('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md mx-auto flex flex-col h-[420px] overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold">Class Channel</h3>
          <p className="text-[10px] text-gray-400 font-mono">{classCode}</p>
        </div>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">● Live Socket</span>
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
        {messages.map((msg, index) => {
          const isMe = msg.sender === currentStudent;
          return (
            <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-gray-500 mb-0.5 px-1">{msg.sender} • {msg.time}</span>
              <div className={`p-3 rounded-2xl text-xs max-w-[80%] ${
                isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Box */}
      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message to class..." 
          className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 transition">
          Send
        </button>
      </form>
    </div>
  );
}