import React from 'react';

export default function SimpleImageTest() {
  const imageUrl = '/api/uploads/de24c306-8cf9-49a7-a74b-20b09dc9ecb5/9d82fd4e-9412-4739-bc5a-a6f0f1a70d50.jpg';
  
  return (
    <div className="h-screen bg-gray-900 p-8">
      <h1 className="text-white text-2xl mb-4">简单图片测试</h1>
      <div className="border-2 border-red-500 p-4">
        <img
          src={imageUrl}
          alt="Test Image"
          className="max-w-full h-auto"
        />
      </div>
    </div>
  );
}
