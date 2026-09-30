import React from 'react';
import { ActiveTabType } from '../../../src/presentation/store/useUnfollowerStore';

interface TabNavigationProps {
  activeTab: ActiveTabType;
  onSelectTab: (tab: ActiveTabType) => void;
  counts: {
    unfollowers: number;
    notFollowing: number;
    newFollowers: number;
    fans: number;
  };
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onSelectTab,
  counts,
}) => {
  const tabs: Array<{ id: ActiveTabType; label: string; count: number; activeColor: string }> = [
    { id: 'unfollowers', label: 'Çıkanlar', count: counts.unfollowers, activeColor: '#ef4444' },
    { id: 'notFollowing', label: 'Takip Etmeyen', count: counts.notFollowing, activeColor: '#f59e0b' },
    { id: 'newFollowers', label: 'Yeni', count: counts.newFollowers, activeColor: '#10b981' },
    { id: 'fans', label: 'Hayranlar', count: counts.fans, activeColor: '#8b5cf6' },
  ];

  return (
    <nav
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '4px',
        background: '#171717',
        padding: '3px',
        borderRadius: '8px',
        marginBottom: '12px',
      }}
    >
      {tabs.map((tab) => {
        const isSelected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            style={{
              padding: '6px 2px',
              fontSize: '11px',
              fontWeight: isSelected ? 600 : 400,
              color: isSelected ? '#ffffff' : '#a3a3a3',
              background: isSelected ? tab.activeColor : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{tab.label}</span>
            <span style={{ fontSize: '10px', opacity: 0.9 }}>({tab.count})</span>
          </button>
        );
      })}
    </nav>
  );
};
