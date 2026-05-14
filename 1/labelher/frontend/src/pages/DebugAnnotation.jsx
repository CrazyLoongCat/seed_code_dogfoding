import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { datasetAPI, annotationAPI } from '../lib/api';

export default function DebugAnnotation() {
  const params = useParams();
  const imageId = params.imageId;
  const navigate = useNavigate();

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!imageId) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        console.log('Fetching image with id:', imageId);
        const imageRes = await datasetAPI.getImage(imageId);
        console.log('Image response:', imageRes);
        setImage(imageRes.data.image);
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [imageId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <p className="text-white">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400">错误: {error}</p>
          <pre className="text-gray-500 text-sm mt-4">{JSON.stringify(error, null, 2)}</pre>
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
    <div className="h-screen flex bg-gray-900">
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>
        <h3 className="text-gray-400 text-sm font-medium mt-4">标注工具</h3>
        <p className="text-gray-500 text-sm mt-2">选择矩形框工具后在图片上绘制</p>
        
        <div className="mt-4 p-3 bg-gray-700 rounded">
          <p className="text-xs text-gray-400">调试信息:</p>
          <pre className="text-xs text-green-400 mt-2">{JSON.stringify(image, null, 2)}</pre>
          <p className="text-xs text-yellow-400 mt-2">Image URL: {imageUrl}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-blue-900/30 border-4 border-yellow-500">
        <div className="border-4 border-green-500 p-4">
          <img
            src={imageUrl}
            alt={image.original_name || 'Image'}
            className="max-w-full max-h-full object-contain border-4 border-red-500"
            onError={(e) => {
              console.error('Image load error:', e);
              e.target.style.border = '4px solid red';
            }}
          />
        </div>
      </div>

      <div className="w-72 bg-gray-800 border-l border-gray-700 p-4">
        <h3 className="text-white">标注列表</h3>
        <p className="text-gray-500 text-sm mt-2">暂无标注</p>
      </div>
    </div>
  );
}
