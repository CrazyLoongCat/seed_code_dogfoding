const express = require('express');
const { v4: uuidv4 } = require('uuid');
const getDatabase = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const wrapAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/projects/:project_id/classes', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  const classes = db.prepare(`
    SELECT * FROM annotation_classes
    WHERE project_id = ?
    ORDER BY created_at ASC
  `).all(req.params.project_id);
  
  res.json({ classes });
}));

router.post('/projects/:project_id/classes', authMiddleware, wrapAsync(async (req, res) => {
  const { name, color } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  const db = await getDatabase();
  const classId = uuidv4();
  const classColor = color || '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
  
  db.prepare(`
    INSERT INTO annotation_classes (id, project_id, name, color)
    VALUES (?, ?, ?, ?)
  `).run(classId, req.params.project_id, name, classColor);
  
  res.status(201).json({
    class: {
      id: classId,
      project_id: req.params.project_id,
      name,
      color: classColor
    }
  });
}));

router.put('/classes/:class_id', authMiddleware, wrapAsync(async (req, res) => {
  const { name, color } = req.body;
  const db = await getDatabase();
  
  db.prepare(`
    UPDATE annotation_classes
    SET name = COALESCE(?, name),
        color = COALESCE(?, color)
    WHERE id = ?
  `).run(name, color, req.params.class_id);
  
  const updatedClass = db.prepare('SELECT * FROM annotation_classes WHERE id = ?').get(req.params.class_id);
  res.json({ class: updatedClass });
}));

router.delete('/classes/:class_id', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  db.prepare('DELETE FROM annotation_classes WHERE id = ?').run(req.params.class_id);
  res.json({ message: 'Class deleted' });
}));

router.get('/images/:image_id/annotations', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  const annotations = db.prepare(`
    SELECT a.*, ac.name as class_name, ac.color as class_color, u.username as annotator_name
    FROM annotations a
    JOIN annotation_classes ac ON a.class_id = ac.id
    JOIN users u ON a.annotator_id = u.id
    WHERE a.image_id = ?
    ORDER BY a.created_at ASC
  `).all(req.params.image_id);
  
  const parsedAnnotations = annotations.map(ann => ({
    ...ann,
    data: JSON.parse(ann.data)
  }));
  
  res.json({ annotations: parsedAnnotations });
}));

router.post('/images/:image_id/annotations', authMiddleware, wrapAsync(async (req, res) => {
  const { class_id, annotation_type, data } = req.body;
  
  if (!class_id || !annotation_type || !data) {
    return res.status(400).json({ error: 'class_id, annotation_type and data are required' });
  }
  
  const db = await getDatabase();
  const annotationId = uuidv4();
  
  db.prepare(`
    INSERT INTO annotations (id, image_id, class_id, annotator_id, annotation_type, data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    annotationId,
    req.params.image_id,
    class_id,
    req.user.id,
    annotation_type,
    JSON.stringify(data)
  );
  
  db.prepare(`
    UPDATE images SET status = 'annotated' WHERE id = ?
  `).run(req.params.image_id);
  
  res.status(201).json({
    annotation: {
      id: annotationId,
      image_id: req.params.image_id,
      class_id,
      annotation_type,
      data
    }
  });
}));

router.put('/annotations/:annotation_id', authMiddleware, wrapAsync(async (req, res) => {
  const { class_id, data } = req.body;
  const db = await getDatabase();
  
  db.prepare(`
    UPDATE annotations
    SET class_id = COALESCE(?, class_id),
        data = COALESCE(?, data),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(class_id, data ? JSON.stringify(data) : null, req.params.annotation_id);
  
  const updatedAnnotation = db.prepare('SELECT * FROM annotations WHERE id = ?').get(req.params.annotation_id);
  res.json({
    annotation: {
      ...updatedAnnotation,
      data: JSON.parse(updatedAnnotation.data)
    }
  });
}));

router.delete('/annotations/:annotation_id', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  const annotation = db.prepare('SELECT * FROM annotations WHERE id = ?').get(req.params.annotation_id);
  
  if (!annotation) {
    return res.status(404).json({ error: 'Annotation not found' });
  }
  
  db.prepare('DELETE FROM annotations WHERE id = ?').run(req.params.annotation_id);
  
  const remaining = db.prepare('SELECT COUNT(*) as count FROM annotations WHERE image_id = ?').get(annotation.image_id);
  
  if (remaining.count === 0) {
    db.prepare("UPDATE images SET status = 'unannotated' WHERE id = ?").run(annotation.image_id);
  }
  
  res.json({ message: 'Annotation deleted' });
}));

router.post('/images/:image_id/annotations/batch', authMiddleware, wrapAsync(async (req, res) => {
  const { annotations } = req.body;
  
  if (!Array.isArray(annotations)) {
    return res.status(400).json({ error: 'annotations must be an array' });
  }
  
  const db = await getDatabase();
  const insert = db.prepare(`
    INSERT INTO annotations (id, image_id, class_id, annotator_id, annotation_type, data)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const createdAnnotations = [];
  
  for (const ann of annotations) {
    const annotationId = uuidv4();
    insert.run(
      annotationId,
      req.params.image_id,
      ann.class_id,
      req.user.id,
      ann.annotation_type,
      JSON.stringify(ann.data)
    );
    createdAnnotations.push({ id: annotationId, ...ann });
  }
  
  db.prepare(`
    UPDATE images SET status = 'annotated' WHERE id = ?
  `).run(req.params.image_id);
  
  res.status(201).json({ annotations: createdAnnotations });
}));

router.post('/images/:image_id/export', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  const image = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.image_id);
  
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  const annotations = db.prepare(`
    SELECT a.*, ac.name as label
    FROM annotations a
    JOIN annotation_classes ac ON a.class_id = ac.id
    WHERE a.image_id = ?
  `).all(req.params.image_id);
  
  const parsedAnnotations = annotations.map(ann => ({
    label: ann.label,
    annotation_type: ann.annotation_type,
    data: JSON.parse(ann.data)
  }));
  
  res.json({
    image: {
      id: image.id,
      filename: image.original_name,
      width: image.width,
      height: image.height
    },
    annotations: parsedAnnotations
  });
}));

module.exports = router;
