import React from 'react';

export const SafetyNotice: React.FC = () => {
  return (
    <div
      style={{
        background: '#171717',
        border: '1px solid #262626',
        borderRadius: '10px',
        padding: '10px',
        fontSize: '11px',
        color: '#d4d4d4',
        marginBottom: '14px',
        lineHeight: '1.45',
      }}
    >
      <div style={{ fontWeight: 600, color: '#34d399', marginBottom: '3px' }}>
        🛡️ Pasif Güvenli Mod Aktif
      </div>
      <div>
        Instagram ve Threads hesabınızın kilitlenmemesi için bot istekleri atılmaz.
        Lütfen <b>threads.com/@profiliniz</b> sayfasına gidip <b>Takipçiler</b> listenizi aşağı kaydırın. Eklenti verileri arka planda sessizce işler.
      </div>
    </div>
  );
};
