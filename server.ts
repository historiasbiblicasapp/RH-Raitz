import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import apiRouter from './server/routes.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares essenciais
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Headers de segurança e CORS básicos
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

  // Normalização de URLs de API (caso navegador chame /login/api/... ou relativo com subpasta)
  app.use((req, _res, next) => {
    if (req.url.includes('/api/')) {
      const idx = req.url.indexOf('/api/');
      if (idx > 0) {
        req.url = req.url.substring(idx);
      }
    }
    next();
  });

  // Fallback para assets CSS/JS de builds anteriores (evita erro 404 como index-HEB7GCwi.css)
  app.use((req, res, next) => {
    // Nunca intercepta arquivos do Vite ou do código fonte /src/
    if (
      req.path.startsWith('/src/') ||
      req.path.startsWith('/@') ||
      req.path.startsWith('/node_modules/') ||
      req.path.startsWith('/api')
    ) {
      return next();
    }

    const distAssetsPath = path.join(process.cwd(), 'dist', 'assets');
    const publicPath = path.join(process.cwd(), 'public');

    // Se a requisição for por arquivo CSS de produção/hash antigo
    if (req.path.endsWith('.css') && (req.path.startsWith('/assets/') || req.path.includes('index-'))) {
      const filename = path.basename(req.path);
      const directDist = path.join(distAssetsPath, filename);
      const directPublic = path.join(publicPath, filename);

      if (fs.existsSync(directDist)) {
        res.setHeader('Content-Type', 'text/css');
        return res.sendFile(directDist);
      }
      if (fs.existsSync(directPublic)) {
        res.setHeader('Content-Type', 'text/css');
        return res.sendFile(directPublic);
      }

      // Se não encontrou o CSS versionado exato, serve o CSS mais recente da pasta dist/assets
      if (fs.existsSync(distAssetsPath)) {
        try {
          const files = fs.readdirSync(distAssetsPath);
          const latestCss = files.find(f => f.endsWith('.css'));
          if (latestCss) {
            res.setHeader('Content-Type', 'text/css');
            return res.sendFile(path.join(distAssetsPath, latestCss));
          }
        } catch {
          // segue fallback
        }
      }

      // Fallback seguro: CSS válido vazio com status 200 (evita quebrar o navegador com 404)
      res.setHeader('Content-Type', 'text/css');
      return res.send('/* CSS bundle fallback */');
    }

    // Se for requisição por asset JS de produção que mudou de hash
    if (req.path.endsWith('.js') && (req.path.startsWith('/assets/') || req.path.includes('index-'))) {
      const filename = path.basename(req.path);
      const directDist = path.join(distAssetsPath, filename);
      if (fs.existsSync(directDist)) {
        res.setHeader('Content-Type', 'application/javascript');
        return res.sendFile(directDist);
      }
    }

    next();
  });

  // Health check
  app.get(['/health', '/api/health'], (_req, res) => {
    res.json({ status: 'ok', system: 'Admissão Digital', timestamp: new Date().toISOString() });
  });

  // Rotas de API
  app.use('/api', apiRouter);
  app.use('/auth', apiRouter);

  // Vite middleware no desenvolvimento ou arquivos estáticos na produção
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback universal para SPA em desenvolvimento:
    // Garante que rotas como /login, /dashboard, /prazos funcionem perfeitamente ao atualizar a página (F5)
    // ou ao digitar diretamente na barra de endereços
    app.use('*', async (req, res, next) => {
      // Ignora requisições de API e Auth
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/auth')) {
        return next();
      }

      try {
        const url = req.originalUrl;
        const indexPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          return res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        }
        next();
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
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
