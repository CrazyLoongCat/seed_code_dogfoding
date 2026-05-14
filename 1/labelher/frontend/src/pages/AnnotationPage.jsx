import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MousePointer2, Square, Trash2, Save } from 'lucide-react';
import { datasetAPI, annotationAPI } from '../lib/api';

export default function AnnotationPage() {
  const params = useParams();
  const imageId = params.imageId;
  const navigate = useNavigate();

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tool, setTool] = useState('select');
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);

  const containerRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!imageId) {
        setLoading(false);
        return;
      }
      
      try {
        const imageRes = await datasetAPI.getImage(imageId);
        setImage(imageRes.data.image);
        
        const annotationsRes = await annotationAPI.listAnnotations(imageId);
        setAnnotations(annotationsRes.data.annotations);
        
        const projectId = imageRes.data.image.project_id;
        const classesRes = await annotationAPI.listClasses(projectId);
        setClasses(classesRes.data.classes);
        if (classesRes.data.classes.length > 0) {
          setSelectedClassId(classesRes.data.classes[0].id);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [imageId]);

  useEffect(() => {
    if (image) {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        if (containerRef.current) {
          const container = containerRef.current;
          const scaleX = container.clientWidth / img.naturalWidth;
          const scaleY = container.clientHeight / img.naturalHeight;
          setScale(Math.min(scaleX, scaleY, 1));
        }
      };
      img.src = `/api/uploads/${image.dataset_id}/${image.filename}`;
    }
  }, [image]);

  const handleMouseDown = (e) => {
    if (tool !== 'rectangle' || !selectedClassId) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setCurrentRect({
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y)
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) return;
    
    if (currentRect.width > 5 && currentRect.height > 5) {
      const newAnnotation = {
        id: Date.now().toString(),
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.width,
        height: currentRect.height,
        class_id: selectedClassId,
        image_id: imageId
      };
      setAnnotations(prev => [...prev, newAnnotation]);
    }
    
    setIsDrawing(false);
    setCurrentRect(null);
  };

  const handleAnnotationClick = (annotation) => {
    if (tool === 'select') {
      setSelectedAnnotation(prev => prev === annotation.id ? null : annotation.id);
    }
  };

  const handleDeleteAnnotation = () => {
    if (!selectedAnnotation) return;
    setAnnotations(prev => prev.filter(a => a.id !== selectedAnnotation));
    setSelectedAnnotation(null);
  };

  const handleSaveAnnotations = async () => {
    try {
      for (const annotation of annotations) {
        if (!annotation.id.toString().startsWith('api-')) {
          await annotationAPI.create(imageId, {
            x: annotation.x,
            y: annotation.y,
            width: annotation.width,
            height: annotation.height,
            class_id: annotation.class_id
          });
        }
      }
      alert('标注已保存');
    } catch (error) {
      console.error('Save error:', error);
      alert('保存失败');
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };

  const getClassColor = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls?.color || '#FF0000';
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">图片不存在</div>
      </div>
    );
  }

  const imageUrl = `/api/uploads/${image.dataset_id}/${image.filename}`;

  return (
    <div className="h-screen flex bg-gray-900">
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>

        <h3 className="text-gray-400 text-sm font-medium mb-3">标注工具</h3>
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTool('select')}
            className={`flex-1 p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
              tool === 'select' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <MousePointer2 className="w-5 h-5" />
            <span className="text-xs">选择</span>
          </button>
          <button
            onClick={() => setTool('rectangle')}
            className={`flex-1 p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
              tool === 'rectangle' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Square className="w-5 h-5" />
            <span className="text-xs">矩形</span>
          </button>
        </div>

        <h3 className="text-gray-400 text-sm font-medium mb-3">标注类别</h3>
        <div className="flex flex-col gap-2 mb-6">
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                selectedClassId === cls.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cls.color }} />
              <span className="text-white text-sm">{cls.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto flex gap-2">
          <button
            onClick={handleDeleteAnnotation}
            disabled={!selectedAnnotation}
            className="flex-1 p-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
          <button
            onClick={handleSaveAnnotations}
            className="flex-1 p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 overflow-hidden" onWheel={handleWheel}>
        <div
          className="relative bg-gray-800"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            cursor: tool === 'rectangle' ? 'crosshair' : 'default'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={imageUrl}
            alt={image.original_name}
            className="block"
            style={{ width: imageSize.width, height: imageSize.height }}
          />
          
          {annotations.map(annotation => (
            <div
              key={annotation.id}
              className="absolute border-2 cursor-pointer"
              style={{
                left: annotation.x,
                top: annotation.y,
                width: annotation.width,
                height: annotation.height,
                borderColor: selectedAnnotation === annotation.id ? '#FACC15' : getClassColor(annotation.class_id),
                backgroundColor: `${getClassColor(annotation.class_id)}20`
              }}
              onClick={(e) => { e.stopPropagation(); handleAnnotationClick(annotation); }}
            >
              <div
                className="absolute -top-6 left-0 px-2 py-0.5 text-xs text-white rounded"
                style={{ backgroundColor: getClassColor(annotation.class_id) }}
              >
                {getClassName(annotation.class_id)}
              </div>
            </div>
          ))}

          {currentRect && (
            <div
              className="absolute border-2 border-dashed border-blue-400 bg-blue-400/20"
              style={{
                left: currentRect.x,
                top: currentRect.y,
                width: currentRect.width,
                height: currentRect.height
              }}
            />
          )}
        </div>
      </div>

      <div className="w-72 bg-gray-800 border-l border-gray-700 p-4">
        <h3 className="text-white font-medium mb-4">标注列表</h3>
        {annotations.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无标注</p>
        ) : (
          <div className="space-y-2">
            {annotations.map((annotation, index) => (
              <div
                key={annotation.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedAnnotation === annotation.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => handleAnnotationClick(annotation)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">标注 {index + 1}</span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getClassColor(annotation.class_id) }} />
                </div>
                <p className="text-gray-400 text-xs mt-1">{getClassName(annotation.class_id)}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {Math.round(annotation.x)}, {Math.round(annotation.y)} - {Math.round(annotation.width)}x{Math.round(annotation.height)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
