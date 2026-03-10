import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, TextInput,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';

interface NewsFile { file_name: string; fileURL: string; file_size?: number; mime_type?: string; }
interface NewsItem {
  id: string; title: string; content: string;
  category: string; time: any; group_id?: string;
  files?: NewsFile[];
  author: { admin_name: string; role?: string; };
}

export default function NewsListScreen() {
  const router = useRouter();
  const { userId, userProfile } = useAuth();
  const [news, setNews]         = useState<NewsItem[]>([]);
  const [filtered, setFiltered] = useState<NewsItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => { if (userId) fetchAllNews(); }, [userId]);
  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(!q ? news : news.filter(n =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    ));
  }, [search, news]);

  const fetchAllNews = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'News'), orderBy('time', 'desc')));
      const allNews = snap.docs.map(d => ({ id: d.id, ...d.data() })) as NewsItem[];

      // ดึงกลุ่มที่ user อยู่
      const col = userProfile?.role?.role_id === 'student' ? 'Student' : 'Teacher';
      const userDoc = await getDoc(doc(db, col, userId!));
      const userGroupIds: string[] = userDoc.data()?.group_ids || [];

      // กรองข่าว: แสดงถ้า all / กลุ่มที่ user อยู่ / ส่งตรงถึง user นี้
      const visible = allNews.filter(n => {
        if (!n.group_id || n.group_id === 'all') return true;
        if (n.group_id === `personal_${userId}`) return true;
        if (userGroupIds.includes(n.group_id)) return true;
        return false;
      });

      setNews(visible); setFiltered(visible);
    } catch {}
    finally { setLoading(false); }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const renderItem = ({ item }: { item: NewsItem }) => {
    const hasFiles = item.files && item.files.length > 0;
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/news/${item.id}` as any)} activeOpacity={0.75}>
        <View style={styles.cardTop}>
          <View style={styles.badgeRow}>
            <View style={styles.catBadge}><Text style={styles.catText}>{item.category || 'ทั่วไป'}</Text></View>
            {hasFiles && (
              <View style={styles.fileBadge}>
                <Ionicons name="attach-outline" size={11} color="#92400E" />
                <Text style={styles.fileBadgeText}>{item.files!.length} ไฟล์</Text>
              </View>
            )}
          </View>
          <Text style={styles.dateText}>{formatDate(item.time)}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardContent} numberOfLines={2}>{item.content}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.authorRow}>
            <Ionicons name={item.author?.role === 'teacher' ? 'school-outline' : 'person-circle-outline'} size={15} color="#888" />
            <Text style={styles.authorText}>{item.author?.admin_name || 'Admin'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#1B8B6A" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{
        title: 'ข่าวสารทั้งหมด',
        headerStyle: { backgroundColor: '#1B8B6A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }} />

      <View style={styles.container}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหาข่าวสาร..."
            placeholderTextColor="#bbb"
            value={search} onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#1B8B6A" /></View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="newspaper-outline" size={56} color="#ccc" />
            <Text style={styles.emptyText}>{search ? 'ไม่พบผลการค้นหา' : 'ยังไม่มีข่าวสาร'}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.resultCount}>{filtered.length} ข่าว{search ? 'ที่พบ' : 'ทั้งหมด'}</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#1B8B6A' },
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#999' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 14,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#222' },

  list:        { paddingHorizontal: 16, paddingBottom: 24 },
  resultCount: { fontSize: 13, color: '#888', fontWeight: '500', marginBottom: 12 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 1 },
  catBadge: { backgroundColor: '#E6F4F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catText:  { fontSize: 11, color: '#1B8B6A', fontWeight: '700' },
  fileBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  fileBadgeText: { fontSize: 11, color: '#92400E', fontWeight: '600' },
  dateText:    { fontSize: 11, color: '#bbb', flexShrink: 0 },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 6, lineHeight: 22 },
  cardContent: { fontSize: 13, color: '#777', lineHeight: 19, marginBottom: 12 },
  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F4F4F4' },
  authorRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  authorText:  { fontSize: 12, color: '#888' },
});
