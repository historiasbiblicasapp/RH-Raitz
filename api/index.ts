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

// Tratamento global de erros para funções Vercel Serverless
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Serverless Error]', err?.message || err);
  if (res.headersSent) return;

  if (req.path.includes('/file') || req.path.includes('/document')) {
    res.status(500);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Aviso</title></head>
<body style="font-family:-apple-system,sans-serif;text-align:center;padding:40px;background:#f8fafc;color:#334155;">
  <div style="background:white;max-width:420px;margin:auto;padding:32px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <h3 style="color:#0f172a;margin-top:0;font-size:18px;">Visualização de Documento</h3>
    <p style="color:#64748b;font-size:14px;line-height:1.5;">Não foi possível abrir o documento. Tente novamente.</p>
    <button onclick="window.location.reload()" style="background:#0f766e;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Tentar novamente</button>
  </div>
</body>
</html>`);
  }

  res.status(500).json({ error: 'Não foi possível abrir o documento. Tente novamente.' });
});

export default app;
