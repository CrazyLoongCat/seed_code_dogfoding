import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { datasetAPI } from '../lib/api';

export default function TestAxios() {
  const { imageId } = useParams();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responseData, setResponseData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching with axios...');
        const imageRes = await datasetAPI.getImage(imageId);
        console.log('Axios response:', imageRes);
        setResponseData(JSON.stringify(imageRes.data, null, 2));
        setImage(imageRes.data.image);
        setLoading(false);
      } catch (err) {
        console.error('Axios error:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    if (imageId) {
      fetchData();
    }
  }, [imageId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-white">加载中...</p>
          <p className="text-gray-500 mt-2">使用 axios</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 p-8">
        <div className="max-w-2xl">
          <p className="text-red-500 text-xl mb-4">错误: {error}</p>
          {responseData && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 mb-2">响应:</p>
              <pre className="text-green-400 text-sm overflow-x-auto">{responseData}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <p className="text-white">图片不存在</p>
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
        <h3 className="text-white mb-4">Axios 响应:</h3>
        <pre className="text-green-400 text-sm">{responseData}</pre>
      </div>
    </div>
  );
}
