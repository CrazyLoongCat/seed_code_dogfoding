import React, { useState, useEffect } from 'react';

export default function TestAuth() {
  const [authData, setAuthData] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('labelher-auth');
    setAuthData(token);
    
    const testApi = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': token ? `Bearer ${JSON.parse(token).token}` : ''
          }
        });
        setApiResponse(`Status: ${response.status}, Authenticated: ${response.ok}`);
      } catch (err) {
        setError(err.message);
      }
    };
    
    testApi();
  }, []);

  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-white text-3xl mb-8">认证测试</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
        <h3 className="text-gray-400 mb-4">localStorage 中的认证数据:</h3>
        <pre className="text-green-400 text-sm overflow-x-auto">
          {authData || '没有找到认证数据'}
        </pre>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md mt-4">
        <h3 className="text-gray-400 mb-4">API 响应:</h3>
        <p className={apiResponse?.includes('200') ? 'text-green-400' : 'text-red-400'}>
          {apiResponse || '加载中...'}
        </p>
      </div>

      {error && (
        <div className="bg-red-900/50 p-4 rounded-lg w-full max-w-md mt-4">
          <p className="text-red-400">错误: {error}</p>
        </div>
      )}

      <button
        onClick={() => {
          localStorage.removeItem('labelher-auth');
          window.location.href = '/login';
        }}
        className="mt-8 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        清除认证并返回登录
      </button>
    </div>
  );
}
