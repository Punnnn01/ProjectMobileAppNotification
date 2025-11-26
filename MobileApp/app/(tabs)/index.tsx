// UPDATED: 2024-11-26 Menu icons changed to solid green circles
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Ionicons } from '@expo/vector-icons';

interface NewsItem {
  id: string;
  title: string;
  content?: string;
}

// Cache สำหรับเก็บข่าว
let newsCache: NewsItem[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 นาที

export default function HomeScreen() {
  const { userProfile, logout } = useAuth();
  const [news, setNews] = useState<NewsItem[]>(newsCache || []);
  const [loading, setLoading] = useState(!newsCache);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const firstName = useMemo(() => {
    return userProfile?.personal_info?.firstName || 'User';
  }, [userProfile]);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = useCallback(async () => {
    const now = Date.now();
    if (newsCache && (now - lastFetchTime) < CACHE_DURATION) {
      setNews(newsCache);
      setLoading(false);
      return;
    }

    try {
      const newsRef = collection(db, 'News');
      const q = query(newsRef, limit(10));
      const snapshot = await getDocs(q);
      
      const allNews = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || 'ไม่มีชื่อ',
        content: doc.data().content || ''
      }));

      const shuffled = allNews.sort(() => 0.5 - Math.random());
      const randomNews = shuffled.slice(0, 5);
      
      newsCache = randomNews;
      lastFetchTime = now;
      
      setNews(randomNews);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogoutPress = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      alert('ไม่สามารถออกจากระบบได้');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleNewsDetail = useCallback((newsId: string) => {
    console.log('View news:', newsId);
  }, []);

  const navigateTo = useCallback((path: string) => {
    router.push(path as any);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerName}>{firstName}</Text>
        <TouchableOpacity 
          onPress={handleLogoutPress} 
          style={styles.logoutIconButton}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        <MenuButton 
          icon="person-outline" 
          label="Profile" 
          onPress={() => navigateTo('/profile')} 
        />
        <MenuButton 
          icon="calendar-outline" 
          label="Schedule" 
          onPress={() => navigateTo('/schedule')} 
        />
        <MenuButton 
          icon="bookmark-outline" 
          label="Bookmark" 
          onPress={() => navigateTo('/bookmark')} 
        />
      </View>

      <View style={styles.newsSection}>
        <View style={styles.newsHeader}>
          <Text style={styles.newsHeaderText}>ข่าวที่แนะนำ</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#1B8B6A" style={{ marginTop: 20 }} />
        ) : (
          <ScrollView style={styles.newsList} showsVerticalScrollIndicator={false}>
            {news.length > 0 ? (
              news.map((item) => (
                <NewsItemRow 
                  key={item.id} 
                  item={item} 
                  onPress={handleNewsDetail} 
                />
              ))
            ) : (
              <Text style={styles.noNews}>ยังไม่มีข่าวสาร</Text>
            )}
          </ScrollView>
        )}
      </View>

      <TouchableOpacity style={styles.chatButton}>
        <Ionicons name="chatbubble-outline" size={28} color="#333" />
      </TouchableOpacity>

      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={50} color="#e74c3c" />
            </View>
            
            <Text style={styles.modalTitle}>ออกจากระบบ</Text>
            <Text style={styles.modalMessage}>
              คุณต้องการออกจากระบบใช่หรือไม่?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelLogout}
                disabled={isLoggingOut}
              >
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>ออกจากระบบ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// UPDATED: Icon color changed to white
const MenuButton = React.memo(({ 
  icon, 
  label, 
  onPress 
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuIcon}>
      <Ionicons name={icon} size={28} color="#fff" />
    </View>
    <Text style={styles.menuText}>{label}</Text>
  </TouchableOpacity>
));

const NewsItemRow = React.memo(({ 
  item, 
  onPress 
}: { 
  item: NewsItem; 
  onPress: (id: string) => void;
}) => (
  <View style={styles.newsItem}>
    <Text style={styles.newsTitle} numberOfLines={1}>{item.title}</Text>
    <TouchableOpacity 
      style={styles.detailButton}
      onPress={() => onPress(item.id)}
    >
      <Text style={styles.detailButtonText}>รายละเอียด</Text>
    </TouchableOpacity>
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#1B8B6A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  headerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutIconButton: {
    padding: 8,
    borderRadius: 20,
  },
  menuContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 40,
  },
  menuItem: {
    alignItems: 'center',
  },
  // UPDATED: Solid green circle instead of border
  menuIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1B8B6A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuText: {
    fontSize: 14,
    color: '#333',
  },
  newsSection: {
    flex: 1,
    paddingHorizontal: 15,
  },
  newsHeader: {
    backgroundColor: '#1B8B6A',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  newsHeaderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  newsList: {
    flex: 1,
  },
  newsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  newsTitle: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  detailButton: {
    backgroundColor: '#1B8B6A',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  detailButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  noNews: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
  },
  chatButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffe5e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#e74c3c',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
