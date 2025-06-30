import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function WelcomeMessage() {
  const [selectedImage, setSelectedImage] = useState<string>('');

  useEffect(() => {
    // Shuffle logic to pick a random Locky image
    const imageNumber = Math.floor(Math.random() * 5) + 1;
    setSelectedImage(`/img/locky${imageNumber}.png`);
  }, []);

  return (
    <div className="flex-grow flex items-center justify-center">
      <div className="max-w-md text-center p-6">
        {selectedImage && (
          <div className="mb-6 flex justify-center">
            <Image 
              src='/img/locky1.png'
              alt="Locky" 
              width={200} 
              height={200}
              className="rounded-full"
            />
          </div>
        )}
        <h2 className="text-2xl font-bold tracking-tight mb-3 text-slate-900">Hi I'm Locky!</h2>
        <p className="text-slate-700 mb-6 text-sm leading-relaxed">
          Ask me anything about focus strategies, habit formation, managing distractions, and building better self-control.
        </p>
        <p className="text-slate-400 text-xs">developed by <a href="https://loomlock.com" className="text-blue-500 hover:text-blue-600">loomlock.com</a></p>
      </div>
    </div>
  );
} 