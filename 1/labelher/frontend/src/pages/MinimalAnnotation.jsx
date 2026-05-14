import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  MousePointer2,
  Square,
  Download,
  Bot,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { datasetAPI, annotationAPI } from '../lib/api';
import Button from '../components/Button';
import AnnotationCanvas from '../components/AnnotationCanvas';
import Badge from '../components/Badge';

export default function MinimalAnnotation() {
  const params = useParams();
  const imageId = params.imageId;
  const navigate = useNavigate();

  const [image, setImage] = useState(null);
  const [classes, setClasses] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [datasetImages, setDatasetImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [tool, setTool] = useState('select');
  const [selectedClassId, setSelectedClassId] = useState(null);

  useEffect(() => {
    if (!imageId) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const imageRes = await datasetAPI.getImage(imageId);
        const annRes = await annotationAPI.listAnnotations(imageId);
        
        setImage(imageRes.data.image);
        setAnnotations(annRes.data.annotations || []);

        if (imageRes.data.image?.project_id) {
          const classesRes = await annotationAPI.listClasses(imageRes.data.image.project_id);
          setClasses(classesRes.data.classes || []);

          const datasetRes = await datasetAPI.listImages(imageRes.data.image.dataset_id);
          setDatasetImages(datasetRes.data.images || []);
          const idx = datasetRes.data.images?.findIndex(img => img.id === imageId) || 0;
          setCurrentIndex(idx);
        }
      } catch (error) {
        console.error('Failed to fetch image data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [imageId]);

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

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevImage = datasetImages[currentIndex - 1];
      if (prevImage) {
        navigate(`/annotation/${prevImage.id}`);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < datasetImages.length - 1) {
      const nextImage = datasetImages[currentIndex + 1];
      if (nextImage) {
        navigate(`/annotation/${nextImage.id}`);
      }
    }
  };

  const tools = [
    { id: 'select', icon: MousePointer2, label: '选择 (V)' },
    { id: 'bbox', icon: Square, label: '矩形框 (B)' }
  ];

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

  return (
    <div className="h-screen flex bg-gray-900">
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </button>
        </div>

        <div className="p-4 border-b border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium mb-3">工具</h3>
          <div className="space-y-2">
            {tools.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    tool === t.id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <h3 className="text-gray-400 text-sm font-medium mb-3">标注类别</h3>
          
          {classes.length === 0 ? (
            <p className="text-gray-500 text-sm">
              请先在项目中添加标注类别
            </p>
          ) : (
            <div className="space-y-2">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    selectedClassId === cls.id
                      ? 'bg-gray-700 ring-2 ring-primary-500'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: cls.color }}
                  />
                  <span className="text-white text-sm flex-1 text-left">{cls.name}</span>
                  {selectedClassId === cls.id && (
                    <span className="text-primary-400 text-xs">选中</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handlePrev} disabled={currentIndex === 0} className="flex-1">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="flex items-center text-gray-400 text-sm px-2">
              {currentIndex + 1} / {datasetImages.length}
            </span>
            <Button variant="secondary" size="sm" onClick={handleNext} disabled={currentIndex === datasetImages.length - 1} className="flex-1">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <span className="text-white font-medium">{image.original_name}</span>
            <Badge variant={
              image.status === 'annotated' ? 'primary' :
              image.status === 'reviewed' ? 'success' : 'default'
            }>
              {image.status === 'unannotated' ? '待标注' :
               image.status === 'annotated' ? '已标注' : '已审核'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <Bot className="w-4 h-4" />
              AI 辅助
            </Button>
            <Button variant="secondary" size="sm">
              <Download className="w-4 h-4" />
              导出
            </Button>
            <Button size="sm" onClick={() => window.location.reload()}>
              <Save className="w-4 h-4" />
              保存
            </Button>
          </div>
        </div>

        <div className="flex-1 relative">
          <AnnotationCanvas
            imageUrl={imageUrl}
            classes={classes}
            annotations={annotations}
            tool={tool}
            selectedClassId={selectedClassId}
            onAnnotationAdd={handleAnnotationAdd}
            onAnnotationDelete={handleAnnotationDelete}
          />
        </div>
      </div>

      <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="flex border-b border-gray-700">
          <button className="flex-1 px-4 py-3 text-sm font-medium text-white bg-gray-700">
            标注列表 ({annotations.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            {annotations.length === 0 ? (
              <div className="text-center py-8">
                <Square className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">暂无标注</p>
                <p className="text-gray-600 text-xs mt-1">
                  选择工具和类别后在图片上绘制
                </p>
              </div>
            ) : (
              annotations.map((ann, idx) => {
                const cls = classes.find(c => c.id === ann.class_id);
                return (
                  <div
                    key={ann.id || idx}
                    className="p-3 rounded-lg bg-gray-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: cls?.color || '#666' }}
                        />
                        <span className="text-white text-sm">{cls?.name || 'Unknown'}</span>
                      </div>
                      <span className="text-gray-400 text-xs">#{idx + 1}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">矩形框</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
