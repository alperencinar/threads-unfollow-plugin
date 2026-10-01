import React from 'react';
import { Language, translations } from '../../../src/presentation/i18n';

interface HeaderProps {
  onClear: () => void;
  totalFollowers: number;
  totalFollowing: number;
  language: Language;
  onToggleLang: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onClear,
  totalFollowers,
  totalFollowing,
  language,
  onToggleLang,
}) => {
  const t = translations[language];

  const handleClear = () => {
    if (window.confirm(t.resetConfirm)) {
      onClear();
    }
  };

  return (
    <header style={{ borderBottom: '1px solid #262626', paddingBottom: '12px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🧵</span> {t.appTitle}
          </h1>
          <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
            ● Local-First • 0-Ban Risk
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={onToggleLang}
            title="Switch Language (TR / EN)"
            style={{
              background: '#262626',
              border: '1px solid #404040',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.switchLang}
          </button>
          <button
            onClick={handleClear}
            title={t.reset}
            style={{
              background: '#1f1f1f',
              border: '1px solid #333',
              color: '#a3a3a3',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            {t.reset}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '14px', marginTop: '10px', fontSize: '12px', color: '#a3a3a3' }}>
        <div>
          {t.followers}: <strong style={{ color: '#fff' }}>{totalFollowers}</strong>
        </div>
        <div>
          {t.following}: <strong style={{ color: '#fff' }}>{totalFollowing}</strong>
        </div>
      </div>
    </header>
  );
};
