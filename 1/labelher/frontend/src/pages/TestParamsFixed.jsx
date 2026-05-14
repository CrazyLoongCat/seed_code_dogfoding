import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function TestParamsFixed() {
  const params = useParams();
  const [imageId, setImageId] = useState(null);
  
  useEffect(() => {
    console.log('useParams result:', params);
    console.log('imageId:', params.imageId);
    setImageId(params.imageId);
  }, [params]);

  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-center">
      <h1 className="text-white text-3xl mb-4">参数测试页面 (修复版)</h1>
      {imageId ? (
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-400 mb-2">路由参数:</p>
          <pre className="text-green-400 text-lg">{JSON.stringify(params, null, 2)}</pre>
        </div>
      ) : (
        <div className="text-white">获取参数中...</div>
      )}
    </div>
  );
}
