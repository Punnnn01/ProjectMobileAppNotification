import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS_SHORT = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const DAYS_TAB   = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"]; // ย่อสำหรับ tab bar
const HOURS      = Array.from({ length: 15 }, (_, i) => 7 + i); // 07–21
const COLORS     = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];
const ROW_H      = 64; // px ต่อ 1 ชั่วโมง
const { width: SCREEN_W } = Dimensions.get("window");

const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 21; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:00`);
  if (h < 21) TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:30`);
}

const timeToDecimal = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
};

const decimalToTime = (d: number) => {
  const h = Math.floor(d);
  const m = Math.round((d - h) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

interface ScheduleItem {
  id: string;
  day: number;
  startHour: number;
  endHour: number;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  room?: string;
  color?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { user, userId, userProfile } = useAuth();

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const itemsRef = useRef<ScheduleItem[]>([]);

  // วันที่กำลังดูอยู่ (0=จ … 6=อา)
  const [activeDay, setActiveDay] = useState<number>(() => {
    const d = new Date().getDay(); // 0=อา,1=จ,...,6=ส
    return d === 0 ? 6 : d - 1;   // แปลงเป็น index ของเรา
  });

  // Add modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedHour, setSelectedHour]       = useState(8);
  const [subjectCode, setSubjectCode]         = useState("");
  const [subjectName, setSubjectName]         = useState("");
  const [room, setRoom]                       = useState("");
  const [startTime, setStartTime]             = useState("08:00");
  const [endTime, setEndTime]                 = useState("09:00");
  const [colorIndex, setColorIndex]           = useState(0);

  // Detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailItem, setDetailItem]       = useState<ScheduleItem | null>(null);

  // Time picker
  const [pickerVisible, setPickerVisible]   = useState(false);
  const [pickerTarget, setPickerTarget]     = useState<"start" | "end">("start");
  const [pickerSelected, setPickerSelected] = useState("08:00");

  // ─── Firestore: useFocusEffect + onSnapshot ──────────────────────────
  const unsubScheduleRef = useRef<(() => void) | null>(null);

  const updateItems = (items: ScheduleItem[]) => {
    itemsRef.current = items;
    setScheduleItems(items);
  };

  useFocusEffect(
    useCallback(() => {
      if (!user || !userId) return;
      const col     = userProfile?.role?.role_id === "student" ? "Student" : "Teacher";
      const userRef = doc(db, col, userId);

      // onSnapshot: อัปเดตตารางเรียนทันทีเมื่อมีการเปลี่ยนแปลงใน Firestore
      unsubScheduleRef.current = onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const raw: any[] = snap.data()?.schedule || [];
        const migrated   = raw.map((item) => ({
          ...item,
          startTime: item.startTime || decimalToTime(item.startHour),
          endTime:   item.endTime   || decimalToTime(item.endHour),
        }));
        updateItems(migrated);
      });

      return () => {
        unsubScheduleRef.current?.();
        unsubScheduleRef.current = null;
      };
    }, [user, userId, userProfile])
  );

  const saveSchedule = async (items: ScheduleItem[]) => {
    if (!user || !userId) return;
    try {
      const col = userProfile?.role?.role_id === "student" ? "Student" : "Teacher";
      await setDoc(doc(db, col, userId), { schedule: items }, { merge: true });
      updateItems(items);
    } catch {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถบันทึกตารางได้");
    }
  };

  // ─── Handlers ──────────────────────────────────────────────────────────
  const openAddModal = (hour: number) => {
    setSelectedHour(hour);
    setStartTime(`${hour.toString().padStart(2, "0")}:00`);
    setEndTime(`${(Math.min(hour + 1, 20)).toString().padStart(2, "0")}:00`);
    setSubjectCode("");
    setSubjectName("");
    setRoom("");
    setColorIndex(Math.floor(Math.random() * COLORS.length));
    setAddModalVisible(true);
  };

  const handleAddSubject = () => {
    if (!subjectCode.trim() || !subjectName.trim()) {
      Alert.alert("กรุณากรอกข้อมูล", "กรุณากรอกรหัสวิชาและชื่อวิชา");
      return;
    }
    const sH = timeToDecimal(startTime);
    const eH = timeToDecimal(endTime);
    if (eH <= sH) {
      Alert.alert("เวลาไม่ถูกต้อง", "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
      return;
    }
    const newItem: ScheduleItem = {
      id: Date.now().toString(),
      day: activeDay,
      startHour: sH, endHour: eH,
      startTime, endTime,
      subjectCode: subjectCode.trim(),
      subjectName: subjectName.trim(),
      room: room.trim(),
      color: COLORS[colorIndex],
    };
    const conflict = itemsRef.current.some(
      (item) =>
        item.day === activeDay &&
        !(newItem.endHour <= item.startHour || newItem.startHour >= item.endHour)
    );
    if (conflict) {
      Alert.alert("ตารางซ้อนทับ", "มีวิชาอื่นในช่วงเวลานี้แล้ว");
      return;
    }
    saveSchedule([...itemsRef.current, newItem]);
    setAddModalVisible(false);
  };

  const handleDelete = () => {
    if (!detailItem) return;
    const id = detailItem.id;
    setDetailVisible(false);
    setDetailItem(null);
    saveSchedule(itemsRef.current.filter((i) => i.id !== id));
  };

  const openPicker = (target: "start" | "end") => {
    setPickerTarget(target);
    setPickerSelected(target === "start" ? startTime : endTime);
    setPickerVisible(true);
  };

  const confirmPicker = () => {
    if (pickerTarget === "start") {
      setStartTime(pickerSelected);
      if (timeToDecimal(pickerSelected) >= timeToDecimal(endTime)) {
        const idx = TIME_OPTIONS.indexOf(pickerSelected) + 2;
        setEndTime(TIME_OPTIONS[Math.min(idx, TIME_OPTIONS.length - 1)]);
      }
    } else {
      setEndTime(pickerSelected);
    }
    setPickerVisible(false);
  };

  const durationLabel = () => {
    const diff = timeToDecimal(endTime) - timeToDecimal(startTime);
    if (diff <= 0) return "—";
    const h = Math.floor(diff);
    const m = Math.round((diff - h) * 60);
    return m > 0 ? `${h} ชม. ${m} น.` : `${h} ชั่วโมง`;
  };

  // วิชาของวันที่กำลังดูอยู่ เรียงตามเวลา
  const todayItems = scheduleItems
    .filter((s) => s.day === activeDay)
    .sort((a, b) => a.startHour - b.startHour);

  // ─── Sub-components ────────────────────────────────────────────────────

  // แถบ day tabs ด้านบน — ใช้ View row เต็มหน้าจอ ไม่ scroll
  const DayTabs = () => (
    <View style={styles.dayTabsWrap}>
      <View style={styles.dayTabsContent}>
        {DAYS_TAB.map((d, i) => {
          const hasClass = scheduleItems.some((s) => s.day === i);
          const isActive = i === activeDay;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dayTab, isActive && styles.dayTabActive]}
              onPress={() => setActiveDay(i)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>
                {d}
              </Text>
              {hasClass && <View style={[styles.dayDot, isActive && styles.dayDotActive]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Timeline grid — position-absolute overlay สำหรับ block วิชา
  const TimelineGrid = () => {
    const TIME_COL  = 52;
    const CONTENT_W = SCREEN_W - 32 - TIME_COL;
    const TOTAL_H   = HOURS.length * ROW_H; // ความสูงรวมทั้ง grid
    const START_H   = HOURS[0]; // ชั่วโมงแรกที่แสดง (7)

    return (
      <View style={styles.gridCard}>
        {/* แถวชั่วโมง — แค่ทำเส้นกริดและปุ่ม + */}
        <View style={{ flexDirection: "row", overflow: "hidden", borderRadius: 16 }}>
          {/* Time column */}
          <View style={{ width: TIME_COL }}>
            {HOURS.map((hour) => (
              <View key={hour} style={[styles.timeCol, { width: TIME_COL, height: ROW_H }]}>
                <Text style={styles.timeText}>{hour}:00</Text>
              </View>
            ))}
          </View>

          {/* Content column — position relative เพื่อให้ absolute block วางทับได้ */}
          <View style={{ width: CONTENT_W, height: TOTAL_H, position: "relative" }}>
            {/* เส้นกริดแนวนอน + ปุ่ม + */}
            {HOURS.map((hour) => {
              const isCovered = todayItems.some(
                (s) => s.startHour < hour && s.endHour > hour
              );
              const hasItem = todayItems.some(
                (s) => Math.floor(s.startHour) === hour
              );
              return (
                <View
                  key={hour}
                  style={{
                    position: "absolute",
                    top: (hour - START_H) * ROW_H,
                    left: 0,
                    width: CONTENT_W,
                    height: ROW_H,
                    borderTopWidth: 1,
                    borderTopColor: "#F0F0F0",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {(!isCovered && !hasItem) && (
                    <TouchableOpacity
                      style={styles.emptySlot}
                      onPress={() => openAddModal(hour)}
                      activeOpacity={0.4}
                    >
                      <Ionicons name="add" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Subject blocks — absolute ตาม startHour/endHour จริง */}
            {todayItems.map((item) => {
              const topPx    = (item.startHour - START_H) * ROW_H + 3;
              const heightPx = Math.max((item.endHour - item.startHour) * ROW_H - 6, 36);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => { setDetailItem(item); setDetailVisible(true); }}
                  style={[
                    styles.subjectBlock,
                    {
                      position: "absolute",
                      top: topPx,
                      left: 4,
                      right: 4,
                      height: heightPx,
                      backgroundColor: item.color || "#1B8B6A",
                    },
                  ]}
                >
                  <View style={styles.blockInner}>
                    <Text style={styles.blockCode} numberOfLines={1}>{item.subjectCode}</Text>
                    <Text style={styles.blockName} numberOfLines={2}>{item.subjectName}</Text>
                    <View style={styles.blockMeta}>
                      <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.blockTime}>{item.startTime} – {item.endTime}</Text>
                      {item.room ? (
                        <>
                          <Text style={styles.blockTimeDot}>·</Text>
                          <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.85)" />
                          <Text style={styles.blockTime} numberOfLines={1}>{item.room}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  // ─── Main render ───────────────────────────────────────────────────────
  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

      <View style={styles.container}>
        {/* Day tabs */}
        <DayTabs />

        {/* Summary bar */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryLeft}>
            <Ionicons name="calendar-outline" size={15} color="#1B8B6A" />
            <Text style={styles.summaryDay}>วัน{DAYS_SHORT[activeDay]}</Text>
          </View>
          <Text style={styles.summaryCount}>
            {todayItems.length > 0
              ? `${todayItems.length} วิชา`
              : "ยังไม่มีวิชา"}
          </Text>
        </View>

        {/* Timeline */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <TimelineGrid />
        </ScrollView>

        {/* FAB — เพิ่มวิชา */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => openAddModal(8)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ══ Detail Modal ══ */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setDetailVisible(false); setDetailItem(null); }}
      >
        <View style={styles.overlay}>
          <View style={styles.detailBox}>
            <View style={[styles.detailStrip, { backgroundColor: detailItem?.color ?? "#1B8B6A" }]} />
            <View style={styles.detailBody}>
              <Text style={styles.detailCode}>{detailItem?.subjectCode}</Text>
              <Text style={styles.detailName}>{detailItem?.subjectName}</Text>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}><Ionicons name="calendar-outline" size={16} color="#1B8B6A" /></View>
                <Text style={styles.detailText}>วัน{DAYS_SHORT[detailItem?.day ?? 0]}</Text>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}><Ionicons name="time-outline" size={16} color="#1B8B6A" /></View>
                <Text style={styles.detailText}>{detailItem?.startTime} – {detailItem?.endTime}</Text>
              </View>
              {detailItem?.room ? (
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}><Ionicons name="location-outline" size={16} color="#1B8B6A" /></View>
                  <Text style={styles.detailText}>{detailItem.room}</Text>
                </View>
              ) : null}

              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.btnClose}
                  onPress={() => { setDetailVisible(false); setDetailItem(null); }}
                >
                  <Text style={styles.btnCloseText}>ปิด</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDelete} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.btnDeleteText}>ลบวิชา</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ Add Modal ══ */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.sheetBg}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />

              {/* Header */}
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>เพิ่มรายวิชา</Text>
                  <Text style={styles.sheetSub}>วัน{DAYS_SHORT[activeDay]}</Text>
                </View>
                <TouchableOpacity
                  style={styles.sheetClose}
                  onPress={() => setAddModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#555" />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.sheetBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* เวลา */}
                <Text style={styles.fieldLabel}>ช่วงเวลา</Text>
                <View style={styles.timePickerRow}>
                  <TouchableOpacity
                    style={styles.timePill}
                    onPress={() => openPicker("start")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={15} color="#1B8B6A" />
                    <Text style={styles.timePillText}>{startTime}</Text>
                    <Ionicons name="chevron-down" size={13} color="#999" />
                  </TouchableOpacity>

                  <View style={styles.timeArrow}>
                    <Ionicons name="arrow-forward" size={16} color="#bbb" />
                  </View>

                  <TouchableOpacity
                    style={styles.timePill}
                    onPress={() => openPicker("end")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={15} color="#1B8B6A" />
                    <Text style={styles.timePillText}>{endTime}</Text>
                    <Ionicons name="chevron-down" size={13} color="#999" />
                  </TouchableOpacity>
                </View>

                <View style={styles.durationRow}>
                  <Ionicons name="hourglass-outline" size={13} color="#1B8B6A" />
                  <Text style={styles.durationText}>{durationLabel()}</Text>
                </View>

                {/* สี */}
                <Text style={styles.fieldLabel}>สีวิชา</Text>
                <View style={styles.colorRow}>
                  {COLORS.map((c, i) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorDot, { backgroundColor: c }, colorIndex === i && styles.colorDotOn]}
                      onPress={() => setColorIndex(i)}
                    >
                      {colorIndex === i && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* รหัสวิชา */}
                <Text style={styles.fieldLabel}>
                  รหัสวิชา <Text style={{ color: "#EF4444" }}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="เช่น 01418113"
                  placeholderTextColor="#C4C4C4"
                  value={subjectCode}
                  onChangeText={setSubjectCode}
                />

                {/* ชื่อวิชา */}
                <Text style={styles.fieldLabel}>
                  ชื่อวิชา <Text style={{ color: "#EF4444" }}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="ชื่อวิชา"
                  placeholderTextColor="#C4C4C4"
                  value={subjectName}
                  onChangeText={setSubjectName}
                />

                {/* ห้องเรียน */}
                <Text style={styles.fieldLabel}>ห้องเรียน</Text>
                <TextInput
                  style={styles.input}
                  placeholder="เช่น อาคาร 5 ห้อง 501 (ไม่บังคับ)"
                  placeholderTextColor="#C4C4C4"
                  value={room}
                  onChangeText={setRoom}
                />

                {/* Preview */}
                {(subjectCode || subjectName) && (
                  <View style={[styles.preview, { backgroundColor: COLORS[colorIndex] }]}>
                    <Text style={styles.previewCode}>{subjectCode || "—"}</Text>
                    <Text style={styles.previewName}>{subjectName || "—"}</Text>
                    <Text style={styles.previewTime}>
                      {startTime} – {endTime}{room ? `  📍 ${room}` : ""}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleAddSubject}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.addBtnText}>เพิ่มรายวิชา</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══ Time Picker Modal ══ */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.pickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {pickerTarget === "start" ? "เวลาเริ่มต้น" : "เวลาสิ้นสุด"}
              </Text>
              <TouchableOpacity style={styles.pickerDoneBtn} onPress={confirmPicker}>
                <Text style={styles.pickerDoneText}>ยืนยัน</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={
                pickerTarget === "end"
                  ? TIME_OPTIONS.filter((t) => timeToDecimal(t) > timeToDecimal(startTime))
                  : TIME_OPTIONS
              }
              keyExtractor={(t) => t}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: t }) => {
                const active = t === pickerSelected;
                return (
                  <TouchableOpacity
                    style={[styles.timeOption, active && styles.timeOptionActive]}
                    onPress={() => setPickerSelected(t)}
                  >
                    <Text style={[styles.timeOptionText, active && styles.timeOptionTextActive]}>
                      {t} น.
                    </Text>
                    {active && (
                      <Ionicons name="checkmark-circle" size={20} color="#1B8B6A" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: "#F2F4F7" },
  container: { flex: 1, backgroundColor: "#F2F4F7" },

  // ── Day tabs ──────────────────────────────────────────────────────────
  dayTabsWrap: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  dayTabsContent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  dayTabActive: {
    backgroundColor: "#1B8B6A",
  },
  dayTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  dayTabTextActive: {
    color: "#fff",
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#1B8B6A",
    marginTop: 4,
  },
  dayDotActive: {
    backgroundColor: "rgba(255,255,255,0.7)",
  },

  // ── Summary bar ───────────────────────────────────────────────────────
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 2,
  },
  summaryLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryDay:  { fontSize: 14, fontWeight: "700", color: "#111" },
  summaryCount: { fontSize: 13, color: "#888", fontWeight: "500" },

  // ── Timeline ──────────────────────────────────────────────────────────
  gridCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  hourRow: {
    flexDirection: "row",
    minHeight: ROW_H,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  timeCol: {
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingRight: 10,
    paddingTop: 8,
    backgroundColor: "#FAFAFA",
    borderRightWidth: 1,
    borderRightColor: "#EFEFEF",
  },
  timeText: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
  },
  hourContent: {
    flex: 1,
    minHeight: ROW_H,
    position: "relative",
  },
  hourLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#F0F0F0",
  },
  emptySlot: {
    flex: 1,
    height: ROW_H,
    justifyContent: "center",
    alignItems: "center",
  },
  subjectBlock: {
    marginHorizontal: 6,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    overflow: "hidden",
  },
  blockInner: {
    flex: 1,
    padding: 10,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  blockCode: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 2,
  },
  blockName: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
    marginBottom: 6,
    lineHeight: 18,
  },
  blockMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexWrap: "wrap",
  },
  blockTime: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },
  blockTimeDot: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },

  // ── FAB ───────────────────────────────────────────────────────────────
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1B8B6A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1B8B6A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },

  // ── Overlay ───────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  // ── Detail Modal ──────────────────────────────────────────────────────
  detailBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  detailStrip: { height: 8 },
  detailBody:  { padding: 24 },
  detailCode:  { fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 4 },
  detailName:  { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 20 },
  detailRow:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  detailIcon:  {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#E6F4F0",
    justifyContent: "center", alignItems: "center",
  },
  detailText:    { fontSize: 14, color: "#333", fontWeight: "500" },
  detailActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  btnClose:      {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: "#F3F4F6", alignItems: "center",
  },
  btnCloseText:  { fontSize: 15, fontWeight: "600", color: "#555" },
  btnDelete: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
    paddingVertical: 13, borderRadius: 12, backgroundColor: "#EF4444",
  },
  btnDeleteText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // ── Add Modal (bottom sheet) ───────────────────────────────────────────
  sheetBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 18,
    maxHeight: "92%",
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  sheetSub:   { fontSize: 13, color: "#1B8B6A", fontWeight: "600", marginTop: 2 },
  sheetClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center",
  },
  sheetBody: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8, marginTop: 16 },

  timePickerRow: { flexDirection: "row", alignItems: "center" },
  timePill: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F8FFFE",
    borderWidth: 1.5, borderColor: "#D1FAE5",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  timePillText: { flex: 1, fontSize: 16, fontWeight: "700", color: "#111" },
  timeArrow: { paddingHorizontal: 10 },
  durationRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: 8,
    backgroundColor: "#E6F4F0",
    alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  durationText: { fontSize: 12, color: "#1B8B6A", fontWeight: "700" },

  colorRow:  { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot:  { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  colorDotOn: {
    borderWidth: 3, borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5, borderColor: "#E5E7EB",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: "#111",
  },

  preview: {
    marginTop: 16, borderRadius: 14, padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  previewCode: { fontSize: 12, fontWeight: "800", color: "#fff", marginBottom: 3 },
  previewName: { fontSize: 15, fontWeight: "700", color: "#fff", marginBottom: 5 },
  previewTime: { fontSize: 12, color: "rgba(255,255,255,0.85)" },

  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#1B8B6A",
    paddingVertical: 15, borderRadius: 14, marginTop: 20,
    shadowColor: "#1B8B6A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  // ── Time Picker Modal ─────────────────────────────────────────────────
  pickerBox: {
    backgroundColor: "#fff", borderRadius: 20,
    width: "100%", maxWidth: 320, overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 16,
  },
  pickerHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  pickerTitle:    { fontSize: 16, fontWeight: "700", color: "#111" },
  pickerDoneBtn:  {
    backgroundColor: "#1B8B6A",
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
  },
  pickerDoneText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  timeOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#F8F8F8",
  },
  timeOptionActive:     { backgroundColor: "#F0FDF9" },
  timeOptionText:       { fontSize: 16, color: "#333", fontWeight: "500" },
  timeOptionTextActive: { color: "#1B8B6A", fontWeight: "700" },
});
