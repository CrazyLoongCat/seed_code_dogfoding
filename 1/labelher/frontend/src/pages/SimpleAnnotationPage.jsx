import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { datasetAPI, annotationAPI } from '../lib/api';
import AnnotationCanvas from '../components/AnnotationCanvas';

export default function SimpleAnnotationPage() {
  const { imageId } = useParams();
  const navigate = useNavigate();

  const [image, setImage] = useState(null);
  const [classes, setClasses] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('AnnotationPage fetching data...');
        
        const imageRes = await datasetAPI.getImage(imageId);
        const annRes = await annotationAPI.listAnnotations(imageId);
        
        console.log('Image data:', imageRes.data.image);
        console.log('Annotations:', annRes.data.annotations);
        
        setImage(imageRes.data.image);
        setAnnotations(annRes.data.annotations || []);

        if (imageRes.data.image?.project_id) {
          const classesRes = await annotationAPI.listClasses(imageRes.data.image.project_id);
          console.log('Classes:', classesRes.data.classes);
          setClasses(classesRes.data.classes || []);
        }
        
        setLoading(false);
        console.log('Loading set to false');
      } catch (error) {
        console.error('Failed to fetch image data:', error);
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

  const handleAnnotationAdd = async (annotation) => {
    try {
      const res = await annotationAPI.create(imageId, {
        class_id: annotation.class_id,
        annotation_type: annotation.annotation_type,
        data: annotation.data
      });
      if (res.data?.annotation) {
        setAnnotations(prev => [...prev, res.data.annotation]);
      }
    } catch (error) {
      console.error('Failed to save annotation:', error);
    }
  };

  const handleAnnotationDelete = async (annotation) => {
    if (!annotation.id || annotation.id.startsWith('temp')) return;
    try {
      await annotationAPI.delete(annotation.id);
      setAnnotations(prev => prev.filter(a => a.id !== annotation.id));
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  return (
    <div className="h-screen flex bg-gray-900">
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>
        
        <h3 className="text-gray-400 text-sm font-medium mb-3">标注类别</h3>
        {classes.length === 0 ? (
          <p className="text-gray-500 text-sm">请先在项目中添加标注类别</p>
        ) : (
          <div className="space-y-2">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700"
              >
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: cls.color }}
                />
                <span className="text-white text-sm">{cls.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1">
        <AnnotationCanvas
          imageUrl={imageUrl}
          classes={classes}
          annotations={annotations}
          onAnnotationAdd={handleAnnotationAdd}
          onAnnotationDelete={handleAnnotationDelete}
        />
      </div>
    </div>
  );
}
