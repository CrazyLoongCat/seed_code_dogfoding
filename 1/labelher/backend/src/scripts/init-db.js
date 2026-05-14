require('dotenv').config();
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/labelher.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

async function initDb() {
  const SQL = await initSqlJs();
  
  const db = new SQL.Database();

  const createTables = `
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'annotator',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL,
      annotation_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE datasets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE images (
      id TEXT PRIMARY KEY,
      dataset_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      status TEXT NOT NULL DEFAULT 'unannotated',
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE annotation_classes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE annotations (
      id TEXT PRIMARY KEY,
      image_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      annotator_id TEXT NOT NULL,
      annotation_type TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE comments (
      id TEXT PRIMARY KEY,
      image_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      image_id TEXT NOT NULL,
      assignee_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );
  `;

  db.run(createTables);

  const defaultUsers = [
    { id: uuidv4(), username: 'admin', email: 'admin@labelher.com', password: 'admin123', role: 'admin' },
    { id: uuidv4(), username: 'manager', email: 'manager@labelher.com', password: 'manager123', role: 'project_manager' },
    { id: uuidv4(), username: 'annotator1', email: 'annotator1@labelher.com', password: 'annotator123', role: 'annotator' },
    { id: uuidv4(), username: 'annotator2', email: 'annotator2@labelher.com', password: 'annotator123', role: 'annotator' },
    { id: uuidv4(), username: 'reviewer', email: 'reviewer@labelher.com', password: 'reviewer123', role: 'reviewer' }
  ];

  for (const user of defaultUsers) {
    const hashedPassword = bcrypt.hashSync(user.password, 10);
    const stmt = db.prepare('INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)');
    stmt.bind([user.id, user.username, user.email, hashedPassword, user.role]);
    if (stmt.step()) {
      console.log(`Created user: ${user.username} (${user.role})`);
    }
    stmt.free();
  }

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  console.log('\nDatabase initialized successfully!');
  console.log('Database saved to:', dbPath);
  console.log('Default users created:');
  console.log('- admin / admin123 (admin)');
  console.log('- manager / manager123 (project_manager)');
  console.log('- annotator1 / annotator123 (annotator)');
  console.log('- annotator2 / annotator123 (annotator)');
  console.log('- reviewer / reviewer123 (reviewer)');
  
  db.close();
}

initDb().catch(console.error);
