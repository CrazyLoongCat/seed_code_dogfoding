require('dotenv').config();
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || './data/labelher.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;

function saveDatabase(db) {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function safeValue(value) {
  if (value === undefined || value === null) {
    return null;
  }
  return value;
}

async function getDatabase() {
  if (dbInstance) return dbInstance;
  
  const SQL = await initSqlJs();
  
  let db;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  db.pragma = function(query) {
    try {
      db.run('PRAGMA ' + query);
    } catch(e) {}
  };
  
  const originalPrepare = db.prepare.bind(db);
  
  db.prepare = function(sql) {
    const stmt = originalPrepare(sql);
    
    return {
      run: function(...params) {
        try {
          const safeParams = params.map(safeValue);
          stmt.bind(safeParams);
          stmt.step();
          stmt.free();
          saveDatabase(db);
        } catch(e) {
          console.error('Database run error:', e);
          try { stmt.free(); } catch(e) {}
        }
        return this;
      },
      get: function(...params) {
        let result = undefined;
        try {
          const safeParams = params.map(safeValue);
          stmt.bind(safeParams);
          if (stmt.step()) {
            result = stmt.getAsObject();
          }
          stmt.free();
        } catch(e) {
          console.error('Database get error:', e);
          try { stmt.free(); } catch(e) {}
        }
        return result;
      },
      all: function(...params) {
        const results = [];
        try {
          const safeParams = params.map(safeValue);
          stmt.bind(safeParams);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
        } catch(e) {
          console.error('Database all error:', e);
          try { stmt.free(); } catch(e) {}
        }
        return results;
      }
    };
  };
  
  const originalExec = db.exec.bind(db);
  db.exec = function(sql) {
    try {
      originalExec(sql);
      saveDatabase(db);
    } catch(e) {
      console.error('Database exec error:', e);
    }
  };
  
  db.save = () => saveDatabase(db);
  
  dbInstance = db;
  return db;
}

module.exports = getDatabase;
