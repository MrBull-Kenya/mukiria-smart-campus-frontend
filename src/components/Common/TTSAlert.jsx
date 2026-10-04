import React, { useState } from 'react';

export default function TTSAlert({ message = "Attendance successfully verified for Mukiria Smart Campus." }) {
  const [speaking, setSpeaking] = useState(false);

  const speakMessage = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported on your browser.');
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between max-w-md mx-auto shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
          🔊
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-800">Voice Announcement</h4>
          <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{message}</p>
        </div>
      </div>
      <button 
        onClick={speakMessage}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
          speaking ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}>
        {speaking ? 'Stop Audio' : 'Play Audio'}
      </button>
    </div>
  );
}