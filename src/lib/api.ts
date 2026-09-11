// Utilitário central de requisições à API com proteção contra respostas HTML,
// erros de cold-start do servidor e tratamento seguro de JSON.

export async function safeFetchJson<T = any>(
  input: string,
  init?: RequestInit,
  retries = 2
): Promise<T> {
  // Garante que URLs relativas da API sempre comecem com '/'
  let url = input;
  if (url.startsWith('api/')) {
    url = `/${url}`;
  }

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, init);

      // Tratamento para contêiner acordando ou reiniciando (502, 503, 504)
      if ([502, 503, 504].includes(res.status) && attempt < retries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 600 * attempt));
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
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
          // Se a resposta for uma página HTML (ex: erro 404/500 da infraestrutura ou Cloud Run)
          if (!res.ok) {
            const cleanSnippet = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            let userMsg = `O servidor respondeu com status ${res.status}.`;
            if (cleanSnippet.length > 5 && !cleanSnippet.toLowerCase().includes('the page')) {
              userMsg = cleanSnippet.slice(0, 120);
            } else if (res.status === 404) {
              userMsg = 'Serviço temporariamente indisponível. Por favor, aguarde alguns instantes e tente novamente.';
            }
            throw new Error(userMsg);
          }
          data = text;
        }
      }

      if (!res.ok) {
        const errMsg = data?.error || data?.message || `Erro no servidor (${res.status}).`;
        throw new Error(errMsg);
      }

      return data as T;
    } catch (err: any) {
      // Se for erro de rede ("Failed to fetch") e ainda houver tentativas
      if (
        attempt < retries &&
        (err.name === 'TypeError' ||
          err.message?.includes('fetch') ||
          err.message?.includes('NetworkError') ||
          err.message?.includes('Failed to fetch'))
      ) {
        attempt++;
        await new Promise((r) => setTimeout(r, 600 * attempt));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Não foi possível conectar ao servidor. Por favor, recarregue a página.');
}
