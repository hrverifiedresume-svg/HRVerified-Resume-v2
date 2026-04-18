import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const AuthGuard = ({ children, redirectTo = '/login' }: AuthGuardProps) => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    router.push(redirectTo);
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
