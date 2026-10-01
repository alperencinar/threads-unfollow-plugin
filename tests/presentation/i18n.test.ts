import { describe, it, expect } from 'vitest';
import { translations, getDefaultLanguage, saveLanguage } from '../../src/presentation/i18n';

describe('i18n module', () => {
  it('contains consistent translation keys for tr and en', () => {
    const trKeys = Object.keys(translations.tr).sort();
    const enKeys = Object.keys(translations.en).sort();

    expect(trKeys).toEqual(enKeys);
    expect(translations.tr.appTitle).toBeDefined();
    expect(translations.en.appTitle).toBeDefined();
    expect(translations.tr.followers).toBe('Takipçi');
    expect(translations.en.followers).toBe('Followers');
  });

  it('detects language fallback correctly', () => {
    const lang = getDefaultLanguage();
    expect(['tr', 'en']).toContain(lang);
  });
});
