import React, { useEffect, useMemo } from 'react';
import { useUnfollowerStore } from '../../src/presentation/store/useUnfollowerStore';
import { LocalDatabase } from '../../src/infrastructure/storage/LocalDatabase';
import { Header } from './components/Header';
import { SafetyNotice } from './components/SafetyNotice';
import { TabNavigation } from './components/TabNavigation';
import { UserList } from './components/UserList';

const db = new LocalDatabase();

export const App: React.FC = () => {
  const {
    activeTab,
    diffResult,
    totalFollowers,
    totalFollowing,
    setActiveTab,
    loadDiff,
    reset,
  } = useUnfollowerStore();

  useEffect(() => {
    loadDiff('current_user', db);

    const messageListener = (message: { action?: string }) => {
      if (message?.action === 'DATABASE_UPDATED') {
        loadDiff('current_user', db);
      }
    };

    chrome.runtime?.onMessage?.addListener(messageListener);
    return () => {
      chrome.runtime?.onMessage?.removeListener(messageListener);
    };
  }, [loadDiff]);

  const handleClear = async () => {
    await db.clearAll();
    reset();
  };

  const counts = useMemo(
    () => ({
      unfollowers: diffResult?.unfollowers.length || 0,
      notFollowing: diffResult?.notFollowingBack.length || 0,
      newFollowers: diffResult?.newFollowers.length || 0,
      fans: diffResult?.fans.length || 0,
    }),
    [diffResult]
  );

  const activeUsers = useMemo(() => {
    if (!diffResult) return [];
    switch (activeTab) {
      case 'unfollowers':
        return diffResult.unfollowers;
      case 'notFollowing':
        return diffResult.notFollowingBack;
      case 'newFollowers':
        return diffResult.newFollowers;
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
      case 'unfollowers':
        return 'Henüz seni takipten çıkan kimse tespit edilmedi.';
      case 'notFollowing':
        return 'Geri takip etmeyen kimse bulunamadı.';
      case 'newFollowers':
        return 'Yeni takipçi bulunmuyor.';
      case 'fans':
        return 'Hayran listesi boş.';
      default:
        return 'Kayıt bulunamadı.';
    }
  }, [activeTab]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        boxSizing: 'border-box',
        padding: '12px',
      }}
    >
      <Header
        onClear={handleClear}
        totalFollowers={totalFollowers}
        totalFollowing={totalFollowing}
      />
      <SafetyNotice />
      <TabNavigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={counts}
      />
      <UserList users={activeUsers} emptyMessage={emptyMessage} />
    </div>
  );
};

export default App;
