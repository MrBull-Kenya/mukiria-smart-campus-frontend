import { QRCodeSVG } from 'qrcode.react';

export default function SmallQRCard({ token, class_code, venue, subject, timeLeft }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-lg text-gray-900 flex flex-col items-center max-w-xs transition-all hover:shadow-xl">
      {/* Header Info */}
      <div className="w-full flex justify-between items-center mb-3">
        <div>
          <h4 className="text-sm font-bold text-green-600 uppercase tracking-wide">{class_code || 'ITECH6'}</h4>
          <p className="text-xs text-gray-500 font-medium">{subject || 'Active Session'}</p>
        </div>
        {timeLeft !== undefined && (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
            {timeLeft}s
          </span>
        )}
      </div>

      {/* QR Display Area */}
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 my-2 shadow-inner">
        {token ? (
          <QRCodeSVG value={token} size={140} level="M" />
        ) : (
          <div className="w-[140px] h-[140px] flex items-center justify-center text-xs text-gray-400 font-medium">
            Generating...
          </div>
        )}
      </div>

      {/* Footer Info & Security Tag */}
      <div className="w-full mt-3 text-center">
        <p className="text-xs font-medium text-gray-700">
          Venue: <span className="text-gray-900 font-bold">{venue || 'Lab 1'}</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
          Secure Token • Rotates 30s
        </p>
      </div>
    </div>
  );
}