// UPDATED: Mobile-optimized UI
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const CHATBOT_URL = 'https://alluring-stillness-production.up.railway.app/chat';

const QUICK_REPLIES = [
  { label: "ค่าเทอม", text: "ค่าเทอมเท่าไหร่?" },
  { label: "หลักสูตร", text: "อยากดูหลักสูตรรายวิชา" },
  { label: "ติดต่อ", text: "ติดต่อสำนักงานได้ที่ไหน?" },
  { label: "ปี 1", text: "วิชาเรียนปี 1 มีอะไรบ้าง?" },
  { label: "ปี 2", text: "วิชาเรียนปี 2 มีอะไรบ้าง?" },
  { label: "ปี 3", text: "วิชาเรียนปี 3 มีอะไรบ้าง?" },
];

const WELCOME_MSG =
  "สวัสดีครับ! พี่บอทยินดีต้อนรับ 😊\nอยากทราบข้อมูลเรื่องอะไรดีครับ?";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
}
interface ApiHistory {
  role: "user" | "model";
  parts: { text: string }[];
}
interface NewsItem {
  id: string;
  title: string;
  content?: string;
  time?: any;
}

export default function HomeScreen() {
  const { user, userId, userProfile, logout } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [apiHistory, setApiHistory] = useState<ApiHistory[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const firstName = useMemo(
    () => userProfile?.personal_info?.firstName || "User",
    [userProfile],
  );

  useEffect(() => {
    if (userId) fetchNews();
  }, [userId]);
  useEffect(() => {
    if (user && userId) loadBookmarks();
  }, [user, userId]);

  const loadBookmarks = async () => {
    try {
      const col =
        userProfile?.role?.role_id === "student" ? "Student" : "Teacher";
      const snap = await getDoc(doc(db, col, userId!));
      if (snap.exists()) setBookmarks(snap.data()?.bookmarks || []);
    } catch {}
  };

  const fetchNews = useCallback(async () => {
    if (!userId) return;
    try {
      const q = query(collection(db, "News"), orderBy("time", "desc"));
      const snap = await getDocs(q);
      const allNews = snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title || "ไม่มีชื่อ",
        content: d.data().content || "",
        time: d.data().time,
        group_id: d.data().group_id || 'all',
      }));

      // ดึงกลุ่มของ user
      const col = userProfile?.role?.role_id === "student" ? "Student" : "Teacher";
      const userDoc = await getDoc(doc(db, col, userId));
      const userGroupIds: string[] = userDoc.data()?.group_ids || [];

      const visible = allNews.filter((n) => {
        if (!n.group_id || n.group_id === 'all') return true;
        if (n.group_id === `personal_${userId}`) return true;
        if (userGroupIds.includes(n.group_id)) return true;
        return false;
      }).slice(0, 5);

      setNews(visible);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [userId, userProfile]);

  const toggleBookmark = async (newsId: string, current: boolean) => {
    if (!user || !userId) {
      Alert.alert("กรุณา Login", "กรุณา Login เพื่อบันทึกข่าว");
      return;
    }
    try {
      const col =
        userProfile?.role?.role_id === "student" ? "Student" : "Teacher";
      const ref = doc(db, col, userId);
      if (current) {
        await updateDoc(ref, { bookmarks: arrayRemove(newsId) });
        setBookmarks((prev) => prev.filter((id) => id !== newsId));
      } else {
        await updateDoc(ref, { bookmarks: arrayUnion(newsId) });
        setBookmarks((prev) => [...prev, newsId]);
      }
    } catch {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถบันทึกข่าวได้");
    }
  };

  const msgCollection = useCallback(
    () => collection(db, "Chatbot_Message_History", userId!, "messages"),
    [userId],
  );

  const loadChatHistory = useCallback(async () => {
    if (!userId) return;
    setChatLoading(true);
    try {
      const snap = await getDocs(
        query(msgCollection(), orderBy("timestamp", "asc"), limit(100)),
      );
      if (snap.empty) {
        setChatMessages([{ role: "bot", text: WELCOME_MSG }]);
        setApiHistory([]);
      } else {
        const msgs: ChatMessage[] = [];
        const hist: ApiHistory[] = [];
        snap.docs.forEach((d) => {
          const { role, text } = d.data();
          msgs.push({ role, text });
          hist.push({
            role: role === "user" ? "user" : "model",
            parts: [{ text }],
          });
        });
        setChatMessages(msgs);
        setApiHistory(hist);
      }
    } catch {
      setChatMessages([{ role: "bot", text: WELCOME_MSG }]);
    } finally {
      setChatLoading(false);
      setTimeout(
        () => scrollRef.current?.scrollToEnd({ animated: false }),
        150,
      );
    }
  }, [userId, msgCollection]);

  const saveChatMessage = useCallback(
    async (role: "user" | "bot", text: string) => {
      if (!userId) return;
      try {
        await addDoc(msgCollection(), {
          role,
          text,
          timestamp: serverTimestamp(),
        });
      } catch {}
    },
    [userId, msgCollection],
  );

  const clearChatHistory = useCallback(() => {
    const doDelete = async () => {
      if (!userId) return;
      try {
        const snap = await getDocs(msgCollection());
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      } catch {}
      setChatMessages([{ role: "bot", text: WELCOME_MSG }]);
      setApiHistory([]);
    };

    if (Platform.OS === "web") {
      // Web: ใช้ window.confirm เพราะ Alert.alert ไม่ทำงานบน browser
      if (window.confirm("ต้องการล้างประวัติการสนทนาทั้งหมดใช่ไหม?")) {
        doDelete();
      }
    } else {
      Alert.alert("ล้างประวัติ", "ต้องการล้างประวัติการสนทนาทั้งหมดใช่ไหม?", [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ล้าง", style: "destructive", onPress: doDelete },
      ]);
    }
  }, [userId, msgCollection]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isBotTyping) return;
      setChatInput("");
      setChatMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setIsBotTyping(true);
      saveChatMessage("user", trimmed);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      try {
        const res = await fetch(CHATBOT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed, history: apiHistory }),
        });
        if (!res.ok) throw new Error();
        const { message } = await res.json();
        const botText = message || "ขออภัย ไม่สามารถตอบได้ในขณะนี้ครับ";
        setChatMessages((prev) => [...prev, { role: "bot", text: botText }]);
        setApiHistory((prev) => [
          ...prev,
          { role: "user", parts: [{ text: trimmed }] },
          { role: "model", parts: [{ text: botText }] },
        ]);
        saveChatMessage("bot", botText);
      } catch {
        setChatMessages((prev) => [
          ...prev,
          { role: "bot", text: "ติดต่อ Server ไม่ได้ กรุณาลองใหม่ครับ" },
        ]);
      } finally {
        setIsBotTyping(false);
        setTimeout(
          () => scrollRef.current?.scrollToEnd({ animated: true }),
          100,
        );
      }
    },
    [isBotTyping, apiHistory, saveChatMessage],
  );

  const handleOpenChat = () => {
    setShowChatModal(true);
    loadChatHistory();
  };
  const handleCloseChat = () => setShowChatModal(false);
  const handleLogoutPress = () => setShowLogoutModal(true);
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      router.replace("/login");
    } catch {
      alert("ไม่สามารถออกจากระบบได้");
    } finally {
      setIsLoggingOut(false);
    }
  };
  const handleNewsDetail = useCallback(
    (id: string) => router.push(`/news/${id}` as any),
    [],
  );
  const handleViewAllNews = useCallback(
    () => router.push("/news-list" as any),
    [],
  );
  const navigateTo = useCallback(
    (path: string) => router.push(path as any),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>ยินดีต้อนรับ</Text>
            <Text style={styles.headerName}>{firstName}</Text>
          </View>
          <TouchableOpacity
            onPress={handleLogoutPress}
            style={styles.logoutBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Menu Card */}
        <View style={styles.menuCard}>
          <MenuButton
            icon="person-outline"
            label="โปรไฟล์"
            onPress={() => navigateTo("/profile")}
          />
          <MenuButton
            icon="calendar-outline"
            label="ตารางเรียน"
            onPress={() => navigateTo("/schedule")}
          />
          <MenuButton
            icon="bookmark-outline"
            label="บันทึก"
            onPress={() => navigateTo("/bookmark")}
          />
        </View>

        {/* News Card */}
        <View style={styles.newsCard}>
          <View style={styles.newsSectionHeader}>
            <View style={styles.newsTitleRow}>
              <View style={styles.newsTitleBar} />
              <Text style={styles.newsSectionTitle}>ข่าวล่าสุด</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handleViewAllNews}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>ดูทั้งหมด</Text>
              <Ionicons name="chevron-forward" size={14} color="#1B8B6A" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color="#1B8B6A" />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {news.length > 0 ? (
                news.map((item) => (
                  <NewsItemRow
                    key={item.id}
                    item={item}
                    isBookmarked={bookmarks.includes(item.id)}
                    onPress={handleNewsDetail}
                    onToggleBookmark={toggleBookmark}
                  />
                ))
              ) : (
                <View style={styles.centered}>
                  <Ionicons name="newspaper-outline" size={36} color="#ccc" />
                  <Text style={styles.noNews}>ยังไม่มีข่าวสาร</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Chat FAB */}
        <TouchableOpacity
          style={styles.chatFab}
          onPress={handleOpenChat}
          activeOpacity={0.85}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={26}
            color="#1B8B6A"
          />
        </TouchableOpacity>

        {/* Chatbot Modal */}
        <Modal
          visible={showChatModal}
          transparent
          animationType="slide"
          onRequestClose={handleCloseChat}
        >
          <View style={styles.chatModalOverlay}>
            <TouchableOpacity
              style={styles.chatBackdrop}
              onPress={handleCloseChat}
              activeOpacity={1}
            />
            <KeyboardAvoidingView
              style={{ maxHeight: SCREEN_HEIGHT * 0.82 }}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={styles.chatSheet}>
                <View style={styles.dragHandle} />

                <View style={styles.chatHeader}>
                  <View style={styles.chatHeaderLeft}>
                    <View style={styles.chatAvatar}>
                      <Ionicons
                        name="chatbubbles-outline"
                        size={20}
                        color="#fff"
                      />
                    </View>
                    <View>
                      <Text style={styles.chatHeaderTitle}>พี่บอทแนะแนว</Text>
                      <View style={styles.onlineRow}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.chatHeaderSub}>
                          วิศวกรรมคอมพิวเตอร์
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.chatHeaderActions}>
                    <TouchableOpacity
                      onPress={clearChatHistory}
                      style={styles.chatIconBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={19}
                        color="rgba(255,255,255,0.85)"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleCloseChat}
                      style={styles.chatIconBtn}
                    >
                      <Ionicons name="close" size={21} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView
                  ref={scrollRef}
                  style={styles.msgList}
                  contentContainerStyle={styles.msgListContent}
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() =>
                    scrollRef.current?.scrollToEnd({ animated: true })
                  }
                >
                  {chatLoading ? (
                    <View style={styles.centered}>
                      <ActivityIndicator size="small" color="#1B8B6A" />
                      <Text style={styles.loadingText}>
                        กำลังโหลดประวัติ...
                      </Text>
                    </View>
                  ) : (
                    <>
                      {chatMessages.map((msg, i) => (
                        <View
                          key={i}
                          style={[
                            styles.bubbleWrap,
                            msg.role === "user"
                              ? styles.bubbleRight
                              : styles.bubbleLeft,
                          ]}
                        >
                          {msg.role === "bot" && (
                            <View style={styles.botAvatar}>
                              <Ionicons
                                name="chatbubbles-outline"
                                size={11}
                                color="#fff"
                              />
                            </View>
                          )}
                          <View
                            style={[
                              styles.bubble,
                              msg.role === "user"
                                ? styles.userBubble
                                : styles.botBubble,
                            ]}
                          >
                            <Text
                              style={[
                                styles.bubbleText,
                                msg.role === "user"
                                  ? styles.userText
                                  : styles.botText,
                              ]}
                            >
                              {msg.text}
                            </Text>
                          </View>
                        </View>
                      ))}
                      {isBotTyping && (
                        <View style={[styles.bubbleWrap, styles.bubbleLeft]}>
                          <View style={styles.botAvatar}>
                            <Ionicons
                              name="chatbubbles-outline"
                              size={11}
                              color="#fff"
                            />
                          </View>
                          <View style={[styles.bubble, styles.botBubble]}>
                            <Text style={styles.typingDots}>● ● ●</Text>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.quickScroll}
                  contentContainerStyle={styles.quickContent}
                >
                  {QUICK_REPLIES.map((qr, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.quickBtn,
                        isBotTyping && { opacity: 0.45 },
                      ]}
                      onPress={() => sendMessage(qr.text)}
                      disabled={isBotTyping}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickText}>{qr.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="พิมพ์ข้อความ..."
                    placeholderTextColor="#aaa"
                    multiline
                    maxLength={500}
                    returnKeyType="send"
                    blurOnSubmit={false}
                    onSubmitEditing={() => sendMessage(chatInput)}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendBtn,
                      (!chatInput.trim() || isBotTyping) && styles.sendBtnOff,
                    ]}
                    onPress={() => sendMessage(chatInput)}
                    disabled={!chatInput.trim() || isBotTyping}
                  >
                    <Ionicons name="send" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Logout Modal */}
        <Modal
          visible={showLogoutModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalIcon}>
                <Ionicons name="log-out-outline" size={44} color="#e74c3c" />
              </View>
              <Text style={styles.modalTitle}>ออกจากระบบ</Text>
              <Text style={styles.modalMsg}>
                คุณต้องการออกจากระบบใช่หรือไม่?
              </Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setShowLogoutModal(false)}
                  disabled={isLoggingOut}
                >
                  <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.confirmBtn]}
                  onPress={handleConfirmLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmBtnText}>ออกจากระบบ</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const MenuButton = React.memo(
  ({
    icon,
    label,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={26} color="#fff" />
      </View>
      <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
  ),
);

const NewsItemRow = React.memo(
  ({
    item,
    isBookmarked,
    onPress,
    onToggleBookmark,
  }: {
    item: NewsItem;
    isBookmarked: boolean;
    onPress: (id: string) => void;
    onToggleBookmark: (id: string, state: boolean) => void;
  }) => (
    <View style={styles.newsItem}>
      <View style={styles.newsItemLeft}>
        <View style={styles.newsDot} />
        <Text style={styles.newsTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
      <View style={styles.newsActions}>
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => onPress(item.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.detailBtnText}>รายละเอียด</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ padding: 4 }}
          onPress={() => onToggleBookmark(item.id, isBookmarked)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={22}
            color="#1B8B6A"
          />
        </TouchableOpacity>
      </View>
    </View>
  ),
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#1B8B6A" },
  container: { flex: 1, backgroundColor: "#F2F4F7" },
  centered: { alignItems: "center", paddingVertical: 30, gap: 8 },
  loadingText: { color: "#999", fontSize: 13 },

  header: {
    backgroundColor: "#1B8B6A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  headerGreeting: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginBottom: 2,
  },
  headerName: { color: "#fff", fontSize: 22, fontWeight: "700" },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  menuCard: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 18,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: { alignItems: "center", gap: 8 },
  menuIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: "#1B8B6A",
    justifyContent: "center",
    alignItems: "center",
  },
  menuText: { fontSize: 12, color: "#444", fontWeight: "500" },

  newsCard: {
    flex: 1,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 90,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  newsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  newsTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  newsTitleBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#1B8B6A",
  },
  newsSectionTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  viewAllButton: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewAllText: { color: "#1B8B6A", fontSize: 13, fontWeight: "600" },
  newsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 10,
  },
  newsItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  newsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1B8B6A",
    marginTop: 7,
  },
  newsTitle: {
    flex: 1,
    fontSize: 14,
    color: "#222",
    lineHeight: 20,
    fontWeight: "500",
  },
  newsActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailBtn: {
    backgroundColor: "#1B8B6A",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  detailBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  noNews: { fontSize: 14, color: "#bbb", marginTop: 4 },

  chatFab: {
    position: "absolute",
    bottom: 28,
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1B8B6A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "rgba(27,139,106,0.2)",
  },

  chatModalOverlay: { flex: 1 },
  chatBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.38)" },
  chatSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 18,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 2,
  },
  chatHeader: {
    backgroundColor: "#1B8B6A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chatHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  chatHeaderTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#7FFFD4",
  },
  chatHeaderSub: { color: "rgba(255,255,255,0.85)", fontSize: 11 },
  chatHeaderActions: { flexDirection: "row", gap: 6 },
  chatIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  msgList: { backgroundColor: "#F2F4F7", maxHeight: SCREEN_HEIGHT * 0.44 },
  msgListContent: { padding: 16, paddingBottom: 8, gap: 2 },

  bubbleWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 8,
  },
  bubbleLeft: { justifyContent: "flex-start" },
  bubbleRight: { justifyContent: "flex-end" },
  botAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#1B8B6A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: { backgroundColor: "#1B8B6A", borderBottomRightRadius: 5 },
  botBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  userText: { color: "#fff" },
  botText: { color: "#1f2937" },
  typingDots: { color: "#1B8B6A", fontSize: 10, letterSpacing: 4 },

  quickScroll: { maxHeight: 48, backgroundColor: "#F2F4F7" },
  quickContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#1B8B6A",
  },
  quickText: { fontSize: 12, color: "#1B8B6A", fontWeight: "600" },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F2F4F7",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    lineHeight: 20,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1B8B6A",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnOff: { backgroundColor: "#b2d8cc" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  modalMsg: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalBtns: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "#F3F4F6" },
  cancelBtnText: { color: "#555", fontSize: 15, fontWeight: "600" },
  confirmBtn: { backgroundColor: "#EF4444" },
  confirmBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
