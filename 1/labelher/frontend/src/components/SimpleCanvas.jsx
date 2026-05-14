import React, { useRef, useState, useEffect } from 'react';

export default function SimpleCanvas({ imageUrl }) {
  const containerRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgWidth, setImgWidth] = useState(800);
  const [imgHeight, setImgHeight] = useState(600);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImgWidth(img.naturalWidth || 800);
      setImgHeight(img.naturalHeight || 600);
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load image');
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-gray-900 overflow-hidden"
    >
      {imageUrl && imageLoaded && (
        <img
          src={imageUrl}
          alt="Annotation"
          className="max-w-full max-h-full object-contain absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        />
      )}

      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <p className="text-white">加载图片中...</p>
        </div>
      )}
    </div>
  );
}
