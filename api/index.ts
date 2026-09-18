import express from 'express';
import apiRouter from '../server/routes.ts';

const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Headers de segurança e CORS
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-email');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Normalização de URLs de API
app.use((req, _res, next) => {
  if (req.url.includes('/api/')) {
    const idx = req.url.indexOf('/api/');
    if (idx > 0) {
      req.url = req.url.substring(idx);
    }
  }
  next();
});

// Health check
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'ok', system: 'Admissão Digital', timestamp: new Date().toISOString() });
});

// Rotas de API e Autenticação
app.use('/api', apiRouter);
app.use('/auth', apiRouter);
app.use('/', apiRouter);

export default app;
