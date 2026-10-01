import React from 'react';
import { Language, translations } from '../../../src/presentation/i18n';

export type ConnectionStatus =
  | 'CONNECTED'
  | 'NEEDS_REFRESH'
  | 'NOT_ON_THREADS'
  | 'CHECKING';

interface SafetyNoticeProps {
  language: Language;
  hasData: boolean;
  connectionStatus?: ConnectionStatus;
  onRefreshTab?: () => void;
  onOpenThreads?: () => void;
}

export const SafetyNotice: React.FC<SafetyNoticeProps> = ({
  language,
  hasData,
  connectionStatus = 'CONNECTED',
  onRefreshTab,
  onOpenThreads,
}) => {
  const t = translations[language];

  if (connectionStatus === 'NEEDS_REFRESH') {
    return (
      <div
        style={{
          background: 'rgba(217, 119, 6, 0.08)',
          border: '1px solid #d97706',
          borderRadius: '10px',
          padding: '10px 12px',
          fontSize: '11px',
          color: '#fef3c7',
          marginBottom: '14px',
          lineHeight: '1.45',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: '#fbbf24',
            marginBottom: '4px',
            fontSize: '12px',
          }}
        >
          {t.refreshRequiredTitle}
        </div>
        <div style={{ color: '#d1d5db', marginBottom: '8px' }}>
          {t.refreshRequiredDesc}
        </div>
        {onRefreshTab && (
          <button
            onClick={onRefreshTab}
            style={{
              width: '100%',
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'opacity 0.2s',
            }}
          >
            {t.refreshButton}
          </button>
        )}
      </div>
    );
  }

  if (connectionStatus === 'NOT_ON_THREADS') {
    return (
      <div
        style={{
          background: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid #2563eb',
          borderRadius: '10px',
          padding: '10px 12px',
          fontSize: '11px',
          color: '#e0f2fe',
          marginBottom: '14px',
          lineHeight: '1.45',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: '#60a5fa',
            marginBottom: '4px',
            fontSize: '12px',
          }}
        >
          {t.notOnThreadsTitle}
        </div>
        <div style={{ color: '#d1d5db', marginBottom: '8px' }}>
          {t.notOnThreadsDesc}
        </div>
        {onOpenThreads && (
          <button
            onClick={onOpenThreads}
            style={{
              width: '100%',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {t.openThreadsButton}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#171717',
        border: hasData ? '1px solid #065f46' : '1px solid #262626',
        borderRadius: '10px',
        padding: '10px 12px',
        fontSize: '11px',
        color: '#d4d4d4',
        marginBottom: '14px',
        lineHeight: '1.45',
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          fontWeight: 600,
          color: hasData ? '#34d399' : '#38bdf8',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>{t.safeModeTitle}</span>
      </div>
      <div>{hasData ? t.safeModeDescCaptured : t.safeModeDescWaiting}</div>
    </div>
  );
};
