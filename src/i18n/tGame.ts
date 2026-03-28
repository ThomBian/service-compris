import i18n from './index';

export function tGame(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, { ns: 'game', ...(options ?? {}) });
}

export function randomGreeting(kind: 'reservation' | 'scammer' | 'walkin'): string {
  const raw = i18n.t(`greetings.${kind}`, { ns: 'game', returnObjects: true });
  if (Array.isArray(raw) && raw.length > 0) {
    return String(raw[Math.floor(Math.random() * raw.length)]);
  }
  return '';
}

export function tCharacter(
  id: string,
  field: 'clueText' | 'consequenceDescription' | 'refusalDescription',
  fallback: string,
): string {
  return i18n.t(`characters.${id}.${field}`, { ns: 'game', defaultValue: fallback });
}
