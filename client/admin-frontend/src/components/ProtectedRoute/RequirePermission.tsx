import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store';

interface Props {
  permission: string | null;
  children: React.ReactNode;
}

const RequirePermission: React.FC<Props> = ({ permission, children }) => {
  const { user } = useAppSelector((s) => s.auth);

  // 管理员拥有所有权限
  if (user?.isAdmin) return <>{children}</>;

  if (!permission) return <>{children}</>;

  const perms: string[] = (user as any)?.permissions || [];
  if (perms.includes(permission)) return <>{children}</>;

  // 无权限则重定向到 dashboard 或显示 403
  return <Navigate to="/dashboard" replace />;
};

export default RequirePermission;
