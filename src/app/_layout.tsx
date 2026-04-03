import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { setAuthToken } from '../services/api';

function AuthGuard() {
  const { user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    setAuthToken(user?.token ?? null);

    if (!user && segments[0] !== undefined) {
      router.replace('/');
    } else if (user && segments[0] === undefined) {
      if (user.role === 'caregiver') {
        router.replace('/caregiver');
      } else if (user.role === 'casual') {
        router.replace('/casual');
      } else {
        router.replace('/home');
      }
    }
  }, [user, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <DataProvider>
      <AuthProvider>
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </DataProvider>
  );
}