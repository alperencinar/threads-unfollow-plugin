import React from 'react';
import { ActiveTabType } from '../../../src/presentation/store/useUnfollowerStore';
import { Language, translations } from '../../../src/presentation/i18n';

interface TabNavigationProps {
  activeTab: ActiveTabType;
  onSelectTab: (tab: ActiveTabType) => void;
  language: Language;
  counts: {
    notFollowing: number;
    fans: number;
    mutuals: number;
  };
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onSelectTab,
  language,
  counts,
}) => {
  const t = translations[language];

  const tabs: Array<{
    id: ActiveTabType;
    label: string;
    count: number;
    badgeBg: string;
    badgeColor: string;
  }> = [
    {
      id: 'notFollowing',
      label: t.tabNotFollowing,
      count: counts.notFollowing,
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeColor: '#fbbf24',
    },
    {
      id: 'fans',
      label: t.tabFans,
      count: counts.fans,
      badgeBg: 'rgba(139, 92, 246, 0.15)',
      badgeColor: '#c084fc',
    },
    {
      id: 'mutuals',
      label: t.tabMutuals,
      count: counts.mutuals,
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeColor: '#34d399',
    },
  ];

  return (
    <nav
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '4px',
        background: '#141414',
        padding: '3px',
        borderRadius: '10px',
        border: '1px solid #262626',
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
              padding: '8px 4px',
              minHeight: '40px',
              fontSize: '11px',
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? '#ffffff' : '#a3a3a3',
              background: isSelected ? '#262626' : 'transparent',
              border: isSelected ? '1px solid #404040' : '1px solid transparent',
              borderRadius: '7px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.4)' : 'none',
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '9999px',
                background: isSelected ? tab.badgeBg : '#1f1f1f',
                color: isSelected ? tab.badgeColor : '#737373',
                minWidth: '16px',
                textAlign: 'center',
              }}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
