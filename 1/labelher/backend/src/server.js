require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const getDatabase = require('./config/database');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const datasetRoutes = require('./routes/datasets');
const annotationRoutes = require('./routes/annotations');
const aiRoutes = require('./routes/ai');
const collaborationRoutes = require('./routes/collaboration');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', datasetRoutes);
app.use('/api', annotationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', collaborationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

async function startServer() {
  try {
    await getDatabase();
    app.listen(PORT, () => {
      console.log(`LabelHer backend running on port ${PORT}`);
      console.log(`API endpoints: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
