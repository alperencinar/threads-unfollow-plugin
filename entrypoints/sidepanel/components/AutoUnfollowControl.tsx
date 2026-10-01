import React from 'react';
import { SocialUser } from '../../../src/domain/entities';
import { useUnfollowerStore } from '../../../src/presentation/store/useUnfollowerStore';
import { Language, translations } from '../../../src/presentation/i18n';

interface AutoUnfollowControlProps {
  users: ReadonlyArray<SocialUser>;
  language: Language;
}

export const AutoUnfollowControl: React.FC<AutoUnfollowControlProps> = ({
  users,
  language,
}) => {
  const t = translations[language];
  const { queueProgress, startQueue, pauseQueue, resumeQueue, stopQueue } =
    useUnfollowerStore();

  if (users.length === 0 && queueProgress.status === 'IDLE') {
    return null;
  }

  const isRunning = queueProgress.status === 'RUNNING';
  const isPaused = queueProgress.status === 'PAUSED';
  const isRateLimited = queueProgress.status === 'RATE_LIMITED';
  const isCompleted = queueProgress.status === 'COMPLETED';
  const isActive = isRunning || isPaused;

  const percent =
    queueProgress.total > 0
      ? Math.round((queueProgress.completed / queueProgress.total) * 100)
      : 0;

  return (
    <div
      style={{
        background: '#141414',
        border: isRateLimited
          ? '1px solid #ef4444'
          : isCompleted
          ? '1px solid #22c55e'
          : '1px solid #262626',
        borderRadius: '10px',
        padding: '10px 12px',
        marginBottom: '10px',
        boxSizing: 'border-box',
      }}
    >
      {isRateLimited && (
        <div
          style={{
            color: '#f87171',
            fontSize: '12px',
            lineHeight: 1.4,
            marginBottom: '8px',
          }}
        >
          {t.unfollowRateLimited}
        </div>
      )}

      {isCompleted && (
        <div
          style={{
            color: '#4ade80',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          {t.unfollowDone} ({queueProgress.completed} / {queueProgress.total})
        </div>
      )}

      {isActive ? (
        <div>
          {/* Progress Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontWeight: 600, color: '#e5e5e5' }}>
              {isRunning
                ? queueProgress.countdownSeconds > 0
                  ? `⏳ ${t.unfollowWaiting}: ${queueProgress.countdownSeconds}s`
                  : `🔄 ${t.unfollowProcessing}...`
                : `⏸️ ${t.unfollowPause}`}
            </span>
            <span style={{ color: '#a3a3a3', fontSize: '11px' }}>
              {queueProgress.completed} / {queueProgress.total} ({percent}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#262626',
              borderRadius: '9999px',
              overflow: 'hidden',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                width: `${percent}%`,
                height: '100%',
                backgroundColor: isPaused ? '#f59e0b' : '#3b82f6',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* Target user notice */}
          {queueProgress.currentUser && (
            <div
              style={{
                fontSize: '11px',
                color: '#737373',
                marginBottom: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              @{queueProgress.currentUser.username}
            </div>
          )}

          {/* Control Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {isRunning ? (
              <button
                onClick={pauseQueue}
                style={{
                  flex: 1,
                  background: '#262626',
                  color: '#fbbf24',
                  border: '1px solid #404040',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ⏸️ {t.unfollowPause}
              </button>
            ) : (
              <button
                onClick={resumeQueue}
                style={{
                  flex: 1,
                  background: '#262626',
                  color: '#34d399',
                  border: '1px solid #404040',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ▶️ {t.unfollowResume}
              </button>
            )}

            <button
              onClick={stopQueue}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✕ {t.unfollowStop}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => startQueue(users)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
              transition: 'opacity 0.2s ease',
            }}
          >
            {t.unfollowAll}
          </button>
          <div
            style={{
              fontSize: '10px',
              color: '#737373',
              textAlign: 'center',
              marginTop: '5px',
            }}
          >
            {t.unfollowAllDesc}
          </div>
        </div>
      )}
    </div>
  );
};
