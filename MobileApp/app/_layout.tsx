import 'react-native-reanimated';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';
import { useFonts, IBMPlexSansThai_300Light, IBMPlexSansThai_400Regular, IBMPlexSansThai_500Medium, IBMPlexSansThai_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-thai';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { View, ActivityIndicator, Text, Alert } from 'react-native';

// เพิ่ม IBM Plex Sans Thai เป็น default font ผ่าน Text.defaultProps
// ทำให้ทุกหน้าใช้ font นี้เป็น default โดยไม่ต้องแก้ทีละไฟล์
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = { fontFamily: 'IBMPlexSansThai_400Regular' };

// ── ขอ permission ตั้งแต่แอปเปิดครั้งแรก (ก่อน login) ─────────────────────────
async function requestNotificationPermissionOnStartup() {
  if (!Device.isDevice || Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'undetermined') {
      // ยังไม่เคยถาม — ถามทันที
      await Notifications.requestPermissionsAsync();
    } else if (status === 'denied') {
      // เคยปฏิเสธ — แจ้งให้ไปเปิดใน Settings
      Alert.alert(
        '🔔 เปิดการแจ้งเตือน',
        'เปิดการแจ้งเตือนเพื่อรับข่าวสารจากมหาวิทยาลัย',
        [
          { text: 'ไม่ใช่ตอนนี้', style: 'cancel' },
          { text: 'เปิดการตั้งค่า', onPress: () => Linking.openSettings() },
        ]
      );
    }
    // granted — ไม่ต้องทำอะไร
  } catch {}
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, userProfile, loading } = useAuth();
  const segments = useSegments();

  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansThai_300Light,
    IBMPlexSansThai_400Regular,
    IBMPlexSansThai_500Medium,
    IBMPlexSansThai_600SemiBold,
  });

  // font โหลดเสร็จ หรือ error → ซ่อน splash screen
  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  // ขอ permission ทันทีที่แอปโหลด
  useEffect(() => {
    requestNotificationPermissionOnStartup();
  }, []);

  useEffect(() => {
    if (loading) return;

    const seg0 = segments[0] as string;

    const inAuthGroup       = seg0 === '(tabs)';
    const inProtectedRoutes = ['news'].includes(seg0); // profile/schedule/bookmark/news-list ย้ายเข้า (tabs) แล้ว

    if (!user && (inAuthGroup || inProtectedRoutes)) {
      router.replace('/login');
    } else if (user && userProfile && (seg0 === 'login' || seg0 === 'register')) {
      router.replace('/(tabs)');
    }
    // ถ้ามี user แต่ยังไม่มี profile (กำลัง register) → ไม่ redirect
  }, [user, userProfile, loading, segments]);

  if (loading || (!fontsLoaded && !fontError)) {
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

        {/* news/[id].tsx — ใช้ชื่อ folder/file ตรงๆ */}
        <Stack.Screen name="news/[id]" options={{
          headerShown: true,
          title: 'รายละเอียดข่าว',
          ...greenHeader,
        }} />

        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="light" backgroundColor="#1B8B6A" translucent={false} />
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
