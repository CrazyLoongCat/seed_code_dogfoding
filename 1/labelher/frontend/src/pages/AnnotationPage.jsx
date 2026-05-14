import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  MousePointer2,
  Square,
  Trash2,
  Download,
  Bot,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  Sparkles,
  Target,
  Grid3X3,
  Type
} from 'lucide-react';
import { datasetAPI, annotationAPI, aiAPI, collaborationAPI } from '../lib/api';
import useAuthStore from '../store/authStore';
import useAnnotationStore from '../store/annotationStore';
import Button from '../components/Button';
import AnnotationCanvas from '../components/AnnotationCanvas';
import Badge from '../components/Badge';
import { formatDate } from '../lib/utils';

export default function AnnotationPage() {
  const { imageId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [image, setImage] = useState(null);
  const [classes, setClasses] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [datasetImages, setDatasetImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const {
    tool,
    selectedClassId,
    annotations: storeAnnotations,
    selectedAnnotationId,
    setTool,
    setSelectedClass,
    selectAnnotation,
    clearAnnotations,
    addAnnotation
  } = useAnnotationStore();

  useEffect(() => {
    if (imageId) {
      fetchImageData();
    }
    return () => {
      clearAnnotations();
    };
  }, [imageId]);

  const fetchImageData = async () => {
    try {
      setLoading(true);
      const [imageRes, annRes, commentRes] = await Promise.all([
        datasetAPI.getImage(imageId),
        annotationAPI.listAnnotations(imageId),
        collaborationAPI.listComments(imageId)
      ]);

      setImage(imageRes.data.image);
      setAnnotations(annRes.data.annotations || []);
      setComments(commentRes.data.comments || []);

      if (imageRes.data.image.project_id) {
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

  const handleImageLoad = (e) => {
    setImageDimensions({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight
    });
  };

  const handleAnnotationAdd = useCallback(async (annotation) => {
    try {
      const res = await annotationAPI.create(imageId, {
        class_id: annotation.class_id,
        annotation_type: annotation.annotation_type,
        data: annotation.data
      });
      if (res.data?.annotation) {
        addAnnotation({ ...res.data.annotation, id: res.data.annotation.id });
      }
    } catch (error) {
      console.error('Failed to save annotation:', error);
    }
  }, [imageId, addAnnotation]);

  const handleAnnotationDelete = useCallback(async (annotation) => {
    if (!annotation.id || annotation.isNew) return;
    try {
      await annotationAPI.delete(annotation.id);
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchImageData();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await annotationAPI.export(imageId);
      const dataStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image?.original_name || 'annotation'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await collaborationAPI.createComment(imageId, { content: newComment });
      setNewComment('');
      fetchImageData();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleAIDetect = async () => {
    if (!image) return;
    setAiLoading(true);
    try {
      const imageUrl = `/api/uploads/${image.dataset_id}/${image.filename}`;
      const res = await aiAPI.detect({ image_url: imageUrl });
      
      if (res.data?.detections && classes.length > 0) {
        for (const det of res.data.detections) {
          const matchedClass = classes.find(c => 
            c.name.toLowerCase() === det.label.toLowerCase()
          ) || classes[0];

          const annotation = {
            class_id: matchedClass.id,
            annotation_type: 'bbox',
            data: {
              x1: det.bbox.x,
              y1: det.bbox.y,
              x2: det.bbox.x + det.bbox.width,
              y2: det.bbox.y + det.bbox.height
            }
          };

          const annRes = await annotationAPI.create(imageId, annotation);
          if (annRes.data?.annotation) {
            addAnnotation(annRes.data.annotation);
          }
        }
        fetchImageData();
      }
    } catch (error) {
      console.error('AI detection failed:', error);
    } finally {
      setAiLoading(false);
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

  const aiTools = [
    { id: 'detect', icon: Target, label: '目标检测', action: handleAIDetect },
    { id: 'segment', icon: Grid3X3, label: '实例分割', action: () => {} },
    { id: 'keypoints', icon: MousePointer2, label: '关键点检测', action: () => {} },
    { id: 'ocr', icon: Type, label: '文字识别', action: () => {} }
  ];

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
  const allAnnotations = [...annotations, ...storeAnnotations.filter(a => !a.id?.startsWith('temp') || a.isNew)];

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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 text-sm font-medium">标注类别</h3>
          </div>
          
          {classes.length === 0 ? (
            <p className="text-gray-500 text-sm">
              请先在项目中添加标注类别
            </p>
          ) : (
            <div className="space-y-2">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls.id)}
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
            <Button variant="secondary" size="sm" onClick={() => setShowAIPanel(!showAIPanel)}>
              <Bot className="w-4 h-4" />
              AI 辅助
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4" />
              导出
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>

        <div className="flex-1 relative">
          <img
            src={imageUrl}
            alt={image.original_name}
            onLoad={handleImageLoad}
            className="hidden"
          />
          <AnnotationCanvas
            imageUrl={imageUrl}
            imageWidth={imageDimensions.width}
            imageHeight={imageDimensions.height}
            classes={classes}
            annotations={allAnnotations}
            onAnnotationAdd={handleAnnotationAdd}
            onAnnotationDelete={handleAnnotationDelete}
          />

          {showAIPanel && (
            <div className="absolute top-4 right-4 bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-64">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  AI 辅助工具
                </h3>
                <button
                  onClick={() => setShowAIPanel(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="p-4 space-y-2">
                {aiTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={tool.action}
                      disabled={aiLoading}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm">{aiLoading ? '处理中...' : tool.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="flex border-b border-gray-700">
          <button className="flex-1 px-4 py-3 text-sm font-medium text-white bg-gray-700">
            标注列表 ({allAnnotations.length})
          </button>
          <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white">
            <MessageSquare className="w-4 h-4 inline mr-1" />
            评论 ({comments.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            {allAnnotations.length === 0 ? (
              <div className="text-center py-8">
                <Square className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">暂无标注</p>
                <p className="text-gray-600 text-xs mt-1">
                  选择工具和类别后在图片上绘制
                </p>
              </div>
            ) : (
              allAnnotations.map((ann, idx) => {
                const cls = classes.find(c => c.id === ann.class_id);
                return (
                  <div
                    key={ann.id || idx}
                    onClick={() => selectAnnotation(ann.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedAnnotationId === ann.id
                        ? 'bg-primary-600/20 border border-primary-500'
                        : 'bg-gray-700/50 hover:bg-gray-700'
                    }`}
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
                    <p className="text-gray-500 text-xs mt-1">
                      {ann.annotation_type === 'bbox' ? '矩形框' : ann.annotation_type}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="border-t border-gray-700 p-4">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="添加评论..."
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <Button size="sm" onClick={handleAddComment}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {comments.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{comment.username}</span>
                    <span className="text-gray-500 text-xs">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-gray-300 mt-1">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
