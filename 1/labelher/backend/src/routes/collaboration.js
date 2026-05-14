const express = require('express');
const { v4: uuidv4 } = require('uuid');
const getDatabase = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const wrapAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/images/:image_id/comments', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  const comments = db.prepare(`
    SELECT c.*, u.username, u.email
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.image_id = ?
    ORDER BY c.created_at DESC
  `).all(req.params.image_id);
  
  res.json({ comments });
}));

router.post('/images/:image_id/comments', authMiddleware, wrapAsync(async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  const db = await getDatabase();
  const commentId = uuidv4();
  
  db.prepare(`
    INSERT INTO comments (id, image_id, user_id, content)
    VALUES (?, ?, ?, ?)
  `).run(commentId, req.params.image_id, req.user.id, content);
  
  const comment = db.prepare(`
    SELECT c.*, u.username, u.email
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(commentId);
  
  res.status(201).json({ comment });
}));

router.delete('/comments/:comment_id', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.comment_id);
  res.json({ message: 'Comment deleted' });
}));

router.get('/tasks', authMiddleware, wrapAsync(async (req, res) => {
  const { status, assignee_id } = req.query;
  const db = await getDatabase();
  
  let query = `
    SELECT t.*, i.original_name as image_name, d.name as dataset_name, p.name as project_name,
           u.username as assignee_name
    FROM tasks t
    JOIN images i ON t.image_id = i.id
    JOIN datasets d ON i.dataset_id = d.id
    JOIN projects p ON d.project_id = p.id
    JOIN users u ON t.assignee_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }
  
  if (assignee_id) {
    query += ' AND t.assignee_id = ?';
    params.push(assignee_id);
  }
  
  if (req.user.role === 'annotator') {
    query += ' AND t.assignee_id = ?';
    params.push(req.user.id);
  }
  
  query += ' ORDER BY t.created_at DESC';
  
  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
}));

router.post('/tasks', authMiddleware, wrapAsync(async (req, res) => {
  const { project_id, image_id, assignee_id } = req.body;
  
  if (!project_id || !image_id || !assignee_id) {
    return res.status(400).json({ error: 'project_id, image_id and assignee_id are required' });
  }
  
  const db = await getDatabase();
  const taskId = uuidv4();
  
  try {
    db.prepare(`
      INSERT INTO tasks (id, project_id, image_id, assignee_id, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(taskId, project_id, image_id, assignee_id);
    
    db.prepare(`
      UPDATE images SET assigned_to = ? WHERE id = ?
    `).run(assignee_id, image_id);
    
    res.status(201).json({
      task: {
        id: taskId,
        project_id,
        image_id,
        assignee_id,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(409).json({ error: 'Task already exists for this image' });
  }
}));

router.put('/tasks/:task_id', authMiddleware, wrapAsync(async (req, res) => {
  const { status } = req.body;
  const db = await getDatabase();
  
  const updates = [];
  const params = [];
  
  if (status) {
    updates.push('status = ?');
    params.push(status);
    
    if (status === 'completed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  
  params.push(req.params.task_id);
  
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.task_id);
  res.json({ task });
}));

router.delete('/tasks/:task_id', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.task_id);
  res.json({ message: 'Task deleted' });
}));

router.post('/tasks/batch-assign', authMiddleware, wrapAsync(async (req, res) => {
  const { project_id, dataset_id, assignee_id, count } = req.body;
  
  if (!project_id || !assignee_id) {
    return res.status(400).json({ error: 'project_id and assignee_id are required' });
  }
  
  const db = await getDatabase();
  
  let query = `
    SELECT i.id FROM images i
    JOIN datasets d ON i.dataset_id = d.id
    WHERE d.project_id = ? AND i.assigned_to IS NULL
  `;
  const params = [project_id];
  
  if (dataset_id) {
    query += ' AND i.dataset_id = ?';
    params.push(dataset_id);
  }
  
  query += ' ORDER BY i.created_at ASC';
  
  if (count) {
    query += ' LIMIT ?';
    params.push(parseInt(count));
  }
  
  const images = db.prepare(query).all(...params);
  
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, project_id, image_id, assignee_id, status)
    VALUES (?, ?, ?, ?, 'pending')
  `);
  
  const updateImage = db.prepare(`
    UPDATE images SET assigned_to = ? WHERE id = ?
  `);
  
  const assignedCount = images.length;
  
  for (const image of images) {
    const taskId = uuidv4();
    insertTask.run(taskId, project_id, image.id, assignee_id);
    updateImage.run(assignee_id, image.id);
  }
  
  res.json({
    message: `Successfully assigned ${assignedCount} images`,
    count: assignedCount
  });
}));

module.exports = router;
