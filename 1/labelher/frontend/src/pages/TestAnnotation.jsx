import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function TestAnnotation() {
  const { imageId } = useParams();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const [step, setStep] = useState('init');

  useEffect(() => {
    console.log('useEffect triggered, imageId:', imageId);
    setStep('useEffect-start');
    
    const fetchData = async () => {
      try {
        setStep('fetch-start');
        console.log('Fetching image data...');
        
        const token = localStorage.getItem('labelher-auth');
        const parsedToken = token ? JSON.parse(token).token : null;
        
        setStep('fetching');
        const response = await fetch(`/api/images/${imageId}`, {
          headers: {
            'Authorization': parsedToken ? `Bearer ${parsedToken}` : '',
            'Content-Type': 'application/json'
          }
        });
        
        setStep('response-received');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        setStep('parsing');
        const data = await response.json();
        console.log('Image data:', data);
        setResponseData(JSON.stringify(data, null, 2));
        
        if (data.image) {
          setImage(data.image);
        } else if (data.data) {
          setImage(data.data);
        } else {
          setImage(data);
        }
        
        setStep('completed');
        setLoading(false);
      } catch (err) {
        setStep('error');
        console.error('Error:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    if (imageId) {
      fetchData();
    } else {
      setStep('no-imageid');
      setError('imageId is undefined');
      setLoading(false);
    }
  }, [imageId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-white">加载中...</p>
          <p className="text-gray-500 mt-2">步骤: {step}</p>
          <p className="text-gray-500">imageId: {imageId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 p-8">
        <div className="max-w-2xl">
          <p className="text-red-500 text-xl mb-4">错误: {error}</p>
          <p className="text-gray-400 mb-2">步骤: {step}</p>
          {responseData && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 mb-2">API 响应:</p>
              <pre className="text-green-400 text-sm overflow-x-auto">{responseData}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 p-8">
        <div className="max-w-2xl">
          <p className="text-white text-xl mb-4">图片不存在</p>
          {responseData && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 mb-2">API 响应:</p>
              <pre className="text-green-400 text-sm overflow-x-auto">{responseData}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  const imageUrl = `/api/uploads/${image.dataset_id}/${image.filename}`;

  return (
    <div className="h-screen flex bg-gray-900 p-8">
      <div className="flex-1 flex items-center justify-center">
        <img
          src={imageUrl}
          alt={image.original_name}
          className="max-w-full max-h-full object-contain"
        />
      </div>
      <div className="w-96 bg-gray-800 p-4 rounded-lg overflow-y-auto">
        <h3 className="text-white mb-4">API 响应数据:</h3>
        <pre className="text-green-400 text-sm">{responseData}</pre>
      </div>
    </div>
  );
}
