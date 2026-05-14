import React from 'react';

export default function SimpleTest() {
  console.log('SimpleTest component rendered');
  
  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-center">
      <h1 className="text-white text-3xl mb-4">测试页面</h1>
      <p className="text-gray-400 mb-8">这是一个简单的测试页面</p>
      <div className="w-64 h-64 bg-blue-500 rounded-lg flex items-center justify-center">
        <span className="text-white text-xl">测试内容</span>
      </div>
    </div>
  );
}
