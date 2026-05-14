import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function TestFetch() {
  const params = useParams();
  const imageId = params.imageId || 'c8fdf8c0-b825-405b-8ea3-d0edb2449147';
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('labelher-auth');
    
    const fetchData = async () => {
      try {
        setStatus('正在获取图片数据...');
        const response = await fetch(`/api/images/${imageId}`, {
          headers: {
            'Authorization': token ? `Bearer ${JSON.parse(token).token}` : ''
          }
        });
        
        setStatus(`响应状态: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
        setStatus('获取成功');
      } catch (err) {
        setError(err.message);
        setStatus('获取失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [imageId]);

  return (
    <div className="h-screen bg-gray-900 p-8">
      <h1 className="text-white text-2xl mb-6">Fetch 测试页面</h1>
      
      <div className="bg-gray-800 p-4 rounded-lg mb-4">
        <p className="text-gray-400">Image ID: {imageId}</p>
        <p className="text-yellow-400">状态: {status}</p>
      </div>

      {loading ? (
        <p className="text-white">加载中...</p>
      ) : error ? (
        <div className="bg-red-900/50 p-4 rounded-lg">
          <p className="text-red-400">错误: {error}</p>
        </div>
      ) : data ? (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-white mb-2">获取到的数据:</h3>
          <pre className="text-green-400 text-sm overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
          
          {data.image && (
            <div className="mt-4">
              <img
                src={`/api/uploads/${data.image.dataset_id}/${data.image.filename}`}
                alt={data.image.original_name}
                className="max-w-full max-h-96 object-contain"
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-500">没有数据</p>
      )}
    </div>
  );
}
