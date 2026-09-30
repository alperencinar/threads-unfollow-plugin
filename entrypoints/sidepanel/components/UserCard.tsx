import React from 'react';
import { SocialUser } from '../../../src/domain/entities';

interface UserCardProps {
  user: SocialUser;
}

export const UserCard: React.FC<UserCardProps> = ({ user }) => {
  const profileUrl = `https://www.threads.com/@${user.username}`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        background: '#141414',
        border: '1px solid #262626',
        borderRadius: '8px',
        marginBottom: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.username}
            style={{ width: '32px', height: '32px', borderRadius: '9999px', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: '#262626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {user.username.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            @{user.username}
          </div>
          {user.fullName && (
            <div style={{ fontSize: '11px', color: '#737373', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.fullName}
            </div>
          )}
        </div>
      </div>

      <a
        href={profileUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          background: '#262626',
          color: '#e5e5e5',
          textDecoration: 'none',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          marginLeft: '8px',
        }}
      >
        Profili Aç
      </a>
    </div>
  );
};
