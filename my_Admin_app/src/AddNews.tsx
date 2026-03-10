// src/AddNews.tsx
import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import * as XLSX from "xlsx";
import type { LoggedInUser } from "./Login";
import "./style.css";

type SubmitResult = { ok: true; id?: string } | { ok: false; message: string };

const BACKEND_URL = "https://projectmobileappnotification-production.up.railway.app";

interface Group {
  group_id: string;
  name_group: string;
  student_id: string[];
}
interface Student {
  student_id: string;
  personal_info?: { firstName: string; lastName: string; email: string };
  student_name?: string;
}
interface ExamRow {
  [key: string]: any;
}
interface GroupedExam {
  date: string;
  exams: ExamRow[];
}
interface FilePreviewItem {
  id: string;
  name: string;
  sizeMB: number;
  imageUrl?: string;
}
interface LinkItem {
  id: string;
  label: string;
  url: string;
}
interface Props {
  currentUser: LoggedInUser;
}

// ── Excel helpers ────────────────────────────────────────────────
function excelDateToJSDate(serial: number): Date {
  const d = new Date(Math.floor(serial - 25569) * 86400 * 1000);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number" && value > 40000 && value < 50000) {
    const d = excelDateToJSDate(value);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  if (typeof value === "number" && value > 0 && value < 1) {
    const s = Math.round(value * 86400);
    return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
  }
  return String(value);
}

