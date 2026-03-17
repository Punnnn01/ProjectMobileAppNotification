import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, onSnapshot, collection, query, where, documentId } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';

interface NewsItem { id: string; title: string; content: string; category: string; time: any; }

export default function BookmarkScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, userId, userProfile } = useAuth();
  const [bookmarkedNews, setBookmarkedNews] = useState<NewsItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Realtime: ฟัง document ของ user เพื่อรู้ว่า bookmarks เปลี่ยนไหม
  // แล้วดึงข่าวที่ bookmark ทันที
  useFocusEffect(
    useCallback(() => {
      if (!user || !userId) { setLoading(false); return; }

      const col        = userProfile?.role?.role_id === 'student' ? 'Student' : 'Teacher';
      const userDocRef = doc(db, col, userId);
      let newsUnsub: (() => void) | null = null;

      // onSnapshot user doc — ทุกครั้งที่ bookmarks array เปลี่ยน จะ fetch ข่าวใหม่ทันที
      const userUnsub = onSnapshot(userDocRef, async (snap) => {
        const ids: string[] = snap.data()?.bookmarks || [];

        // cleanup listener เก่าก่อน
        if (newsUnsub) { newsUnsub(); newsUnsub = null; }

        if (!ids.length) {
          setBookmarkedNews([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }

        // ดึงข่าวทั้งหมดที่ bookmark — ทีละ 10 ตาม Firestore limit
        try {
          const chunks: string[][] = [];
          for (let i = 0; i < ids.length; i += 10) {
            chunks.push(ids.slice(i, i + 10));
          }
          const allDocs = (
            await Promise.all(
              chunks.map(chunk =>
                Promise.all(chunk.map(id => getDoc(doc(db, 'News', id))))
              )
            )
          ).flat();

          const data = allDocs
            .filter(d => d.exists())
            .map(d => ({ id: d.id, ...d.data() })) as NewsItem[];

          // เรียงตาม order ของ bookmarks array (ล่าสุดอยู่บน)
          data.sort((a, b) => (b.time?.toMillis?.() || 0) - (a.time?.toMillis?.() || 0));
          setBookmarkedNews(data);
        } catch {}
        finally {
          setLoading(false);
          setRefreshing(false);
        }
      }, () => { setLoading(false); setRefreshing(false); });

      return () => {
        userUnsub();
        if (newsUnsub) newsUnsub();
      };
    }, [user, userId, userProfile])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    // onSnapshot จะ trigger เองอยู่แล้ว แค่ set refreshing ให้ indicator ขึ้น
    // แล้วจะ reset ใน callback ของ onSnapshot
  };

  const formatDate = (ts: any) => {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return ''; }
  };

  const renderItem = ({ item }: { item: NewsItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/news/${item.id}` as any)} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <View style={styles.catBadge}><Text style={styles.catText}>{item.category || 'ทั่วไป'}</Text></View>
        <Ionicons name="bookmark" size={18} color="#1B8B6A" />
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.cardContent} numberOfLines={2}>{item.content}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={13} color="#bbb" />
          <Text style={styles.dateText}>{formatDate(item.time)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#1B8B6A" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.safe, { paddingBottom: insets.bottom }]}>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#1B8B6A" />
          </View>
        ) : bookmarkedNews.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bookmark-outline" size={48} color="#1B8B6A" />
            </View>
            <Text style={styles.emptyTitle}>ยังไม่มีข่าวที่บันทึก</Text>
            <Text style={styles.emptySub}>กดไอคอนบุ๊กมาร์กในหน้าข่าว{'\n'}เพื่อบันทึกข่าวที่สนใจ</Text>
          </View>
        ) : (
          <FlatList
            data={bookmarkedNews}
            renderItem={renderItem}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#1B8B6A']}
              />
            }
            ListHeaderComponent={
              <Text style={styles.resultCount}>{bookmarkedNews.length} ข่าวที่บันทึก</Text>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#1B8B6A' },
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E6F4F0', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle:{ fontSize: 18, fontWeight: '700', color: '#222' },
  emptySub:  { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 22 },

  list:        { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  resultCount: { fontSize: 13, color: '#888', fontWeight: '500', marginBottom: 12 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catBadge:    { backgroundColor: '#E6F4F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catText:     { fontSize: 11, color: '#1B8B6A', fontWeight: '700' },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 6, lineHeight: 22 },
  cardContent: { fontSize: 13, color: '#777', lineHeight: 19, marginBottom: 12 },
  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F4F4F4' },
  dateRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText:    { fontSize: 12, color: '#bbb' },
});
