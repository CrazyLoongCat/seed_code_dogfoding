const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const getDatabase = require('../config/database');
const { authMiddleware, requireProjectAccess } = require('../middleware/auth');

const router = express.Router();

const wrapAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const uploadsDir = process.env.UPLOADS_DIR || './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const datasetId = req.body.datasetId || req.params.dataset_id;
    const datasetDir = path.join(uploadsDir, datasetId);
    if (!fs.existsSync(datasetDir)) {
      fs.mkdirSync(datasetDir, { recursive: true });
    }
    cb(null, datasetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = uuidv4() + ext;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

router.get('/projects/:project_id/datasets', authMiddleware, requireProjectAccess(), wrapAsync(async (req, res) => {
  const db = await getDatabase();
  const datasets = db.prepare(`
    SELECT d.*,
      (SELECT COUNT(*) FROM images i WHERE i.dataset_id = d.id) as image_count,
      (SELECT COUNT(*) FROM images i WHERE i.dataset_id = d.id AND i.status = 'annotated') as annotated_count
    FROM datasets d
    WHERE d.project_id = ?
    ORDER BY d.created_at DESC
  `).all(req.params.project_id);
  
  res.json({ datasets });
}));

router.post('/projects/:project_id/datasets', authMiddleware, requireProjectAccess(), wrapAsync(async (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  const db = await getDatabase();
  const datasetId = uuidv4();
  
  db.prepare(`
    INSERT INTO datasets (id, project_id, name, description)
    VALUES (?, ?, ?, ?)
  `).run(datasetId, req.params.project_id, name, description);
  
  res.status(201).json({
    dataset: {
      id: datasetId,
      project_id: req.params.project_id,
      name,
      description
    }
  });
}));

router.get('/datasets/:dataset_id', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  const dataset = db.prepare(`
    SELECT d.*, p.name as project_name
    FROM datasets d
    JOIN projects p ON d.project_id = p.id
    WHERE d.id = ?
  `).get(req.params.dataset_id);
  
  if (!dataset) {
    return res.status(404).json({ error: 'Dataset not found' });
  }
  
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_images,
      COUNT(CASE WHEN status = 'unannotated' THEN 1 END) as unannotated,
      COUNT(CASE WHEN status = 'annotated' THEN 1 END) as annotated,
      COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed
    FROM images
    WHERE dataset_id = ?
  `).get(req.params.dataset_id);
  
  res.json({ dataset, stats });
}));

router.delete('/datasets/:dataset_id', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  db.prepare('DELETE FROM datasets WHERE id = ?').run(req.params.dataset_id);
  res.json({ message: 'Dataset deleted' });
}));

router.get('/datasets/:dataset_id/images', authMiddleware, wrapAsync(async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  const db = await getDatabase();
  
  let query = 'SELECT * FROM images WHERE dataset_id = ?';
  const params = [req.params.dataset_id];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  const images = db.prepare(query).all(...params);
  
  const total = db.prepare(`
    SELECT COUNT(*) as count FROM images WHERE dataset_id = ?
    ${status ? ' AND status = ?' : ''}
  `).get(req.params.dataset_id, ...(status ? [status] : []));
  
  res.json({ images, total: total.count });
}));

router.get('/images/:image_id', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  const image = db.prepare(`
    SELECT i.*, d.name as dataset_name, d.project_id
    FROM images i
    JOIN datasets d ON i.dataset_id = d.id
    WHERE i.id = ?
  `).get(req.params.image_id);
  
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  res.json({ image });
}));

router.delete('/images/:image_id', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  const image = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.image_id);
  if (image) {
    try {
      if (fs.existsSync(image.file_path)) {
        fs.unlinkSync(image.file_path);
      }
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  }
  
  db.prepare('DELETE FROM images WHERE id = ?').run(req.params.image_id);
  res.json({ message: 'Image deleted' });
}));

router.post('/datasets/:dataset_id/upload', authMiddleware, upload.array('images', 100), wrapAsync(async (req, res) => {
  const datasetId = req.params.dataset_id;
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  
  const db = await getDatabase();
  const insertImage = db.prepare(`
    INSERT INTO images (id, dataset_id, filename, original_name, file_path, width, height, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'unannotated')
  `);
  
  const uploadedImages = [];
  
  for (const file of req.files) {
    const imageId = uuidv4();
    insertImage.run(
      imageId,
      datasetId,
      file.filename,
      file.originalname,
      file.path,
      null,
      null
    );
    
    uploadedImages.push({
      id: imageId,
      filename: file.filename,
      original_name: file.originalname
    });
  }
  
  res.status(201).json({
    message: `Successfully uploaded ${uploadedImages.length} images`,
    images: uploadedImages
  });
}));

router.get('/uploads/:dataset_id/:filename', (req, res) => {
  const { dataset_id, filename } = req.params;
  const filePath = path.join(uploadsDir, dataset_id, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

module.exports = router;