function groupByDate(rows: ExamRow[], columns: string[]): GroupedExam[] {
  const dateCol = columns[0];
  const map: Record<string, ExamRow[]> = {};
  rows.forEach((r) => {
    const k = r[dateCol];
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });
  return Object.entries(map).map(([date, exams]) => ({ date, exams }));
}
// ────────────────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function AddNews({ currentUser }: Props): JSX.Element {
  const titleRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const filesRef = useRef<HTMLInputElement | null>(null);

  // กลุ่ม + นิสิต (teacher)
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // ส่งถึง
  const [sendMode, setSendMode] = useState<"all" | "group" | "personal">("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState("");

  // ── ลิงก์ ──────────────────────────────────────────────────────
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  // ไฟล์ preview ทั่วไป
  const [fileItems, setFileItems] = useState<FilePreviewItem[]>([]);

  // Excel/CSV preview
  const [examColumns, setExamColumns] = useState<string[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedExam[]>([]);
  const [examRowCount, setExamRowCount] = useState<number>(0);

  // PDF preview
  const [pdfPreviews, setPdfPreviews] = useState<
    { name: string; url: string }[]
  >([]);

  // status
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser.role === "teacher") {
      fetch(
        `${BACKEND_URL}/api/group-notifications/creator/${currentUser.docId}`,
      )
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((d) => setGroups(d.data || []))
        .catch(() => setGroups([]));
      fetch(`${BACKEND_URL}/api/students/`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setStudents(Array.isArray(d) ? d : []))
        .catch(() => setStudents([]));
    }
  }, [currentUser]);

  function studentName(s: Student) {
    if (s.personal_info)
      return `${s.personal_info.firstName} ${s.personal_info.lastName}`.trim();
    return s.student_name || s.student_id;
  }

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return (
      studentName(s).toLowerCase().includes(q) ||
      s.student_id.toLowerCase().includes(q)
    );
  });

  // ── เพิ่มลิงก์ ────────────────────────────────────────────────
  function handleAddLink() {
    setLinkError("");
    const url = linkUrl.trim();
    const label = linkLabel.trim();
    if (!url) {
      setLinkError("กรุณากรอก URL");
      return;
    }
    // เพิ่ม https:// ให้อัตโนมัติถ้าไม่มี
    const fullUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    if (!isValidUrl(fullUrl)) {
      setLinkError("URL ไม่ถูกต้อง");
      return;
    }
    setLinks((prev) => [
      ...prev,
      { id: `${Date.now()}`, label: label || fullUrl, url: fullUrl },
    ]);
    setLinkLabel("");
    setLinkUrl("");
  }

  function handleRemoveLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  // ── รับไฟล์ทุกประเภท ──────────────────────────────────────────
  async function onFilesChange(e: any) {
    const files = Array.from(
      (e.target as HTMLInputElement).files || [],
    ) as File[];
    if (!files.length) return;

    setError(null);
    setFileItems([]);
    setExamColumns([]);
    setGroupedData([]);
    setExamRowCount(0);
    setPdfPreviews([]);

    const items: FilePreviewItem[] = [];
    const newPdfs: { name: string; url: string }[] = [];
    let excelParsed = false;

    setParsing(true);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > 10 * 1024 * 1024) {
        setError(`ไฟล์ "${f.name}" มีขนาดเกิน 10MB`);
        setParsing(false);
        return;
      }

      const item: FilePreviewItem = {
        id: `${i}_${f.name}`,
        name: f.name,
        sizeMB: f.size / (1024 * 1024),
      };

      if (f.type.startsWith("image/")) {
        item.imageUrl = URL.createObjectURL(f);
      }

      if (f.type === "application/pdf" || f.name.endsWith(".pdf")) {
        newPdfs.push({ name: f.name, url: URL.createObjectURL(f) });
      }

      if (
        !excelParsed &&
        (f.name.endsWith(".xlsx") ||
          f.name.endsWith(".xls") ||
          f.name.endsWith(".csv"))
      ) {
        excelParsed = true;
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const wb = XLSX.read(evt.target?.result, {
                type: "binary",
                cellDates: true,
              });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const json: any[] = XLSX.utils.sheet_to_json(ws);
              if (json.length > 0) {
                const cols = Object.keys(json[0]);
                const parsed = json.map((row) => {
                  const r: ExamRow = {};
                  cols.forEach((c) => (r[c] = formatValue(row[c])));
                  return r;
                });
                setExamColumns(cols);
                setGroupedData(groupByDate(parsed, cols));
                setExamRowCount(parsed.length);
              }
            } catch {
              setError("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
            }
            resolve();
          };
          reader.readAsBinaryString(f);
        });
      }

      items.push(item);
    }

    setPdfPreviews(newPdfs);
    setFileItems(items);
    setParsing(false);
  }

  // ── Submit ────────────────────────────────────────────────────
  async function handleSubmit(e: any) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const title = titleRef.current?.value.trim() ?? "";
    const content = contentRef.current?.value.trim() ?? "";
    const files = filesRef.current?.files;

    if (!title) return setError("กรุณากรอกหัวเรื่อง");
    if (!content) return setError("กรุณากรอกเนื้อหา");
    if (currentUser.role === "teacher") {
      if (sendMode === "group" && !selectedGroup)
        return setError("กรุณาเลือกกลุ่มที่ต้องการส่ง");
      if (sendMode === "personal" && !selectedStudent)
        return setError("กรุณาเลือกนิสิตที่ต้องการส่ง");
    }

    const fd = new FormData();
    fd.append("title", title);
    fd.append("content", content);
    fd.append("author_id", currentUser.docId);
    fd.append("author_name", currentUser.displayName);
    fd.append("author_role", currentUser.role);
    if (sendMode === "all") fd.append("group_id", "all");
    else if (sendMode === "group") fd.append("group_id", selectedGroup);
    else fd.append("student_id_target", selectedStudent);
    if (files) Array.from(files).forEach((f) => fd.append("files", f));

    // ส่ง links เป็น JSON string
    if (links.length > 0) {
      fd.append(
        "links",
        JSON.stringify(links.map((l) => ({ label: l.label, url: l.url }))),
      );
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/news`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || `HTTP ${res.status}`);
      }
      let label = "ทุกคน";
      if (sendMode === "group")
        label =
          groups.find((g) => g.group_id === selectedGroup)?.name_group ||
          selectedGroup;
      if (sendMode === "personal") {
        const s = students.find((st) => st.student_id === selectedStudent);
        label = s ? studentName(s) : selectedStudent;
      }
      setSuccess(`บันทึกสำเร็จ! ✅ ส่งถึง: ${label}`);
      // reset
      (titleRef.current as HTMLInputElement).value = "";
      (contentRef.current as HTMLTextAreaElement).value = "";
      if (filesRef.current) filesRef.current.value = "";
      setFileItems([]);
      setExamColumns([]);
      setGroupedData([]);
      setExamRowCount(0);
      setPdfPreviews([]);
      setSendMode("all");
      setSelectedGroup("");
      setSelectedStudent("");
      setStudentSearch("");
      setLinks([]);
      setLinkLabel("");
      setLinkUrl("");
    } catch (err: any) {
      setError(err.message || "ไม่สามารถบันทึกได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "900px", margin: "40px auto", padding: "0 24px" }}>
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "32px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "24px",
            textAlign: "center",
            color: "#1f2937",
          }}
        >
          เพิ่มข่าวสาร
        </h2>

        <form onSubmit={handleSubmit}>
          {/* หัวเรื่อง */}
          <div style={{ marginBottom: "20px" }}>
            <label style={L}>
              หัวเรื่อง <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="เพิ่มหัวข้อข่าว"
              maxLength={200}
              required
              ref={titleRef}
              style={I}
            />
            <div style={H}>สูงสุด 200 ตัวอักษร</div>
          </div>

          {/* เนื้อหา */}
          <div style={{ marginBottom: "20px" }}>
            <label style={L}>
              เนื้อหา <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              rows={6}
              placeholder="รายละเอียดข่าว/ประกาศ..."
              required
              ref={contentRef}
              style={{
                ...I,
                resize: "vertical",
                minHeight: "140px",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* ── ลิงก์ ── */}
          <div style={{ marginBottom: "20px" }}>
            <label style={L}>🔗 ลิงก์แนบ</label>

            {/* form เพิ่มลิงก์ */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "8px",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="ชื่อลิงก์ (ไม่บังคับ) เช่น ดูรายละเอียดเพิ่มเติม"
                value={linkLabel}
                onInput={(e) =>
                  setLinkLabel((e.target as HTMLInputElement).value)
                }
                style={{ ...I, flex: "1 1 200px", minWidth: "0" }}
              />
              <input
                type="text"
                placeholder="URL เช่น https://example.com"
                value={linkUrl}
                onInput={(e) =>
                  setLinkUrl((e.target as HTMLInputElement).value)
                }
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleAddLink())
                }
                style={{ ...I, flex: "2 1 260px", minWidth: "0" }}
              />
              <button
                type="button"
                onClick={handleAddLink}
                style={{
                  padding: "10px 20px",
                  background: "#158e6d",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontSize: "14px",
                }}
              >
                + เพิ่ม
              </button>
            </div>

            {linkError && (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "13px",
                  marginBottom: "8px",
                }}
              >
                ⚠️ {linkError}
              </div>
            )}
            <div style={H}>
              กด Enter หรือปุ่ม "+ เพิ่ม" เพื่อเพิ่มลิงก์ — เพิ่มได้หลายลิงก์
            </div>

            {/* รายการลิงก์ที่เพิ่มแล้ว */}
            {links.length > 0 && (
              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {links.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "8px",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>🔗</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "13px",
                          color: "#065f46",
                        }}
                      >
                        {l.label}
                      </div>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "12px",
                          color: "#158e6d",
                          wordBreak: "break-all",
                        }}
                      >
                        {l.url}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(l.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "18px",
                        color: "#ef4444",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        flexShrink: 0,
                      }}
                      title="ลบลิงก์นี้"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── ส่งถึง (teacher เท่านั้น) ── */}
          {currentUser.role === "teacher" && (
            <div style={{ marginBottom: "20px" }}>
              <label style={L}>ส่งถึง</label>
              <div
                style={{ display: "flex", gap: "10px", marginBottom: "14px" }}
              >
                {(["all", "group", "personal"] as const).map((mode) => {
                  const labels = {
                    all: "📢 ทุกคน",
                    group: "👥 แบบกลุ่ม",
                    personal: "👤 แบบคนเดียว",
                  };
                  const active = sendMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setSendMode(mode);
                        setSelectedGroup("");
                        setSelectedStudent("");
                        setStudentSearch("");
                      }}
                      style={{
                        flex: 1,
                        padding: "10px 8px",
                        border: "2px solid",
                        borderColor: active ? "#158e6d" : "#d1d5db",
                        borderRadius: "10px",
                        fontWeight: "600",
                        fontSize: "13px",
                        background: active ? "#ecfdf5" : "white",
                        color: active ? "#065f46" : "#6b7280",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {labels[mode]}
                    </button>
                  );
                })}
              </div>

              {sendMode === "group" && (
                <div>
                  {groups.length === 0 ? (
                    <div
                      style={{
                        padding: "14px",
                        background: "#fef9c3",
                        border: "1px solid #fde68a",
                        borderRadius: "8px",
                        color: "#92400e",
                        fontSize: "13px",
                      }}
                    >
                      ⚠️ ยังไม่มีกลุ่ม — สร้างที่เมนู Group Notification
                      ก่อนนะครับ
                    </div>
                  ) : (
                    <select
                      value={selectedGroup}
                      onChange={(e) =>
                        setSelectedGroup((e.target as HTMLSelectElement).value)
                      }
                      style={{
                        ...I,
                        borderColor: selectedGroup ? "#158e6d" : "#d1d5db",
                      }}
                    >
                      <option value="">— เลือกกลุ่มที่ต้องการส่ง —</option>
                      {groups.map((g) => (
                        <option key={g.group_id} value={g.group_id}>
                          {g.name_group} ({g.student_id.length} คน)
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedGroup &&
                    (() => {
                      const g = groups.find(
                        (x) => x.group_id === selectedGroup,
                      );
                      return g ? (
                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "13px",
                            color: "#158e6d",
                            fontWeight: "600",
                          }}
                        >
                          ✅ จะส่งให้ {g.student_id.length} คนในกลุ่ม "
                          {g.name_group}"
                        </div>
                      ) : null;
                    })()}
                </div>
              )}

              {sendMode === "personal" && (
                <div>
                  <input
                    type="text"
                    placeholder="🔍 ค้นหาชื่อหรือรหัสนิสิต..."
                    value={studentSearch}
                    onInput={(e) =>
                      setStudentSearch((e.target as HTMLInputElement).value)
                    }
                    style={{ ...I, marginBottom: "8px", fontSize: "13px" }}
                  />
                  <div
                    style={{
                      border: "2px solid #d1d5db",
                      borderRadius: "8px",
                      maxHeight: "220px",
                      overflowY: "auto",
                      background: "#fafafa",
                    }}
                  >
                    {filteredStudents.length === 0 ? (
                      <div
                        style={{
                          padding: "16px",
                          textAlign: "center",
                          color: "#9ca3af",
                          fontSize: "13px",
                        }}
                      >
                        ไม่พบนิสิต
                      </div>
                    ) : (
                      filteredStudents.map((s) => {
                        const isSelected = selectedStudent === s.student_id;
                        return (
                          <div
                            key={s.student_id}
                            onClick={() => setSelectedStudent(s.student_id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              padding: "10px 16px",
                              cursor: "pointer",
                              background: isSelected
                                ? "#ecfdf5"
                                : "transparent",
                              borderBottom: "1px solid #f0f0f0",
                              borderLeft: isSelected
                                ? "3px solid #158e6d"
                                : "3px solid transparent",
                            }}
                          >
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                flexShrink: 0,
                                background: `hsl(${(s.student_id.charCodeAt(0) * 37) % 360}, 55%, 60%)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontWeight: "700",
                                fontSize: "13px",
                              }}
                            >
                              {studentName(s).charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontSize: "14px",
                                  fontWeight: isSelected ? "700" : "500",
                                  color: "#1f2937",
                                }}
                              >
                                {studentName(s)}
                              </div>
                              <div
                                style={{ fontSize: "12px", color: "#9ca3af" }}
                              >
                                {s.student_id}
                              </div>
                            </div>
                            {isSelected && (
                              <span
                                style={{ color: "#158e6d", fontSize: "18px" }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  {selectedStudent &&
                    (() => {
                      const s = students.find(
                        (x) => x.student_id === selectedStudent,
                      );
                      return s ? (
                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "13px",
                            color: "#158e6d",
                            fontWeight: "600",
                          }}
                        >
                          ✅ จะส่งให้ "{studentName(s)}" (รหัส {s.student_id})
                        </div>
                      ) : null;
                    })()}
                </div>
              )}
            </div>
          )}

          {/* แนบไฟล์ */}
          <div style={{ marginBottom: "24px" }}>
            <label style={L}>แนบไฟล์</label>
            <input
              type="file"
              multiple
              ref={filesRef}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,image/*"
              onChange={onFilesChange}
              style={{
                width: "100%",
                padding: "12px",
                border: "2px dashed #d1d5db",
                borderRadius: "8px",
                cursor: "pointer",
                background: "#f9fafb",
                fontSize: "14px",
              }}
            />
            <div style={H}>
              รองรับ: PDF, Word, Excel, CSV, PowerPoint, รูปภาพ / จำกัดไฟล์ละ ≤
              10MB
            </div>

            {parsing && (
              <div
                style={{
                  textAlign: "center",
                  color: "#2563eb",
                  marginTop: "10px",
                  fontSize: "14px",
                }}
              >
                ⏳ กำลังอ่านไฟล์...
              </div>
            )}

            {fileItems.length > 0 && (
              <div
                style={{
                  marginTop: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {fileItems.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 14px",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        style={{
                          width: "44px",
                          height: "44px",
                          objectFit: "cover",
                          borderRadius: "6px",
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: "24px" }}>
                        {fileIcon(p.name)}
                      </span>
                    )}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: "500",
                          fontSize: "14px",
                          color: "#1f2937",
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        {p.sizeMB.toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pdfPreviews.map((pdf) => (
              <div key={pdf.name} style={{ marginTop: "16px" }}>
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  📄 Preview: {pdf.name}
                </div>
                <div
                  style={{
                    borderRadius: "8px",
                    border: "2px solid #e5e7eb",
                    overflow: "hidden",
                  }}
                >
                  <iframe
                    src={pdf.url}
                    style={{ width: "100%", height: "380px", border: "none" }}
                    title={pdf.name}
                  />
                </div>
              </div>
            ))}

            {groupedData.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  📊 ตัวอย่างตารางสอบ ({examRowCount} รายการ)
                </div>
                <div
                  style={{
                    maxHeight: "420px",
                    overflowY: "auto",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                >
                  {groupedData.map((group, gi) => (
                    <div
                      key={gi}
                      style={{
                        borderBottom:
                          gi < groupedData.length - 1
                            ? "2px solid #e5e7eb"
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          background: "linear-gradient(135deg,#158e6d,#1ba87a)",
                          padding: "10px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span style={{ fontSize: "18px" }}>📅</span>
                        <span
                          style={{
                            color: "white",
                            fontWeight: "bold",
                            flex: 1,
                          }}
                        >
                          {group.date}
                        </span>
                        <span
                          style={{
                            background: "rgba(255,255,255,0.2)",
                            color: "white",
                            padding: "2px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        >
                          {group.exams.length} วิชา
                        </span>
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "12px",
                          }}
                        >
                          <thead style={{ background: "#f9fafb" }}>
                            <tr>
                              {examColumns.slice(1).map((col, i) => (
                                <th
                                  key={i}
                                  style={{
                                    padding: "8px",
                                    fontWeight: "600",
                                    color: "#374151",
                                    textAlign: "center",
                                    borderRight: "1px solid #e5e7eb",
                                    borderBottom: "1px solid #e5e7eb",
                                  }}
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {group.exams.map((exam, ei) => (
                              <tr
                                key={ei}
                                style={{
                                  background: ei % 2 === 0 ? "#fff" : "#f9fafb",
                                  borderBottom: "1px solid #f0f0f0",
                                }}
                              >
                                {examColumns.slice(1).map((col, ci) => (
                                  <td
                                    key={ci}
                                    style={{
                                      padding: "8px",
                                      textAlign: "center",
                                      borderRight: "1px solid #e5e7eb",
                                      color: "#374151",
                                    }}
                                  >
                                    {exam[col]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "#fee2e2",
                color: "#991b1b",
                borderRadius: "8px",
                marginBottom: "16px",
                fontWeight: "500",
                border: "1px solid #fecaca",
                fontSize: "14px",
              }}
            >
              ❌ {error}
            </div>
          )}
          {success && (
            <div
              style={{
                padding: "12px 16px",
                background: "#d1fae5",
                color: "#065f46",
                borderRadius: "8px",
                marginBottom: "16px",
                fontWeight: "500",
                border: "1px solid #a7f3d0",
                fontSize: "14px",
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              background: submitting ? "#9ca3af" : "#158e6d",
              color: "white",
              border: "none",
              padding: "14px",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: "16px",
            }}
          >
            {submitting ? "⏳ กำลังบันทึก..." : "ยืนยันเพิ่มข่าวสาร"}
          </button>
        </form>
      </div>
    </div>
  );
}

function fileIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "📄";
  if (n.endsWith(".doc") || n.endsWith(".docx")) return "📝";
  if (n.endsWith(".xls") || n.endsWith(".xlsx") || n.endsWith(".csv"))
    return "📊";
  if (n.endsWith(".ppt") || n.endsWith(".pptx")) return "📑";
  return "📎";
}

const L: any = {
  display: "block",
  fontWeight: "600",
  marginBottom: "8px",
  color: "#374151",
  fontSize: "14px",
};
const I: any = {
  width: "100%",
  padding: "12px 16px",
  border: "2px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  background: "white",
  boxSizing: "border-box",
};
const H: any = { fontSize: "13px", color: "#6b7280", marginTop: "6px" };
