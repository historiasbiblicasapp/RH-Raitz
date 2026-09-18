import { handleFallbackApiRoute } from './fallbackClient.ts';

// Utilitário central de requisições à API com proteção contra respostas HTML,
// erros de cold-start do servidor, problemas de cookies no iframe e tratamento seguro de JSON.

export async function safeFetchJson<T = any>(
  input: string,
  init?: RequestInit,
  retries = 3
): Promise<T> {
  // Garante que URLs relativas da API sempre comecem com '/'
  let url = input;
  if (url.startsWith('api/')) {
    url = `/${url}`;
  }

  let storedUserEmail = '';
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('admissao_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email) storedUserEmail = parsed.email;
      }
    } catch {}
  }

  const mergedInit: RequestInit = {
    credentials: 'include', // Envia cookies de autenticação mesmo dentro do iframe do AI Studio
    ...init,
    headers: {
      'Accept': 'application/json',
      ...(storedUserEmail ? { 'x-user-email': storedUserEmail } : {}),
      ...(init?.headers || {})
    }
  };

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, mergedInit);

      // Tratamento para contêiner acordando, reiniciando ou proxy roteando (404 temporário, 502, 503, 504)
      const isTransientStatus = [404, 502, 503, 504].includes(res.status);
      const contentType = res.headers.get('content-type') || '';
      const isHtml = contentType.includes('text/html');

      // Se for resposta HTML da infraestrutura (Cloud Run / Google Frontend) ou status transitório
      if ((isTransientStatus || isHtml) && attempt < retries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 700 * attempt));
        continue;
      }

      let data: any = null;

      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          // Se for HTML (ex: erro da infraestrutura ou página de cookie check)
          if (!res.ok || isHtml) {
            if (attempt < retries) {
              attempt++;
              await new Promise((r) => setTimeout(r, 700 * attempt));
              continue;
            }

            const fallback = handleFallbackApiRoute(url, mergedInit);
            if (fallback !== undefined) {
              return fallback as T;
            }

            const cleanSnippet = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            let userMsg = `O servidor respondeu com status ${res.status}.`;
            if (cleanSnippet.length > 5 && !cleanSnippet.toLowerCase().includes('the page') && !cleanSnippet.toLowerCase().includes('action required')) {
              userMsg = cleanSnippet.slice(0, 120);
            } else {
              userMsg = 'Serviço temporariamente indisponível. Por favor, aguarde alguns instantes e tente novamente.';
            }
            throw new Error(userMsg);
          }
          data = text;
        }
      }

      if (!res.ok) {
        // Se a rota der 404 (ex: deploy estático na Vercel)
        if (res.status === 404) {
          const fallback = handleFallbackApiRoute(url, mergedInit);
          if (fallback !== undefined) {
            return fallback as T;
          }
        }
        const errMsg = data?.error || data?.message || `Erro no servidor (${res.status}).`;
        throw new Error(errMsg);
      }

      return data as T;
    } catch (err: any) {
      if (
        attempt < retries &&
        (err.name === 'TypeError' ||
          err.message?.includes('fetch') ||
          err.message?.includes('NetworkError') ||
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('temporariamente indisponível'))
      ) {
        attempt++;
        await new Promise((r) => setTimeout(r, 700 * attempt));
        continue;
      }

      // Se falhar a conexão após todas as tentativas (ex: offline ou Vercel sem backend)
      const fallback = handleFallbackApiRoute(url, mergedInit);
      if (fallback !== undefined) {
        return fallback as T;
      }

      throw err;
    }
  }

  const fallback = handleFallbackApiRoute(url, mergedInit);
  if (fallback !== undefined) {
    return fallback as T;
  }

  throw new Error('Não foi possível conectar ao servidor no momento. Por favor, tente novamente.');
}
