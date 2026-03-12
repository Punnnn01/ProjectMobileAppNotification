import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, TouchableOpacity,
  StyleSheet, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';

interface NewsFile { file_name: string; fileURL: string; file_size?: number; mime_type?: string; }
interface NewsLink { label: string; url: string; }
interface NewsData {
  news_id: string; title: string; content: string;
  category: string; time: any; group_id?: string;
  files?: NewsFile[];
  links?: NewsLink[];
  author: { admin_id: string; admin_name: string; role?: string; };
}

export default function NewsDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, userId, userProfile } = useAuth();
  const [news, setNews] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);


  useEffect(() => { if (id) fetchNews(); else setLoading(false); }, [id]);

  const fetchNews = async () => {
    try {
      const snap = await getDoc(doc(db, 'News', id));
      if (!snap.exists()) { Alert.alert('ข้อผิดพลาด', 'ไม่พบข่าวนี้'); router.back(); return; }
      setNews(snap.data() as NewsData);
      if (user && userId) await checkBookmark();
    } catch (e: any) { Alert.alert('ข้อผิดพลาด', e.message); }
    finally { setLoading(false); }
  };

  const checkBookmark = async () => {
    if (!user || !userId) return;
    const col = userProfile?.role?.role_id === 'student' ? 'Student' : 'Teacher';
    const snap = await getDoc(doc(db, col, userId));
    if (snap.exists()) setIsBookmarked((snap.data()?.bookmarks || []).includes(id));
  };

  const toggleBookmark = async () => {
    if (!user || !userId) { Alert.alert('กรุณาเข้าสู่ระบบ', 'ต้องเข้าสู่ระบบก่อนบันทึกข่าว'); return; }
    setBookmarking(true);
    try {
      const col = userProfile?.role?.role_id === 'student' ? 'Student' : 'Teacher';
      const ref = doc(db, col, userId);
      if (isBookmarked) {
        await updateDoc(ref, { bookmarks: arrayRemove(id) });
        setIsBookmarked(false);
      } else {
        await updateDoc(ref, { bookmarks: arrayUnion(id) });
        setIsBookmarked(true);
      }
    } catch (e: any) {
      if (e.code === 'not-found') {
        const col = userProfile?.role?.role_id === 'student' ? 'Student' : 'Teacher';
        await setDoc(doc(db, col, userId), { bookmarks: [id] }, { merge: true });
        setIsBookmarked(true);
      }
    } finally { setBookmarking(false); }
  };

  // เปิดไฟล์ — รูปภาพเปิดตรง, เอกสารผ่าน Google Docs Viewer
  const handleOpenFile = async (file: NewsFile) => {
    try {
      const mime = file.mime_type || '';
      const name = (file.file_name || '').toLowerCase();
      const isImage = mime.startsWith('image/');

      let targetUrl: string;
      if (isImage) {
        // รูปภาพ: เปิด URL ตรงๆ
        targetUrl = file.fileURL;
      } else {
        // PDF / Word / Excel / PPT: ใช้ Google Docs Viewer
        // ต้องใช้ URL ที่ไม่มี fl_attachment เพื่อให้ viewer โหลดได้
        const cleanUrl = file.fileURL
          .replace('/upload/fl_attachment/', '/upload/')
          .replace('/upload/fl_attachment,', '/upload/');
        targetUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(cleanUrl)}&embedded=false`;
      }

      await Linking.openURL(targetUrl);
    } catch {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเปิดไฟล์ได้');
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return 'ไม่ทราบวันที่';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'ไม่ทราบวันที่'; }
  };

  const getFileIcon = (mime?: string, name?: string): any => {
    const m = mime || '', n = (name || '').toLowerCase();
    if (m.startsWith('image/')) return 'image-outline';
    if (m === 'application/pdf' || n.endsWith('.pdf')) return 'document-text-outline';
    if (m.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return 'document-outline';
    if (m.includes('excel') || n.endsWith('.xls') || n.endsWith('.xlsx')) return 'grid-outline';
    if (m.includes('powerpoint') || n.endsWith('.ppt') || n.endsWith('.pptx')) return 'easel-outline';
    return 'attach-outline';
  };

  const getFileColor = (mime?: string, name?: string) => {
    const m = mime || '', n = (name || '').toLowerCase();
    if (m.startsWith('image/')) return { bg: '#FFF0F6', icon: '#E91E8C' };
    if (m === 'application/pdf' || n.endsWith('.pdf')) return { bg: '#FFF1F0', icon: '#E53935' };
    if (m.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return { bg: '#E8F0FE', icon: '#1A73E8' };
    if (m.includes('excel') || n.endsWith('.xls') || n.endsWith('.xlsx')) return { bg: '#E8F5E9', icon: '#34A853' };
    if (m.includes('powerpoint') || n.endsWith('.ppt') || n.endsWith('.pptx')) return { bg: '#FFF3E0', icon: '#F57C00' };
    return { bg: '#E6F4F0', icon: '#1B8B6A' };
  };

  const fmtSize = (b?: number) => {
    if (!b) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  };

  if (loading) return (
    <View style={styles.safe}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1B8B6A" />
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      </View>
    </View>
  );

  if (!news) return (
    <View style={styles.safe}>
      <View style={styles.centered}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#999" />
        </View>
        <Text style={styles.errorText}>ไม่พบข่าวนี้</Text>
        <TouchableOpacity style={styles.backPill} onPress={() => router.back()}>
          <Text style={styles.backPillText}>← กลับ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const hasFiles = news.files && news.files.length > 0;
  const hasLinks = news.links && news.links.length > 0;
  const isGroupNews = news.group_id && news.group_id !== 'all';

  return (
    <View style={[styles.safe, { paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{
        title: 'รายละเอียดข่าว',
        headerStyle: { backgroundColor: '#1B8B6A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <TouchableOpacity onPress={toggleBookmark} disabled={bookmarking} style={{ marginRight: 8 }}>
            {bookmarking
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color="#fff" />
            }
          </TouchableOpacity>
        ),
      }} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ═══ HERO ═══ */}
        <View style={styles.heroCard}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.catBadge}>
              <Text style={styles.catText}>{news.category || 'ทั่วไป'}</Text>
            </View>
            <View style={[styles.audBadge, isGroupNews ? styles.groupBadge : styles.allBadge]}>
              <Ionicons name={isGroupNews ? 'people' : 'megaphone'} size={11} color={isGroupNews ? '#6D28D9' : '#059669'} />
              <Text style={[styles.audText, { color: isGroupNews ? '#6D28D9' : '#059669' }]}>
                {isGroupNews ? 'กลุ่มเฉพาะ' : 'ทุกคน'}
              </Text>
            </View>
            {hasFiles && (
              <View style={styles.attBadge}>
                <Ionicons name="attach" size={11} color="#92400E" />
                <Text style={styles.attText}>{news.files!.length} ไฟล์</Text>
              </View>
            )}
          </View>

          <Text style={styles.heroTitle}>{news.title}</Text>

          {/* Meta strip */}
          <View style={styles.metaStrip}>
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={14} color="#1B8B6A" />
              <Text style={styles.metaChipText}>{formatDate(news.time)}</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaChip}>
              <Ionicons name="person-circle-outline" size={15} color="#1B8B6A" />
              <Text style={styles.metaChipText}>{news.author?.admin_name || 'Admin'}</Text>
            </View>
          </View>
        </View>

        {/* ═══ CONTENT ═══ */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionLabel}>เนื้อหา</Text>
          </View>
          <Text style={styles.bodyText}>{news.content}</Text>
        </View>

        {/* ═══ LINKS ═══ */}
        {hasLinks && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionLabel}>🔗 ลิงก์แนบ</Text>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{news.links!.length}</Text>
              </View>
            </View>
            {news.links!.map((link, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.linkRow, i < news.links!.length - 1 && styles.linkRowBorder]}
                onPress={() => Linking.openURL(link.url).catch(() => Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเปิดลิงก์นี้ได้'))}
                activeOpacity={0.75}
              >
                <View style={styles.linkIconBox}>
                  <Ionicons name="link-outline" size={20} color="#1B8B6A" />
                </View>
                <View style={styles.linkInfo}>
                  <Text style={styles.linkLabel} numberOfLines={1}>{link.label}</Text>
                  <Text style={styles.linkUrl} numberOfLines={1}>{link.url}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={16} color="#aaa" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ═══ FILES ═══ */}
        {hasFiles && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionLabel}>ไฟล์แนบ</Text>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{news.files!.length}</Text>
              </View>
            </View>

            {news.files!.map((file, i) => {
              const fc = getFileColor(file.mime_type, file.file_name);
              return (
                <View key={i} style={[styles.fileRow, i < news.files!.length - 1 && styles.fileRowBorder]}>
                  {/* Icon */}
                  <View style={[styles.fileIconBox, { backgroundColor: fc.bg }]}>
                    <Ionicons name={getFileIcon(file.mime_type, file.file_name)} size={22} color={fc.icon} />
                  </View>

                  {/* Name + size */}
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={2}>{file.file_name}</Text>
                    {file.file_size ? <Text style={styles.fileSize}>{fmtSize(file.file_size)}</Text> : null}
                  </View>

                  {/* Action — เปิดไฟล์ */}
                  <TouchableOpacity
                    style={styles.fileOpenBtn}
                    onPress={() => handleOpenFile(file)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="open-outline" size={16} color="#fff" />
                    <Text style={styles.fileOpenBtnText}>เปิด</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* ═══ BOOKMARK ═══ */}
        <View style={styles.bookmarkWrap}>
          <TouchableOpacity
            style={[styles.bookmarkBtn, isBookmarked && styles.bookmarkBtnOn]}
            onPress={toggleBookmark}
            disabled={bookmarking}
            activeOpacity={0.85}
          >
            {bookmarking
              ? <ActivityIndicator size="small" color={isBookmarked ? '#fff' : '#1B8B6A'} />
              : <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={isBookmarked ? '#fff' : '#1B8B6A'} />
            }
            <Text style={[styles.bookmarkBtnText, isBookmarked && { color: '#fff' }]}>
              {bookmarking ? 'กำลังบันทึก...' : isBookmarked ? 'บันทึกแล้ว ✓' : 'บันทึกข่าวนี้'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#F2F4F7' },
  scroll:  { flex: 1 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: '#F2F4F7' },
  loadingText: { fontSize: 14, color: '#aaa' },
  errorIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  errorText:     { fontSize: 16, color: '#888', fontWeight: '600' },
  backPill:      { backgroundColor: '#1B8B6A', paddingHorizontal: 24, paddingVertical: 11, borderRadius: 24 },
  backPillText:  { color: '#fff', fontWeight: '700' },

  // hero
  heroCard: {
    backgroundColor: '#fff', padding: 20, marginBottom: 10,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  catBadge: { backgroundColor: '#E6F4F0', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  catText:  { fontSize: 12, color: '#1B8B6A', fontWeight: '700' },
  audBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  groupBadge: { backgroundColor: '#EDE9FE' },
  allBadge:   { backgroundColor: '#ECFDF5' },
  audText:    { fontSize: 12, fontWeight: '600' },
  attBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  attText:    { fontSize: 12, color: '#92400E', fontWeight: '600' },

  heroTitle: {
    fontSize: 21, fontWeight: '800', color: '#0F172A',
    lineHeight: 30, letterSpacing: -0.3, marginBottom: 16,
  },

  metaStrip: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  metaChip:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaChipText: { fontSize: 12, color: '#555', fontWeight: '500' },
  metaDot:   { width: 4, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' },

  // sections
  section: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10,
    borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionBar:  { width: 4, height: 18, borderRadius: 2, backgroundColor: '#1B8B6A' },
  sectionLabel:{ fontSize: 14, fontWeight: '700', color: '#0F172A', flex: 1 },
  countPill:   { backgroundColor: '#1B8B6A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  countText:   { color: '#fff', fontSize: 11, fontWeight: '700' },

  bodyText: { fontSize: 15, color: '#374151', lineHeight: 27, letterSpacing: 0.1 },

  // files
  fileRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12,
  },
  fileRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  fileIconBox: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  fileInfo:    { flex: 1 },
  fileName:    { fontSize: 13, fontWeight: '600', color: '#111', lineHeight: 18, marginBottom: 2 },
  fileSize:    { fontSize: 11, color: '#bbb' },
  fileOpenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0,
    backgroundColor: '#1B8B6A', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10,
  },
  fileOpenBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // links
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  linkRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  linkIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E6F4F0', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  linkInfo: { flex: 1 },
  linkLabel: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 2 },
  linkUrl: { fontSize: 11, color: '#1B8B6A' },

  // bookmark
  bookmarkWrap: { paddingHorizontal: 20, paddingTop: 4 },
  bookmarkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 14,
    borderWidth: 2, borderColor: '#1B8B6A', backgroundColor: '#fff',
    shadowColor: '#1B8B6A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 5, elevation: 3,
  },
  bookmarkBtnOn:   { backgroundColor: '#1B8B6A', borderColor: '#1B8B6A' },
  bookmarkBtnText: { fontSize: 15, fontWeight: '700', color: '#1B8B6A' },
});
