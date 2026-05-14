const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/detect', authMiddleware, (req, res) => {
  const { image_url, model = 'default' } = req.body;
  
  if (!image_url) {
    return res.status(400).json({ error: 'image_url is required' });
  }
  
  const mockDetections = [
    {
      id: uuidv4(),
      label: 'person',
      confidence: 0.95,
      bbox: { x: 100, y: 100, width: 200, height: 300 }
    },
    {
      id: uuidv4(),
      label: 'car',
      confidence: 0.88,
      bbox: { x: 400, y: 200, width: 150, height: 100 }
    }
  ];
  
  setTimeout(() => {
    res.json({
      success: true,
      model,
      detections: mockDetections
    });
  }, 500);
});

router.post('/segment', authMiddleware, (req, res) => {
  const { image_url, model = 'default' } = req.body;
  
  if (!image_url) {
    return res.status(400).json({ error: 'image_url is required' });
  }
  
  const mockSegments = [
    {
      id: uuidv4(),
      label: 'background',
      mask: Array(100).fill(0).concat(Array(100).fill(1)),
      confidence: 0.92
    }
  ];
  
  setTimeout(() => {
    res.json({
      success: true,
      model,
      segments: mockSegments
    });
  }, 800);
});

router.post('/interactive-segment', authMiddleware, (req, res) => {
  const { image_url, clicks, model = 'default' } = req.body;
  
  if (!image_url) {
    return res.status(400).json({ error: 'image_url is required' });
  }
  
  const mockSegment = {
    id: uuidv4(),
    mask: Array(50).fill(0).concat(Array(150).fill(1)),
    confidence: 0.85
  };
  
  setTimeout(() => {
    res.json({
      success: true,
      model,
      segment: mockSegment
    });
  }, 300);
});

router.post('/classify', authMiddleware, (req, res) => {
  const { image_url, model = 'default' } = req.body;
  
  if (!image_url) {
    return res.status(400).json({ error: 'image_url is required' });
  }
  
  const mockClassification = {
    top_classes: [
      { label: 'cat', confidence: 0.85 },
      { label: 'dog', confidence: 0.10 },
      { label: 'bird', confidence: 0.05 }
    ]
  };
  
  setTimeout(() => {
    res.json({
      success: true,
      model,
      ...mockClassification
    });
  }, 300);
});

router.post('/keypoints', authMiddleware, (req, res) => {
  const { image_url, model = 'default' } = req.body;
  
  if (!image_url) {
    return res.status(400).json({ error: 'image_url is required' });
  }
  
  const mockKeypoints = {
    label: 'person',
    keypoints: [
      { name: 'nose', x: 200, y: 120, confidence: 0.98 },
      { name: 'left_eye', x: 185, y: 115, confidence: 0.95 },
      { name: 'right_eye', x: 215, y: 115, confidence: 0.95 },
      { name: 'left_shoulder', x: 160, y: 150, confidence: 0.90 },
      { name: 'right_shoulder', x: 240, y: 150, confidence: 0.90 }
    ],
    confidence: 0.88
  };
  
  setTimeout(() => {
    res.json({
      success: true,
      model,
      ...mockKeypoints
    });
  }, 600);
});

router.post('/ocr', authMiddleware, (req, res) => {
  const { image_url, model = 'default' } = req.body;
  
  if (!image_url) {
    return res.status(400).json({ error: 'image_url is required' });
  }
  
  const mockOCR = {
    text: 'Sample Text',
    bbox: { x: 100, y: 100, width: 200, height: 50 },
    confidence: 0.92
  };
  
  setTimeout(() => {
    res.json({
      success: true,
      model,
      ...mockOCR
    });
  }, 400);
});

router.get('/models', authMiddleware, (req, res) => {
  const models = [
    { id: 'default-detect', name: 'Default Detector', type: 'object_detection', description: 'General object detection model' },
    { id: 'default-segment', name: 'Default Segmenter', type: 'instance_segmentation', description: 'General instance segmentation model' },
    { id: 'default-classify', name: 'Default Classifier', type: 'image_classification', description: 'General image classification model' },
    { id: 'default-keypoints', name: 'Keypoint Detector', type: 'keypoint_detection', description: 'Human keypoint detection model' },
    { id: 'default-ocr', name: 'OCR Engine', type: 'text_recognition', description: 'Text detection and recognition' }
  ];
  
  res.json({ models });
});

module.exports = router;
