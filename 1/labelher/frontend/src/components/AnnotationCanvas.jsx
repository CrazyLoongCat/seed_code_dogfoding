import React, { useRef, useState, useEffect, useCallback } from 'react';

export default function AnnotationCanvas({ 
  imageUrl, 
  classes,
  annotations: externalAnnotations,
  tool = 'select',
  selectedClassId = null,
  onAnnotationAdd,
  onAnnotationDelete
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
  const [localAnnotations, setLocalAnnotations] = useState([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
  const [imgWidth, setImgWidth] = useState(800);
  const [imgHeight, setImgHeight] = useState(600);

  useEffect(() => {
    if (externalAnnotations) {
      setLocalAnnotations(externalAnnotations);
    }
  }, [externalAnnotations]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
        updateScale();
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [imgWidth, imgHeight]);

  const updateScale = () => {
    if (!canvasSize.width || !canvasSize.height || !imgWidth || !imgHeight) return;
    
    const scaleX = (canvasSize.width - 50) / imgWidth;
    const scaleY = (canvasSize.height - 50) / imgHeight;
    const newScale = Math.min(scaleX, scaleY, 1);
    
    setScale(newScale);
    setOffset({
      x: (canvasSize.width - imgWidth * newScale) / 2,
      y: (canvasSize.height - imgHeight * newScale) / 2
    });
  };

  const screenToImage = useCallback((screenX, screenY) => {
    return {
      x: (screenX - offset.x) / scale,
      y: (screenY - offset.y) / scale
    };
  }, [offset, scale]);

  const getBboxAtPoint = useCallback((x, y) => {
    for (let i = localAnnotations.length - 1; i >= 0; i--) {
      const ann = localAnnotations[i];
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
  }, [localAnnotations, scale, offset]);

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
        setSelectedAnnotationId(bbox.id);
      } else {
        setSelectedAnnotationId(null);
      }
    } else if (tool === 'bbox' && selectedClassId) {
      const imageCoords = screenToImage(x, y);
      setDrawStart(imageCoords);
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
      setLocalAnnotations(prev => [...prev, newAnnotation]);
      if (onAnnotationAdd) onAnnotationAdd(newAnnotation);
    }

    setDrawStart(null);
    setTempBbox(null);
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
        const ann = localAnnotations.find(a => a.id === selectedAnnotationId);
        if (ann) {
          setLocalAnnotations(prev => prev.filter(a => a.id !== selectedAnnotationId));
          setSelectedAnnotationId(null);
          if (onAnnotationDelete) onAnnotationDelete(ann);
        }
      }
    }
    if (e.key === 'Escape') {
      setSelectedAnnotationId(null);
      setDrawStart(null);
      setTempBbox(null);
    }
  }, [selectedAnnotationId, localAnnotations, onAnnotationDelete]);

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

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImgWidth(img.naturalWidth || 800);
      setImgHeight(img.naturalHeight || 600);
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load image');
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

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
        {imageUrl && imageLoaded && (
          <image
            href={imageUrl}
            x={offset.x}
            y={offset.y}
            width={imgWidth * scale}
            height={imgHeight * scale}
            preserveAspectRatio="xMidYMid meet"
          />
        )}

        {localAnnotations.map((ann) => {
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

      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-white">加载图片中...</p>
          </div>
        </div>
      )}
    </div>
  );
}
