import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const DAYS = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
];
const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i);
const CELL_W = 100;
const DAY_W = 72;
const CELL_H = 64;
const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 21; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:00`);
  if (h < 21) TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:30`);
}

const timeToDecimal = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
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

export default function ScheduleScreen() {
  const router = useRouter();
  const { user, userId, userProfile } = useAuth();

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  // useRef เพื่อให้ฟังก์ชัน async / callback อ่านค่าล่าสุดเสมอ
  const itemsRef = useRef<ScheduleItem[]>([]);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [room, setRoom] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [colorIndex, setColorIndex] = useState(0);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<ScheduleItem | null>(null);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"start" | "end">("start");
  const [pickerSelected, setPickerSelected] = useState("08:00");

  useEffect(() => {
    if (user && userId) loadSchedule();
  }, [user, userId]);

  // ── sync ref กับ state ─────────────────────────────
  const updateItems = (items: ScheduleItem[]) => {
    itemsRef.current = items;
    setScheduleItems(items);
  };

  // ── Firestore ──────────────────────────────────────
  const loadSchedule = async () => {
    if (!user || !userId) return;
    try {
      const col =
        userProfile?.role?.role_id === "student" ? "Student" : "Teacher";
      const snap = await getDoc(doc(db, col, userId));
      if (snap.exists()) {
        const raw: any[] = snap.data()?.schedule || [];
        const migrated = raw.map((item) => ({
          ...item,
          startTime:
            item.startTime ||
            `${Math.floor(item.startHour).toString().padStart(2, "0")}:${item.startHour % 1 === 0.5 ? "30" : "00"}`,
          endTime:
            item.endTime ||
            `${Math.floor(item.endHour).toString().padStart(2, "0")}:${item.endHour % 1 === 0.5 ? "30" : "00"}`,
        }));
        updateItems(migrated);
      }
    } catch {}
  };

  const saveSchedule = async (items: ScheduleItem[]) => {
    if (!user || !userId) {
      console.log("saveSchedule: no user/userId", { user, userId });
      return;
    }
    try {
      console.log("saveSchedule: saving", items.length, "items");
      const col =
        userProfile?.role?.role_id === "student" ? "Student" : "Teacher";
      await setDoc(doc(db, col, userId), { schedule: items }, { merge: true });
      console.log("saveSchedule: success");
      updateItems(items);
    } catch (e) {
      console.log("saveSchedule: error", e);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถบันทึกตารางได้");
    }
  };

  // ── Add ────────────────────────────────────────────
  const openAddModal = (day: number, hour: number) => {
    setSelectedDay(day);
    setStartTime(`${hour.toString().padStart(2, "0")}:00`);
    setEndTime(`${(hour + 1).toString().padStart(2, "0")}:00`);
    setSubjectCode("");
    setSubjectName("");
    setRoom("");
    setColorIndex(Math.floor(Math.random() * COLORS.length));
    setAddModalVisible(true);
  };

  const handleAddSubject = () => {
    if (selectedDay === null || !subjectCode.trim() || !subjectName.trim()) {
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
      day: selectedDay,
      startHour: sH,
      endHour: eH,
      startTime,
      endTime,
      subjectCode: subjectCode.trim(),
      subjectName: subjectName.trim(),
      room: room.trim(),
      color: COLORS[colorIndex],
    };

    const current = itemsRef.current;
    const conflict = current.some(
      (item) =>
        item.day === newItem.day &&
        !(
          newItem.endHour <= item.startHour || newItem.startHour >= item.endHour
        ),
    );
    if (conflict) {
      Alert.alert("ตารางซ้อนทับ", "มีวิชาอื่นในช่วงเวลานี้แล้ว");
      return;
    }

    saveSchedule([...current, newItem]);
    setAddModalVisible(false);
  };

  // ── Delete ─────────────────────────────────────────
  const openDetail = (item: ScheduleItem) => {
    setDetailItem(item);
    setDetailVisible(true);
  };

  const handleDelete = () => {
    if (!detailItem) return;
    const id = detailItem.id;
    const name = detailItem.subjectName;
    console.log(
      "handleDelete: deleting id =",
      id,
      "current items =",
      itemsRef.current.length,
    );

    setDetailVisible(false);
    setDetailItem(null);

    const filtered = itemsRef.current.filter((i) => i.id !== id);
    console.log("handleDelete: after filter =", filtered.length, "items");
    saveSchedule(filtered);
  };

  // ── Time picker ────────────────────────────────────
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
    const h = Math.floor(diff),
      m = Math.round((diff - h) * 60);
    return m > 0 ? `${h}ชม.${m}น.` : `${h} ชม.`;
  };

  // ── Grid row ───────────────────────────────────────
  const DayRow = ({
    dayLabel,
    dayIndex,
  }: {
    dayLabel: string;
    dayIndex: number;
  }) => {
    const dayItems = scheduleItems.filter((i) => i.day === dayIndex);

    return (
      <View style={styles.gridRow}>
        <View style={styles.dayLabelCell}>
          <Text style={styles.dayLabel}>{dayLabel}</Text>
        </View>
        {HOURS.map((h) => {
          // หาวิชาที่เริ่มในช่องนี้พอดี
          const itemStartingHere = dayItems.find(
            (i) => Math.floor(i.startHour) === h,
          );
          // หาวิชาที่ครอบช่องนี้อยู่ (แต่เริ่มก่อนหน้า)
          const itemCovering = dayItems.find(
            (i) => h > Math.floor(i.startHour) && h < Math.ceil(i.endHour),
          );

          if (itemCovering) {
            // ช่องที่ถูกวิชาครอบอยู่ — render เป็น View ว่างๆ ไม่กดได้
            return <View key={h} style={styles.cell} />;
          }

          if (itemStartingHere) {
            // ช่องที่วิชาเริ่ม — render subject block ที่มีความกว้างตามจำนวนชั่วโมง
            const widthPx =
              (itemStartingHere.endHour - itemStartingHere.startHour) * CELL_W -
              3;
            return (
              <TouchableOpacity
                key={h}
                activeOpacity={0.8}
                onPress={() => openDetail(itemStartingHere)}
                style={[
                  styles.cell,
                  styles.subjectCell,
                  {
                    width: widthPx,
                    backgroundColor: itemStartingHere.color || "#1B8B6A",
                  },
                ]}
              >
                <Text style={styles.subjectCode} numberOfLines={1}>
                  {itemStartingHere.subjectCode}
                </Text>
                <Text style={styles.subjectName} numberOfLines={1}>
                  {itemStartingHere.subjectName}
                </Text>
                <Text style={styles.subjectTime}>
                  {itemStartingHere.startTime}–{itemStartingHere.endTime}
                </Text>
                {itemStartingHere.room ? (
                  <Text style={styles.subjectRoom} numberOfLines={1}>
                    📍 {itemStartingHere.room}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          }

          // ช่องว่าง — กดเพื่อเพิ่มวิชา
          return (
            <TouchableOpacity
              key={h}
              style={styles.cell}
              activeOpacity={0.4}
              onPress={() => openAddModal(dayIndex, h)}
            >
              <Ionicons name="add" size={15} color="#D1D5DB" />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          title: "ตารางเรียน",
          headerStyle: { backgroundColor: "#1B8B6A" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 4, padding: 6 }}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        <View style={styles.hint}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#1B8B6A"
          />
          <Text
            style={styles.hintText}
          >{`แตะช่องว่าง = เพิ่มวิชา  •  แตะวิชา = ดูรายละเอียด / ลบ`}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.gridHeaderRow}>
              <View style={[styles.gridHeaderCell, { width: DAY_W }]}>
                <Text style={styles.gridHeaderText}>วัน \ เวลา</Text>
              </View>
              {HOURS.map((h) => (
                <View
                  key={h}
                  style={[styles.gridHeaderCell, { width: CELL_W }]}
                >
                  <Text style={styles.gridHeaderText}>{h}:00</Text>
                </View>
              ))}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {DAYS.map((day, di) => (
                <DayRow key={di} dayLabel={day} dayIndex={di} />
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* ══ Detail/Delete Modal ══ */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDetailVisible(false);
          setDetailItem(null);
        }}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailBox}>
            <View
              style={[
                styles.detailStrip,
                { backgroundColor: detailItem?.color ?? "#1B8B6A" },
              ]}
            />
            <View style={styles.detailBody}>
              <Text style={styles.detailCode}>{detailItem?.subjectCode}</Text>
              <Text style={styles.detailName}>{detailItem?.subjectName}</Text>
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="calendar-outline" size={16} color="#1B8B6A" />
                </View>
                <Text style={styles.detailText}>
                  วัน{detailItem?.day !== undefined ? DAYS[detailItem.day] : ""}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="time-outline" size={16} color="#1B8B6A" />
                </View>
                <Text style={styles.detailText}>
                  {detailItem?.startTime} – {detailItem?.endTime}
                </Text>
              </View>
              {detailItem?.room ? (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconWrap}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#1B8B6A"
                    />
                  </View>
                  <Text style={styles.detailText}>{detailItem.room}</Text>
                </View>
              ) : null}
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.btnClose}
                  onPress={() => {
                    setDetailVisible(false);
                    setDetailItem(null);
                  }}
                >
                  <Text style={styles.btnCloseText}>ปิด</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnDelete}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.btnDeleteText}>ลบวิชานี้</Text>
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
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>เพิ่มรายวิชา</Text>
                {selectedDay !== null && (
                  <Text style={styles.modalSub}>วัน{DAYS[selectedDay]}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setAddModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#555" />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.fieldLabel}>ช่วงเวลา</Text>
              <View style={styles.timeRow}>
                <TouchableOpacity
                  style={styles.timePill}
                  onPress={() => openPicker("start")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time-outline" size={15} color="#1B8B6A" />
                  <Text style={styles.timePillText}>{startTime}</Text>
                  <Ionicons name="chevron-down" size={13} color="#999" />
                </TouchableOpacity>
                <Ionicons name="arrow-forward" size={16} color="#bbb" />
                <TouchableOpacity
                  style={styles.timePill}
                  onPress={() => openPicker("end")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time-outline" size={15} color="#1B8B6A" />
                  <Text style={styles.timePillText}>{endTime}</Text>
                  <Ionicons name="chevron-down" size={13} color="#999" />
                </TouchableOpacity>
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>
                    {String(durationLabel())}
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>สีวิชา</Text>
              <View style={styles.colorRow}>
                {COLORS.map((c, i) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      colorIndex === i && styles.colorDotOn,
                    ]}
                    onPress={() => setColorIndex(i)}
                  >
                    {colorIndex === i && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

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

              <Text style={styles.fieldLabel}>ห้องเรียน</Text>
              <TextInput
                style={styles.input}
                placeholder="เช่น อาคาร 5 ห้อง 501 (ไม่บังคับ)"
                placeholderTextColor="#C4C4C4"
                value={room}
                onChangeText={setRoom}
              />

              {(subjectCode || subjectName) && (
                <View
                  style={[
                    styles.preview,
                    { backgroundColor: COLORS[colorIndex] },
                  ]}
                >
                  <Text style={styles.previewCode}>{subjectCode || "—"}</Text>
                  <Text style={styles.previewName}>{subjectName || "—"}</Text>
                  <Text style={styles.previewTime}>
                    {startTime} – {endTime}
                    {room ? `  📍 ${room}` : ""}
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
      </Modal>

      {/* ══ Time Picker Modal ══ */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {pickerTarget === "start" ? "เวลาเริ่มต้น" : "เวลาสิ้นสุด"}
              </Text>
              <TouchableOpacity
                style={styles.pickerDoneBtn}
                onPress={confirmPicker}
              >
                <Text style={styles.pickerDoneText}>ยืนยัน</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={
                pickerTarget === "end"
                  ? TIME_OPTIONS.filter(
                      (t) => timeToDecimal(t) > timeToDecimal(startTime),
                    )
                  : TIME_OPTIONS
              }
              keyExtractor={(t) => t}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: t }) => {
                const active = t === pickerSelected;
                return (
                  <TouchableOpacity
                    style={[
                      styles.timeOption,
                      active && styles.timeOptionActive,
                    ]}
                    onPress={() => setPickerSelected(t)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        active && styles.timeOptionTextActive,
                      ]}
                    >
                      {t} น.
                    </Text>
                    {active && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#1B8B6A"
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#1B8B6A" },
  container: { flex: 1, backgroundColor: "#F2F4F7" },

  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  hintText: { fontSize: 12, color: "#555", fontWeight: "500" },

  gridHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1B8B6A",
    marginHorizontal: 14,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  gridHeaderCell: {
    height: 38,
    width: CELL_W,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.15)",
  },
  gridHeaderText: { color: "#fff", fontWeight: "700", fontSize: 11 },

  gridRow: {
    flexDirection: "row",
    marginHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  dayLabelCell: {
    width: DAY_W,
    height: CELL_H,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },

  cell: {
    width: CELL_W,
    height: CELL_H,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },

  subjectCell: {
    height: CELL_H,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    justifyContent: "flex-start",
    overflow: "hidden",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  subjectCode: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 1,
  },
  subjectName: {
    fontSize: 9,
    color: "rgba(255,255,255,0.95)",
    marginBottom: 1,
  },
  subjectTime: {
    fontSize: 8,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  subjectRoom: { fontSize: 8, color: "rgba(255,255,255,0.75)" },

  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
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
  detailBody: { padding: 24 },
  detailCode: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    marginBottom: 4,
  },
  detailName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  detailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#E6F4F0",
    justifyContent: "center",
    alignItems: "center",
  },
  detailText: { fontSize: 14, color: "#333", fontWeight: "500" },
  detailActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  btnClose: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  btnCloseText: { fontSize: 15, fontWeight: "600", color: "#555" },
  btnDelete: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#EF4444",
  },
  btnDeleteText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 18,
    maxHeight: "92%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  modalSub: { fontSize: 13, color: "#1B8B6A", fontWeight: "600", marginTop: 3 },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FFFE",
    borderWidth: 1.5,
    borderColor: "#D1FAE5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  timePillText: { flex: 1, fontSize: 16, fontWeight: "700", color: "#111" },
  durationBadge: {
    backgroundColor: "#E6F4F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  durationText: { fontSize: 11, color: "#1B8B6A", fontWeight: "700" },

  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  colorDotOn: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#111",
  },

  preview: {
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  previewCode: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 2,
  },
  previewName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  previewTime: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1B8B6A",
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 20,
    shadowColor: "#1B8B6A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pickerBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 320,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  pickerTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  pickerDoneBtn: {
    backgroundColor: "#1B8B6A",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pickerDoneText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  timeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  timeOptionActive: { backgroundColor: "#F0FDF9" },
  timeOptionText: { fontSize: 16, color: "#333", fontWeight: "500" },
  timeOptionTextActive: { color: "#1B8B6A", fontWeight: "700" },
});
