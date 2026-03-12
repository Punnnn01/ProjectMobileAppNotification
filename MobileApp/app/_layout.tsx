import 'react-native-reanimated';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { View, ActivityIndicator, Text } from 'react-native';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, userProfile, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const seg0 = segments[0] as string;

    const inAuthGroup     = seg0 === '(tabs)';
    const inProtectedRoutes = ['profile', 'schedule', 'bookmark', 'news-list', 'news'].includes(seg0);

    if (!user && (inAuthGroup || inProtectedRoutes)) {
      router.replace('/login');
    } else if (user && userProfile && (seg0 === 'login' || seg0 === 'register')) {
      router.replace('/(tabs)');
    }
    // ถ้ามี user แต่ยังไม่มี profile (กำลัง register) → ไม่ redirect
  }, [user, userProfile, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1B8B6A" />
        <Text style={{ marginTop: 10, color: '#666' }}>กำลังโหลด...</Text>
      </View>
    );
  }

  const greenHeader = {
    headerStyle: { backgroundColor: '#1B8B6A' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '700' as const },
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login"    options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"   options={{ headerShown: false }} />

        <Stack.Screen name="profile" options={{
          headerShown: true,
          title: 'โปรไฟล์',
          ...greenHeader,
        }} />

        <Stack.Screen name="schedule" options={{
          headerShown: true,
          title: 'ตารางเรียน',
          ...greenHeader,
        }} />

        <Stack.Screen name="bookmark" options={{
          headerShown: true,
          title: 'ข่าวที่บันทึก',
          ...greenHeader,
        }} />

        <Stack.Screen name="news-list" options={{
          headerShown: true,
          title: 'ข่าวสารทั้งหมด',
          ...greenHeader,
        }} />

        {/* news/[id].tsx — ใช้ชื่อ folder/file ตรงๆ */}
        <Stack.Screen name="news/[id]" options={{
          headerShown: true,
          title: 'รายละเอียดข่าว',
          ...greenHeader,
        }} />

        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="light" translucent={false} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RootLayoutNav />
      </NotificationProvider>
    </AuthProvider>
  );
}
