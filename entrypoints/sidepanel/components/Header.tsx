import React from 'react';

interface HeaderProps {
  onClear: () => void;
  totalFollowers: number;
  totalFollowing: number;
}

export const Header: React.FC<HeaderProps> = ({
  onClear,
  totalFollowers,
  totalFollowing,
}) => {
  return (
    <header style={{ borderBottom: '1px solid #262626', paddingBottom: '12px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🧵</span> Threads.com Analiz
          </h1>
          <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
            ● Local-First • 0 Ban Riski
          </span>
        </div>
        <button
          onClick={onClear}
          title="Verileri Temizle"
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
          Sıfırla
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '12px', color: '#a3a3a3' }}>
        <div>
          Takipçi: <strong style={{ color: '#fff' }}>{totalFollowers}</strong>
        </div>
        <div>
          Takip Edilen: <strong style={{ color: '#fff' }}>{totalFollowing}</strong>
        </div>
      </div>
    </header>
  );
};
