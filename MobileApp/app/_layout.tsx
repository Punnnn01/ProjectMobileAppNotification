import 'react-native-reanimated';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, userProfile, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    console.log('Navigation check - User:', user?.email, 'Profile:', userProfile?.personal_info?.firstName, 'Segment:', segments[0]);

    const inAuthGroup = segments[0] === '(tabs)';
    const inProtectedRoutes = ['profile', 'schedule', 'bookmark'].includes(segments[0] as string);

    // ถ้าไม่มี user และพยายามเข้าหน้าที่ต้อง login → redirect ไป login
    if (!user && (inAuthGroup || inProtectedRoutes)) {
      console.log('No user, redirecting to login');
      router.replace('/login');
    } 
    // ถ้ามี user และมี profile และอยู่หน้า login/register → redirect ไป home
    else if (user && userProfile && (segments[0] === 'login' || segments[0] === 'register')) {
      console.log('User authenticated with profile, redirecting to home');
      router.replace('/(tabs)');
    }
    // ถ้ามี user แต่ไม่มี profile (กำลัง register) → ไม่ redirect
    else if (user && !userProfile && (segments[0] === 'login' || segments[0] === 'register')) {
      console.log('User exists but no profile yet, staying on current page');
      // ไม่ทำอะไร - อยู่หน้าเดิม
    }
  }, [user, userProfile, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1B8B6A" />
        <Text style={{ marginTop: 10, color: '#666' }}>กำลังโหลด...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="schedule" options={{ headerShown: false }} />
        <Stack.Screen name="bookmark" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
