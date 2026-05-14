import React, { useRef, useState, useEffect, useCallback } from 'react';
import useAnnotationStore from '../store/annotationStore';

export default function AnnotationCanvas({ 
  imageUrl, 
  imageWidth, 
  imageHeight,
  classes,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  annotations: externalAnnotations
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [drawStart, setDrawStart] = useState(null);
  const [tempBbox, setTempBbox] = useState(null);

  const {
    tool,
    selectedClassId,
    annotations,
    selectedAnnotationId,
    isDrawing,
    currentShape,
    zoom,
    setTool,
    setSelectedClass,
    setAnnotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectAnnotation,
    setDrawingState,
    setZoom,
    setPan
  } = useAnnotationStore();

  useEffect(() => {
    if (externalAnnotations) {
      setAnnotations(externalAnnotations);
    }
  }, [externalAnnotations]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (imageLoaded && imageWidth && imageHeight && canvasSize.width && canvasSize.height) {
      const scaleX = (canvasSize.width - 100) / imageWidth;
      const scaleY = (canvasSize.height - 100) / imageHeight;
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(newScale);
      setOffset({
        x: (canvasSize.width - imageWidth * newScale) / 2,
        y: (canvasSize.height - imageHeight * newScale) / 2
      });
    }
  }, [imageLoaded, imageWidth, imageHeight, canvasSize]);

  const screenToImage = useCallback((screenX, screenY) => {
    return {
      x: (screenX - offset.x) / scale,
      y: (screenY - offset.y) / scale
    };
  }, [offset, scale]);

  const imageToScreen = useCallback((imageX, imageY) => {
    return {
      x: imageX * scale + offset.x,
      y: imageY * scale + offset.y
    };
  }, [offset, scale]);

  const getBboxAtPoint = useCallback((x, y) => {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i];
      if (ann.annotation_type === 'bbox' && ann.data) {
        const { x1, y1, x2, y2 } = ann.data;
        const screenX1 = x1 * scale + offset.x;
        const screenY1 = y1 * scale + offset.y;
        const screenX2 = x2 * scale + offset.x;
        const screenY2 = y2 * scale + offset.y;
        const minX = Math.min(screenX1, screenX2);
        const maxX = Math.max(screenX1, screenX2);
        const minY = Math.min(screenY1, screenY2);
        const maxY = Math.max(screenY1, screenY2);
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          return ann;
        }
      }
    }
    return null;
  }, [annotations, scale, offset]);

  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    if (e.button !== 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'select') {
      const bbox = getBboxAtPoint(x, y);
      if (bbox) {
        selectAnnotation(bbox.id);
      } else {
        selectAnnotation(null);
      }
    } else if (tool === 'bbox' && selectedClassId) {
      const imageCoords = screenToImage(x, y);
      setDrawStart(imageCoords);
      setDrawingState(true, { x: imageCoords.x, y: imageCoords.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!drawStart) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imageCoords = screenToImage(x, y);

    setTempBbox({
      x1: Math.min(drawStart.x, imageCoords.x),
      y1: Math.min(drawStart.y, imageCoords.y),
      x2: Math.max(drawStart.x, imageCoords.x),
      y2: Math.max(drawStart.y, imageCoords.y)
    });
  };

  const handleMouseUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (drawStart && tempBbox && tempBbox.x2 - tempBbox.x1 > 5 && tempBbox.y2 - tempBbox.y1 > 5) {
      const newAnnotation = {
        id: `temp-${Date.now()}`,
        class_id: selectedClassId,
        annotation_type: 'bbox',
        data: tempBbox,
        isNew: true
      };
      addAnnotation(newAnnotation);
      if (onAnnotationAdd) onAnnotationAdd(newAnnotation);
    }

    setDrawStart(null);
    setTempBbox(null);
    setDrawingState(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, scale * delta));
    setScale(newScale);
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedAnnotationId) {
        const ann = annotations.find(a => a.id === selectedAnnotationId);
        if (ann) {
          deleteAnnotation(selectedAnnotationId);
          if (onAnnotationDelete) onAnnotationDelete(ann);
        }
      }
    }
    if (e.key === 'Escape') {
      selectAnnotation(null);
      setTool('select');
      setDrawStart(null);
      setTempBbox(null);
    }
  }, [selectedAnnotationId, annotations, deleteAnnotation, selectAnnotation, setTool, onAnnotationDelete]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getClassColor = (classId) => {
    const cls = classes?.find(c => c.id === classId);
    return cls?.color || '#3b82f6';
  };

  const getClassName = (classId) => {
    const cls = classes?.find(c => c.id === classId);
    return cls?.name || 'Unknown';
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-gray-900 overflow-hidden"
      style={{ cursor: tool === 'bbox' ? 'crosshair' : isPanning ? 'grabbing' : 'default' }}
    >
      <svg
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsPanning(false); setDrawStart(null); setTempBbox(null); }}
        onWheel={handleWheel}
        className="absolute inset-0"
      >
        {imageUrl && (
          <image
            href={imageUrl}
            x={offset.x}
            y={offset.y}
            width={imageWidth * scale}
            height={imageHeight * scale}
            onLoad={() => setImageLoaded(true)}
            preserveAspectRatio="none"
          />
        )}

        {annotations.map((ann) => {
          if (ann.annotation_type !== 'bbox' || !ann.data) return null;
          
          const { x1, y1, x2, y2 } = ann.data;
          const screenX1 = x1 * scale + offset.x;
          const screenY1 = y1 * scale + offset.y;
          const screenX2 = x2 * scale + offset.x;
          const screenY2 = y2 * scale + offset.y;
          const isSelected = selectedAnnotationId === ann.id;
          const color = getClassColor(ann.class_id);

          return (
            <g key={ann.id}>
              <rect
                x={screenX1}
                y={screenY1}
                width={screenX2 - screenX1}
                height={screenY2 - screenY1}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? 3 : 2}
                className="cursor-pointer"
              />
              <rect
                x={screenX1}
                y={screenY1 - 24}
                width={(getClassName(ann.class_id).length + 2) * 8}
                height={20}
                fill={color}
                rx={4}
              />
              <text
                x={screenX1 + 8}
                y={screenY1 - 8}
                fill="white"
                fontSize={12}
                fontWeight={500}
              >
                {getClassName(ann.class_id)}
              </text>
              {isSelected && (
                <>
                  <circle cx={screenX1} cy={screenY1} r={5} fill="white" stroke={color} strokeWidth={2} />
                  <circle cx={screenX2} cy={screenY1} r={5} fill="white" stroke={color} strokeWidth={2} />
                  <circle cx={screenX1} cy={screenY2} r={5} fill="white" stroke={color} strokeWidth={2} />
                  <circle cx={screenX2} cy={screenY2} r={5} fill="white" stroke={color} strokeWidth={2} />
                </>
              )}
            </g>
          );
        })}

        {tempBbox && (
          <g>
            <rect
              x={tempBbox.x1 * scale + offset.x}
              y={tempBbox.y1 * scale + offset.y}
              width={(tempBbox.x2 - tempBbox.x1) * scale}
              height={(tempBbox.y2 - tempBbox.y1) * scale}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          </g>
        )}
      </svg>

      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded text-sm">
        缩放: {Math.round(scale * 100)}% | Alt+拖动平移 | 滚轮缩放 | Delete删除
      </div>
    </div>
  );
}
