import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function TestEffectOutside() {
  const { id } = useParams();
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    console.log('useEffect triggered, id:', id);
    setLoaded(true);
    setCount(prev => prev + 1);
  }, [id]);

  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-center">
      <h1 className="text-white text-3xl mb-4">Effect 测试 (外部路由)</h1>
      <div className="bg-gray-800 p-6 rounded-lg">
        <p className="text-gray-400 mb-2">ID: {id}</p>
        <p className="text-gray-400 mb-2">Count: {count}</p>
        <p className="text-gray-400">Loaded: {loaded ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}
