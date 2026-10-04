import React from 'react';
import logo from '../assets/mtti-logo.png'; // 360px copy of "MTTI logo.png" (the 1.4 MB original is kept in the same folder)

// The crest has a white background, so it sits on a white rounded tile and looks right on any page colour.
export default function Logo({ size = 96, className = '' }) {
  return (
    <div className={`inline-flex items-center justify-center bg-white rounded-3xl shadow-md border border-gray-100 p-2 ${className}`}>
      <img src={logo} alt="Mukiria Technical Training Institute logo" width={size} height={size} style={{ width: size, height: size }} className="object-contain" />
    </div>
  );
}
