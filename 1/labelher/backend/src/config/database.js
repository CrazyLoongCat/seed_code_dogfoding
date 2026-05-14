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
          stmt.bind(params);
          stmt.step();
        } catch(e) {}
        try {
          stmt.free();
        } catch(e) {}
        saveDatabase(db);
        return this;
      },
      get: function(...params) {
        let result = undefined;
        try {
          stmt.bind(params);
          if (stmt.step()) {
            result = stmt.getAsObject();
          }
        } catch(e) {}
        try {
          stmt.free();
        } catch(e) {}
        return result;
      },
      all: function(...params) {
        const results = [];
        try {
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
        } catch(e) {}
        try {
          stmt.free();
        } catch(e) {}
        return results;
      }
    };
  };
  
  const originalExec = db.exec.bind(db);
  db.exec = function(sql) {
    originalExec(sql);
    saveDatabase(db);
  };
  
  db.save = () => saveDatabase(db);
  
  dbInstance = db;
  return db;
}

module.exports = getDatabase;
