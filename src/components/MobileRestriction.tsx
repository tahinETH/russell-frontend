import React from 'react';

export default function MobileRestriction() {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-6" style={{ backgroundImage: 'url(/img/mobile-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Blurry overlay */}
      <div className="absolute inset-0 backdrop-blur-md bg-black/30 z-0" />
      <div className="relative max-w-md mx-auto text-center z-10">
       
        
        <h1 className="text-3xl font-bold text-white mb-4">
          Russell doesn't like mobiles.
        </h1>

        <h1 className="text-lg text-white/80 mb-6 leading-relaxed">
        Try bigger screens.
        </h1>

       
       
      </div>
    </div>
  );
} 