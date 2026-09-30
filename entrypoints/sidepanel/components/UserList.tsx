import React from 'react';
import { SocialUser } from '../../../src/domain/entities';
import { UserCard } from './UserCard';

interface UserListProps {
  users: ReadonlyArray<SocialUser>;
  emptyMessage: string;
}

export const UserList: React.FC<UserListProps> = ({ users, emptyMessage }) => {
  if (users.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 16px',
          color: '#737373',
          fontSize: '12px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>✨</div>
        <div>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};
