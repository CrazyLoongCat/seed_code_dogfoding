const jwt = require('jsonwebtoken');
const getDatabase = require('../config/database');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = await getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

const requireProjectAccess = (roleField = 'project_id') => {
  return async (req, res, next) => {
    const projectId = req.params[roleField] || req.body.projectId;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID required' });
    }
    
    if (req.user.role === 'admin') {
      return next();
    }
    
    const db = await getDatabase();
    
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.owner_id === req.user.id) {
      return next();
    }
    
    const membership = db.prepare(`
      SELECT * FROM project_members 
      WHERE project_id = ? AND user_id = ?
    `).get(projectId, req.user.id);
    
    if (!membership) {
      return res.status(403).json({ error: 'No access to this project' });
    }
    
    req.projectRole = membership.role;
    next();
  };
};

module.exports = { authMiddleware, requireRole, requireProjectAccess };
