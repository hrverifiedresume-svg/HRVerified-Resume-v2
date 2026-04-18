import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const { accessToken, refreshToken, userId, isNewUser } = router.query;

    if (accessToken) {
      // Store tokens
      localStorage.setItem('accessToken', accessToken as string);
      localStorage.setItem('refreshToken', refreshToken as string);

      // Redirect based on whether user is new
      if (isNewUser === 'true') {
        router.push('/auth/profile-setup');
      } else {
        router.push('/dashboard');
      }
    } else {
      // Redirect to login if no token
      router.push('/login');
    }
  }, [router]);

  return <div>Processing authentication...</div>;
}
