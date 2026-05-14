const express = require('express');
const { v4: uuidv4 } = require('uuid');
const getDatabase = require('../config/database');
const { authMiddleware, requireRole, requireProjectAccess } = require('../middleware/auth');

const router = express.Router();

const wrapAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/', authMiddleware, wrapAsync(async (req, res) => {
  const db = await getDatabase();
  let projects;
  
  if (req.user.role === 'admin') {
    projects = db.prepare(`
      SELECT p.*, u.username as owner_name,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM datasets d WHERE d.project_id = p.id) as dataset_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `).all();
  } else {
    projects = db.prepare(`
      SELECT p.*, u.username as owner_name,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM datasets d WHERE d.project_id = p.id) as dataset_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.owner_id = ? OR EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = ?
      )
      ORDER BY p.created_at DESC
    `).all(req.user.id, req.user.id);
  }
  
  res.json({ projects });
}));

router.post('/', authMiddleware, wrapAsync(async (req, res) => {
  const { name, description, annotation_type } = req.body;
  
  if (!name || !annotation_type) {
    return res.status(400).json({ error: 'Name and annotation_type are required' });
  }
  
  const db = await getDatabase();
  const projectId = uuidv4();
  
  db.prepare(`
    INSERT INTO projects (id, name, description, owner_id, annotation_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(projectId, name, description, req.user.id, annotation_type);
  
  res.status(201).json({
    project: {
      id: projectId,
      name,
      description,
      owner_id: req.user.id,
      annotation_type
    }
  });
}));

router.get('/:project_id', authMiddleware, requireProjectAccess(), wrapAsync(async (req, res) => {
  const db = await getDatabase();
  const project = db.prepare(`
    SELECT p.*, u.username as owner_name
    FROM projects p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `).get(req.params.project_id);
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT i.id) as total_images,
      COUNT(DISTINCT CASE WHEN i.status = 'annotated' THEN i.id END) as annotated_images,
      COUNT(DISTINCT CASE WHEN i.status = 'reviewed' THEN i.id END) as reviewed_images,
      COUNT(DISTINCT a.id) as total_annotations
    FROM projects p
    LEFT JOIN datasets d ON d.project_id = p.id
    LEFT JOIN images i ON i.dataset_id = d.id
    LEFT JOIN annotations a ON a.image_id = i.id
    WHERE p.id = ?
  `).get(req.params.project_id);
  
  res.json({ project, stats });
}));

router.put('/:project_id', authMiddleware, requireProjectAccess(), wrapAsync(async (req, res) => {
  const { name, description, annotation_type } = req.body;
  const db = await getDatabase();
  
  db.prepare(`
    UPDATE projects 
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        annotation_type = COALESCE(?, annotation_type),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, description, annotation_type, req.params.project_id);
  
  const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.project_id);
  res.json({ project: updatedProject });
}));

router.delete('/:project_id', authMiddleware, requireProjectAccess(), wrapAsync(async (req, res) => {
  const db = await getDatabase();
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.project_id);
  res.json({ message: 'Project deleted' });
}));

router.get('/:project_id/members', authMiddleware, requireProjectAccess(), wrapAsync(async (req, res) => {
  const db = await getDatabase();
  const members = db.prepare(`
    SELECT pm.*, u.username, u.email, u.role as user_role
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
    ORDER BY pm.joined_at DESC
  `).all(req.params.project_id);
  
  const owner = db.prepare(`
    SELECT u.id, u.username, u.email, u.role
    FROM projects p
    JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `).get(req.params.project_id);
  
  res.json({ members: [...(owner ? [{ ...owner, is_owner: true }] : []), ...members] });
}));

router.post('/:project_id/members', authMiddleware, requireProjectAccess(), wrapAsync(async (req, res) => {
  const { user_id, role } = req.body;
  
  if (!user_id || !role) {
    return res.status(400).json({ error: 'user_id and role are required' });
  }
  
  const db = await getDatabase();
  const membershipId = uuidv4();
  
  try {
    db.prepare(`
      INSERT INTO project_members (id, project_id, user_id, role)
      VALUES (?, ?, ?, ?)
    `).run(membershipId, req.params.project_id, user_id, role);
    
    res.status(201).json({ message: 'Member added' });
  } catch (error) {
    res.status(409).json({ error: 'User is already a member of this project' });
  }
}));

router.delete('/:project_id/members/:user_id', authMiddleware, requireProjectAccess(), wrapAsync(async (req, res) => {
  const db = await getDatabase();
  db.prepare(`
    DELETE FROM project_members 
    WHERE project_id = ? AND user_id = ?
  `).run(req.params.project_id, req.params.user_id);
  
  res.json({ message: 'Member removed' });
}));

module.exports = router;
