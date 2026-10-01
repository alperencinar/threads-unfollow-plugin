import React, { useState } from 'react';
import { SocialUser } from '../../../src/domain/entities';
import { Language, translations } from '../../../src/presentation/i18n';
import { useUnfollowerStore } from '../../../src/presentation/store/useUnfollowerStore';

interface UserCardProps {
  user: SocialUser;
  language: Language;
  canUnfollow?: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  language,
  canUnfollow = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isUnfollowed, setIsUnfollowed] = useState(false);
  const profileUrl = `https://www.threads.com/@${user.username}`;
  const t = translations[language];

  const { singleUnfollowingId, unfollowSingleUser } = useUnfollowerStore();
  const isProcessing = singleUnfollowingId === user.id;

  const handleUnfollow = async () => {
    if (isProcessing || isUnfollowed) return;
    const res = await unfollowSingleUser(user);
    if (res.success) {
      setIsUnfollowed(true);
    }
  };

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
        {user.avatarUrl && !imgError ? (
          <img
            src={user.avatarUrl}
            alt={user.username}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            style={{ width: '34px', height: '34px', borderRadius: '9999px', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9999px',
              background: '#262626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: '#a3a3a3',
            }}
          >
            {user.username.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            @{user.username}
          </div>
          {user.fullName && (
            <div
              style={{
                fontSize: '11px',
                color: '#737373',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.fullName}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
        {canUnfollow && (
          <button
            onClick={handleUnfollow}
            disabled={isProcessing || isUnfollowed}
            style={{
              background: isUnfollowed
                ? 'rgba(34, 197, 94, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              color: isUnfollowed ? '#4ade80' : '#f87171',
              border: isUnfollowed
                ? '1px solid rgba(34, 197, 94, 0.4)'
                : '1px solid rgba(239, 68, 68, 0.3)',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: isProcessing || isUnfollowed ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            {isProcessing ? t.unfollowing : isUnfollowed ? t.unfollowed : t.unfollow}
          </button>
        )}

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
          }}
        >
          {t.openProfile}
        </a>
      </div>
    </div>
  );
};
