import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useUnfollowerStore } from '../../src/presentation/store/useUnfollowerStore';
import { LocalDatabase } from '../../src/infrastructure/storage/LocalDatabase';
import {
  Language,
  getDefaultLanguage,
  saveLanguage,
  translations,
} from '../../src/presentation/i18n';
import { Header } from './components/Header';
import { ConnectionStatus, SafetyNotice } from './components/SafetyNotice';
import { TabNavigation } from './components/TabNavigation';
import { UserList } from './components/UserList';
import { AutoUnfollowControl } from './components/AutoUnfollowControl';

const db = new LocalDatabase();

export const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(getDefaultLanguage);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CHECKING');
  const [threadsTabId, setThreadsTabId] = useState<number | null>(null);
  const t = translations[language];

  const {
    activeTab,
    diffResult,
    totalFollowers,
    totalFollowing,
    setActiveTab,
    loadDiff,
    removeNotFollowingUser,
    reset,
  } = useUnfollowerStore();

  const checkConnection = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      setConnectionStatus('CONNECTED');
      return;
    }

    try {
      const tabs = await chrome.tabs.query({
        url: ['*://*.threads.com/*', '*://*.threads.net/*'],
      });

      if (tabs.length === 0) {
        setConnectionStatus('NOT_ON_THREADS');
        setThreadsTabId(null);
        return;
      }

      const activeTab = tabs.find((t) => t.active) || tabs[0];
      if (!activeTab?.id) {
        setConnectionStatus('NOT_ON_THREADS');
        setThreadsTabId(null);
        return;
      }

      setThreadsTabId(activeTab.id);

      chrome.tabs.sendMessage(activeTab.id, { action: 'PING' }, (res) => {
        if (chrome.runtime?.lastError || !res?.connected) {
          setConnectionStatus('NEEDS_REFRESH');
        } else {
          setConnectionStatus('CONNECTED');
        }
      });
    } catch {
      setConnectionStatus('CONNECTED');
    }
  }, []);

  useEffect(() => {
    checkConnection();

    const handleTabUpdated = (_tabId: number, changeInfo: { status?: string }) => {
      if (changeInfo.status === 'complete') {
        checkConnection();
      }
    };

    chrome.tabs?.onUpdated?.addListener(handleTabUpdated);
    chrome.tabs?.onActivated?.addListener(checkConnection);

    return () => {
      chrome.tabs?.onUpdated?.removeListener(handleTabUpdated);
      chrome.tabs?.onActivated?.removeListener(checkConnection);
    };
  }, [checkConnection]);

  const handleRefreshTab = () => {
    if (threadsTabId && chrome.tabs?.reload) {
      chrome.tabs.reload(threadsTabId, {}, () => {
        setTimeout(checkConnection, 800);
      });
    }
  };

  const handleOpenThreads = () => {
    if (chrome.tabs?.create) {
      chrome.tabs.create({ url: 'https://www.threads.com' });
    }
  };

  useEffect(() => {
    // Initial fetch from DB
    if (chrome.storage?.local) {
      chrome.storage.local
        .get(['lastActiveUserId'])
        .then((res) => {
          const userId = typeof res?.lastActiveUserId === 'string' ? res.lastActiveUserId : undefined;
          loadDiff(userId, db);
        })
        .catch(() => {
          loadDiff(undefined, db);
        });
    } else {
      loadDiff(undefined, db);
    }

    const messageListener = (message: {
      action?: string;
      targetUserId?: string;
      userId?: string;
    }) => {
      if (message?.action === 'DATABASE_UPDATED') {
        loadDiff(message.targetUserId, db);
      }
      if (message?.action === 'USER_UNFOLLOWED' && message.userId) {
        removeNotFollowingUser(message.userId);
      }
    };

    chrome.runtime?.onMessage?.addListener(messageListener);
    return () => {
      chrome.runtime?.onMessage?.removeListener(messageListener);
    };
  }, [loadDiff, removeNotFollowingUser]);

  const handleToggleLang = () => {
    const nextLang: Language = language === 'tr' ? 'en' : 'tr';
    setLanguage(nextLang);
    saveLanguage(nextLang);
  };

  const handleClear = async () => {
    await db.clearAll();
    if (chrome.storage?.local) {
      chrome.storage.local.remove(['lastActiveUserId']).catch(() => {});
    }
    reset();
  };

  const counts = useMemo(
    () => ({
      notFollowing: diffResult?.notFollowingBack.length || 0,
      fans: diffResult?.fans.length || 0,
      mutuals: diffResult?.mutuals.length || 0,
    }),
    [diffResult]
  );

  const activeUsers = useMemo(() => {
    if (!diffResult) return [];
    switch (activeTab) {
      case 'notFollowing':
        return diffResult.notFollowingBack;
      case 'fans':
        return diffResult.fans;
      case 'mutuals':
        return diffResult.mutuals;
      default:
        return [];
    }
  }, [diffResult, activeTab]);

  const emptyMessage = useMemo(() => {
    switch (activeTab) {
      case 'notFollowing':
        return t.emptyNotFollowing;
      case 'fans':
        return t.emptyFans;
      case 'mutuals':
        return t.emptyMutuals;
      default:
        return t.emptyGeneral;
    }
  }, [activeTab, t]);

  const hasData = totalFollowers > 0 || totalFollowing > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        boxSizing: 'border-box',
        padding: '12px',
        backgroundColor: '#0a0a0a',
        color: '#ededed',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <Header
        onClear={handleClear}
        totalFollowers={totalFollowers}
        totalFollowing={totalFollowing}
        language={language}
        onToggleLang={handleToggleLang}
      />
      <SafetyNotice
        language={language}
        hasData={hasData}
        connectionStatus={connectionStatus}
        onRefreshTab={handleRefreshTab}
        onOpenThreads={handleOpenThreads}
      />
      <TabNavigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        language={language}
        counts={counts}
      />
      {activeTab === 'notFollowing' && (
        <AutoUnfollowControl
          users={diffResult?.notFollowingBack || []}
          language={language}
        />
      )}
      <UserList
        users={activeUsers}
        emptyMessage={emptyMessage}
        language={language}
        canUnfollow={activeTab === 'notFollowing'}
      />
    </div>
  );
};

export default App;
