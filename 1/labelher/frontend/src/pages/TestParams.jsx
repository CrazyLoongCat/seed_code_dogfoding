import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function TestParams() {
  const { imageId } = useParams();
  const [params, setParams] = useState(null);
  
  useEffect(() => {
    console.log('useParams result:', useParams());
    console.log('imageId:', imageId);
    setParams({ imageId });
  }, [imageId]);

  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-center">
      <h1 className="text-white text-3xl mb-4">参数测试页面</h1>
      {params ? (
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
