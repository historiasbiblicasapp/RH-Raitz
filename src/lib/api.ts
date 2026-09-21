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

      // Se a rota não existir no servidor (ex: deploy estático na Vercel ou rota nova)
      if (res.status === 404) {
        const fallback = handleFallbackApiRoute(url, mergedInit);
        if (fallback !== undefined) {
          return fallback as T;
        }
      }

      // Tratamento para contêiner acordando ou reiniciando (502, 503, 504)
      const isTransientStatus = [502, 503, 504].includes(res.status);
      const contentType = res.headers.get('content-type') || '';
      const isHtml = contentType.includes('text/html');

      // Se for status transitório de infraestrutura ou página HTML em requisição de API
      if ((isTransientStatus || isHtml) && attempt < retries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 600 * attempt));
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
          // Se for HTML ou texto não JSON em erro
          if (!res.ok || isHtml) {
            const fallback = handleFallbackApiRoute(url, mergedInit);
            if (fallback !== undefined) {
              return fallback as T;
            }

            if (attempt < retries) {
              attempt++;
              await new Promise((r) => setTimeout(r, 600 * attempt));
              continue;
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
        const fallback = handleFallbackApiRoute(url, mergedInit);
        if (fallback !== undefined) {
          return fallback as T;
        }

        let errMsg = `Erro no servidor (${res.status}).`;
        if (typeof data?.error === 'string') {
          errMsg = data.error;
        } else if (typeof data?.error?.message === 'string') {
          errMsg = data.error.message;
        } else if (typeof data?.message === 'string') {
          errMsg = data.message;
        } else if (typeof data === 'string' && data.length > 0 && data.length < 160) {
          errMsg = data;
        }
        throw new Error(errMsg);
      }

      return data as T;
    } catch (err: any) {
      // Se houver fallback cadastrado para a rota, use-o imediatamente
      const fallback = handleFallbackApiRoute(url, mergedInit);
      if (fallback !== undefined) {
        return fallback as T;
      }

      if (
        attempt < retries &&
        (err.name === 'TypeError' ||
          err.message?.includes('fetch') ||
          err.message?.includes('NetworkError') ||
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('temporariamente indisponível'))
      ) {
        attempt++;
        await new Promise((r) => setTimeout(r, 600 * attempt));
        continue;
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
