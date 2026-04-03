import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

// Custom Text component ที่ใช้ IBM Plex Sans Thai เป็น default font
// import AppText จาก '@/components/AppText' แทน Text ปกติ

interface AppTextProps extends TextProps {
  weight?: 'light' | 'regular' | 'medium' | 'semi';
}

const fontMap = {
  light:   'IBMPlexSansThai_300Light',
  regular: 'IBMPlexSansThai_400Regular',
  medium:  'IBMPlexSansThai_500Medium',
  semi:    'IBMPlexSansThai_600SemiBold',
} as const;

export default function AppText({ style, weight = 'regular', ...props }: AppTextProps) {
  return (
    <Text
      style={[{ fontFamily: fontMap[weight] }, style]}
      {...props}
    />
  );
}
