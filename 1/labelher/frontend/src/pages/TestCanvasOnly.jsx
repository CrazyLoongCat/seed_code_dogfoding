import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { datasetAPI } from '../lib/api';
import SimpleCanvas from '../components/SimpleCanvas';

export default function TestCanvasOnly() {
  const params = useParams();
  const imageId = params.imageId;
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!imageId) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        const imageRes = await datasetAPI.getImage(imageId);
        setImage(imageRes.data.image);
      } catch (error) {
        console.error('Error:', error);
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
      <div className="flex-1">
        <SimpleCanvas imageUrl={imageUrl} />
      </div>
    </div>
  );
}
