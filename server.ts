import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRouter from './server/routes.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares essenciais
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Headers de segurança básicos
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', system: 'Admissão Digital', timestamp: new Date().toISOString() });
  });

  // Rotas de API
  app.use('/api', apiRouter);

  // Vite middleware no desenvolvimento ou arquivos estáticos na produção
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Admissão Digital] Servidor ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Falha ao iniciar servidor:', err);
});
