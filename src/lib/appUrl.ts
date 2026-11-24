export const PUBLIC_APP_URL_STORAGE_KEY = 'admissao_public_app_url';

export interface SystemUrlConfig {
  appUrl?: string;
  detectedUrl?: string;
  envUrl?: string;
  isLocalhost?: boolean;
}

export function isPrivatePreviewUrl(urlOrHost?: string): boolean {
  if (!urlOrHost) return false;
  const val = urlOrHost.trim().toLowerCase();
  return (
    val.includes('localhost') ||
    val.includes('127.0.0.1') ||
    val.includes('0.0.0.0') ||
    val.includes('ais-dev-')
  );
}

export function getSavedPublicUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (localStorage.getItem(PUBLIC_APP_URL_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function setSavedPublicUrl(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = url.trim().replace(/\/$/, '');
    if (clean) {
      localStorage.setItem(PUBLIC_APP_URL_STORAGE_KEY, clean);
    } else {
      localStorage.removeItem(PUBLIC_APP_URL_STORAGE_KEY);
    }
  } catch {
    // ignora erro de storage
  }
}

export function resolvePublicOrigin(systemConfig?: SystemUrlConfig | null): string {
  const saved = getSavedPublicUrl();
  if (saved) return saved;

  if (systemConfig?.envUrl && !isPrivatePreviewUrl(systemConfig.envUrl)) {
    return systemConfig.envUrl.trim().replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
}

export function buildInviteUrl(
  inviteToken: string,
  customBaseUrl?: string,
  systemConfig?: SystemUrlConfig | null
): string {
  const base = (customBaseUrl && customBaseUrl.trim()) || resolvePublicOrigin(systemConfig);
  return `${base.replace(/\/$/, '')}/convite/${inviteToken}`;
}
