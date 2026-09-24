import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Response } from 'express';

// Configuração de ambiente do Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const defaultBucket = process.env.SUPABASE_STORAGE_BUCKET || 'admission-documents';

export const isSupabaseStorageEnabled = Boolean(supabaseUrl && supabaseKey);

// Cliente Supabase seguro inicializado exclusivamente no backend
export const supabaseServerClient: SupabaseClient | null = isSupabaseStorageEnabled
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

/**
 * Gera uma Signed URL segura e temporária do Supabase Storage para visualização ou download.
 * Busca no bucket privado configurado com tolerância a múltiplos formatos de caminho.
 */
export async function generateSupabaseSignedUrl(params: {
  storagePath: string;
  admissionId?: string;
  documentId?: string;
  employeeId?: string;
  fileName?: string;
  isDownload?: boolean;
  expiresInSeconds?: number;
}): Promise<{ signedUrl?: string; error?: string }> {
  if (!supabaseServerClient) {
    return { error: 'Supabase Storage não configurado no ambiente' };
  }

  const {
    storagePath,
    admissionId,
    documentId,
    employeeId,
    fileName,
    isDownload = false,
    expiresInSeconds = 60 * 30 // 30 minutos (validade segura e adequada)
  } = params;

  if (!storagePath) {
    return { error: 'Caminho do arquivo não fornecido' };
  }

  // Lista de buckets privados a consultar
  const candidateBuckets = Array.from(
    new Set([
      defaultBucket,
      'admission-documents',
      'rh'
    ].filter(Boolean) as string[])
  );

  // Lista de caminhos candidatos onde o arquivo pode residir no bucket
  const cleanPath = storagePath.replace(/^\/+/, '');
  const candidatePaths: string[] = [cleanPath];

  if (admissionId) {
    candidatePaths.push(`${admissionId}/${cleanPath}`);
    if (documentId) {
      candidatePaths.push(`${admissionId}/${documentId}/${cleanPath}`);
      candidatePaths.push(`admissions/${admissionId}/${documentId}/${cleanPath}`);
    }
    candidatePaths.push(`admissions/${admissionId}/${cleanPath}`);
  }

  if (documentId) {
    candidatePaths.push(`${documentId}/${cleanPath}`);
    candidatePaths.push(`documents/${documentId}/${cleanPath}`);
  }

  if (employeeId) {
    candidatePaths.push(`${employeeId}/${cleanPath}`);
    candidatePaths.push(`employees/${employeeId}/${cleanPath}`);
  }

  const uniquePaths = Array.from(new Set(candidatePaths));

  for (const bucket of candidateBuckets) {
    for (const pathAttempt of uniquePaths) {
      try {
        const { data, error } = await supabaseServerClient.storage
          .from(bucket)
          .createSignedUrl(pathAttempt, expiresInSeconds, {
            download: isDownload ? (fileName || true) : false
          });

        if (!error && data?.signedUrl) {
          return { signedUrl: data.signedUrl };
        }
      } catch {
        // Continua para a próxima tentativa de busca de forma silenciosa e resiliente
      }
    }
  }

  return { error: 'Arquivo não localizado no Storage' };
}

/**
 * Renderiza uma página HTML elegante e amigável para erros de visualização de documentos.
 * Nunca expõe stack traces, tokens sensíveis ou caminhos internos de infraestrutura.
 */
export function renderFriendlyDocumentError(
  res: Response,
  statusCode: number,
  title: string,
  message: string
) {
  if (res.headersSent) return;

  res.status(statusCode);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  return res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Admissão Digital</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 36px 28px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: #f1f5f9;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .icon-wrap svg {
      width: 28px;
      height: 28px;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    p {
      margin: 0 0 24px;
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
      background: #0f766e;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s;
    }
    .btn:hover {
      background: #115e59;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
    <h2>${title}</h2>
    <p>${message}</p>
    <button class="btn" onclick="window.location.reload()">Tentar novamente</button>
  </div>
</body>
</html>`);
}
