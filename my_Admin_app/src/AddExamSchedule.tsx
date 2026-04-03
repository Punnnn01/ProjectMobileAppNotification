// src/AddExamSchedule.tsx - FIXED VERSION WITH PUSH NOTIFICATION
// แทนที่ไฟล์เดิมด้วยไฟล์นี้

import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
import * as XLSX from 'xlsx';
import './style.css';

interface ExamRow {
  [key: string]: any;
}

interface GroupedExam {
  date: string;
  displayDate: string;
  exams: ExamRow[];
}

type SubmitResult = { ok: true; id?: string } | { ok: false, message: string };

const BACKEND_URL = 'http://localhost:8080'; // Node.js Backend for Push Notifications

// ฟังก์ชันแปลง Excel serial date เป็นวันที่
function excelDateToJSDate(serial: number): Date {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

// ฟังก์ชันแปลงค่าให้เป็น string
function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  
  if (typeof value === 'number' && value > 40000 && value < 50000) {
    try {
      const date = excelDateToJSDate(value);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return String(value);
    }
  }
  
  if (typeof value === 'number' && value > 0 && value < 1) {
    const totalSeconds = Math.round(value * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return String(value);
}

// ฟังก์ชัน Group ตามวัน
function groupByDate(rows: ExamRow[], columns: string[]): GroupedExam[] {
  const dateColumn = columns[0];
  
  const grouped = rows.reduce((acc: { [key: string]: ExamRow[] }, row) => {
    const dateValue = row[dateColumn];
    if (!acc[dateValue]) {
      acc[dateValue] = [];
    }
    acc[dateValue].push(row);
    return acc;
  }, {});

  return Object.entries(grouped).map(([date, exams]) => ({
    date,
    displayDate: formatThaiDate(date),
    exams
  }));
}

// ฟังก์ชันแปลงวันที่เป็นภาษาไทย
function formatThaiDate(dateStr: string): string {
  const thaiDays: { [key: string]: string } = {
    'จ': 'จันทร์',
    'อ': 'อังคาร',
    'พ': 'พุธ',
    'พฤ': 'พฤหัสบดี',
    'ศ': 'ศุกร์',
    'ส': 'เสาร์',
    'อา': 'อาทิตย์'
  };

  const thaiMonths: { [key: string]: string } = {
    'ม.ค.': 'มกราคม',
    'ก.พ.': 'กุมภาพันธ์',
    'มี.ค.': 'มีนาคม',
    'เม.ย.': 'เมษายน',
    'พ.ค.': 'พฤษภาคม',
    'มิ.ย.': 'มิถุนายน',
    'ก.ค.': 'กรกฎาคม',
    'ส.ค.': 'สิงหาคม',
    'ก.ย.': 'กันยายน',
    'ต.ค.': 'ตุลาคม',
    'พ.ย.': 'พฤศจิกายน',
    'ธ.ค.': 'ธันวาคม'
  };

  const parts = dateStr.trim().split(/\s+/);
  
  if (parts.length >= 3) {
    const day = thaiDays[parts[0]] || parts[0];
    const date = parts[1];
    const month = thaiMonths[parts[2]] || parts[2];
    
    return `${day}ที่ ${date} ${month}`;
  }
  
  return dateStr;
}

const AddExamSchedule = (): JSX.Element => {
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const filesRef = useRef<HTMLInputElement | null>(null);

  const [rows, setRows] = useState<ExamRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedExam[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [_fileType, setFileType] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = (e: any) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileType(file.type);
    setUploading(true);
    setError(null);
    setSuccess(null);

    // ตรวจสอบขนาดไฟล์
    if (file.size > 10 * 1024 * 1024) {
      setError(`ไฟล์ "${file.name}" มีขนาดเกิน 10MB`);
      setUploading(false);
      return;
    }

    // ถ้าเป็น PDF - แสดง preview
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setRows([]);
      setColumns([]);
      setGroupedData([]);
      setUploading(false);
      return;
    }

    // ถ้าเป็น Excel/CSV - แสดงตาราง
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { 
            type: 'binary',
            cellDates: true
          });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json: any[] = XLSX.utils.sheet_to_json(worksheet);

          if (json.length > 0) {
            const columnNames = Object.keys(json[0]);
            setColumns(columnNames);

            const parsed = json.map((row) => {
              const formattedRow: ExamRow = {};
              columnNames.forEach(col => {
                formattedRow[col] = formatValue(row[col]);
              });
              return formattedRow;
            });

            setRows(parsed);
            
            // Group ตามวัน
            const grouped = groupByDate(parsed, columnNames);
            setGroupedData(grouped);
            
            setPdfUrl(null);
          } else {
            setError('❌ ไม่พบข้อมูลในไฟล์');
          }
        } catch (error) {
          console.error('Error parsing file:', error);
          setError('❌ เกิดข้อผิดพลาดในการอ่านไฟล์');
        } finally {
          setUploading(false);
        }
      };

      reader.readAsBinaryString(file);
    } else {
      setError('❌ รองรับเฉพาะไฟล์ Excel (.xlsx, .xls), CSV และ PDF เท่านั้น');
      setUploading(false);
      setRows([]);
      setColumns([]);
      setGroupedData([]);
      setPdfUrl(null);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // ใช้ชื่อไฟล์เป็นหัวข้อ (ตัดนามสกุลออก)
    const title = fileName.replace(/\.[^/.]+$/, '');
    const content = contentRef.current?.value.trim() ?? '';
    const file = filesRef.current?.files?.[0];

    if (!file) return setError('กรุณาอัปโหลดไฟล์ตารางสอบ');

    const fd = new FormData();
    fd.append('title', title);
    fd.append('content', content);
    fd.append('files', file);

    setSubmitting(true);
    
    // Step 1: บันทึกตารางสอบ
    const result = await postExamSchedule(fd);
    
    if (!result.ok) {
      setSubmitting(false);
      return setError(result.message || 'ไม่สามารถบันทึกตารางสอบได้');
    }

    // Step 2: ส่ง Push Notification
    const newsId = result.id || '';
    const pushResult = await sendPushNotification(title, newsId);
    
    setSubmitting(false);

    if (pushResult.ok) {
      setSuccess(`✅ บันทึกตารางสอบสำเร็จ! ส่ง Push Notification แล้ว (${pushResult.count} คน)`);
    } else {
      setSuccess('✅ บันทึกตารางสอบสำเร็จ! ⚠️ แต่ส่ง Push Notification ไม่สำเร็จ');
    }
    
    // Reset
    if (contentRef.current) contentRef.current.value = '';
    if (filesRef.current) filesRef.current.value = '';
    setRows([]);
    setColumns([]);
    setGroupedData([]);
    setFileName('');
    setFileType(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '40px auto', 
      padding: '0 24px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '24px',
          textAlign: 'center',
          color: '#1f2937'
        }}>
          เพิ่มตารางสอบ
        </h2>

        <form onSubmit={handleSubmit}>
          {/* File Upload Section */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#374151',
              fontSize: '14px'
            }}>
              อัปโหลดไฟล์ตารางสอบ <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv, .pdf" 
              onChange={handleFileUpload}
              ref={filesRef}
              required
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                background: '#f9fafb',
                fontSize: '14px'
              }}
            />
            {fileName && (
              <div style={{ 
                fontSize: '14px', 
                marginTop: '8px', 
                color: '#6b7280',
                padding: '8px 12px',
                background: '#f0fdf4',
                borderRadius: '6px',
                border: '1px solid #bbf7d0'
              }}>
                📄 ไฟล์: <strong>{fileName}</strong>
                <div style={{ fontSize: '12px', marginTop: '4px', color: '#059669' }}>
                  ✅ หัวข้อจะใช้: "{fileName.replace(/\.[^/.]+$/, '')}"
                </div>
              </div>
            )}
            {uploading && (
              <p style={{ 
                fontSize: '14px', 
                marginTop: '8px', 
                color: '#2563eb',
                textAlign: 'center'
              }}>
                ⏳ กำลังอ่านไฟล์...
              </p>
            )}
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
              รองรับ: Excel (.xlsx, .xls), CSV, PDF / จำกัด ≤ 10MB
            </div>
          </div>

          {/* Content Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#374151',
              fontSize: '14px'
            }}>
              รายละเอียดเพิ่มเติม
            </label>
            <textarea 
              rows={4} 
              placeholder="เพิ่มรายละเอียด (ถ้ามี)" 
              ref={contentRef}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                minHeight: '100px',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* PDF Preview */}
          {pdfUrl && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                marginBottom: '12px',
                fontWeight: '600'
              }}>
                📄 ตัวอย่าง PDF:
              </div>
              <div style={{
                borderRadius: '8px',
                border: '2px solid #e5e7eb',
                overflow: 'hidden',
                background: '#f9fafb'
              }}>
                <iframe
                  src={pdfUrl}
                  style={{
                    width: '100%',
                    height: '400px',
                    border: 'none'
                  }}
                  title="PDF Preview"
                />
              </div>
            </div>
          )}

          {/* Grouped Exam Schedule Preview */}
          {groupedData.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                marginBottom: '12px',
                fontWeight: '600'
              }}>
                📊 ตัวอย่างตารางสอบ:
              </div>
              
              <div style={{ 
                fontSize: '13px', 
                color: '#6b7280', 
                marginBottom: '12px',
                textAlign: 'center',
                padding: '10px',
                background: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #bbf7d0'
              }}>
                พบข้อมูล <strong>{rows.length}</strong> รายการ
              </div>

              <div style={{ 
                maxHeight: '400px',
                overflowY: 'auto',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                background: '#fff'
              }}>
                {groupedData.map((group, groupIndex) => (
                  <div 
                    key={groupIndex}
                    style={{
                      borderBottom: groupIndex < groupedData.length - 1 ? '2px solid #e5e7eb' : 'none'
                    }}
                  >
                    {/* Date Header */}
                    <div style={{
                      background: 'linear-gradient(135deg, #158e6d 0%, #1ba87a 100%)',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '20px' }}>📅</span>
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          margin: 0
                        }}>
                          {group.displayDate}
                        </h3>
                      </div>
                      <div style={{
                        background: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {group.exams.length} วิชา
                      </div>
                    </div>

                    {/* Exams Table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '12px'
                      }}>
                        <thead style={{ 
                          background: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          <tr>
                            {columns.slice(1).map((col, index) => (
                              <th key={index} style={{ 
                                padding: '10px 8px',
                                fontWeight: '600',
                                color: '#374151',
                                textAlign: 'center',
                                borderRight: index < columns.length - 2 ? '1px solid #e5e7eb' : 'none'
                              }}>
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.exams.map((exam, examIndex) => (
                            <tr 
                              key={examIndex}
                              style={{ 
                                background: examIndex % 2 === 0 ? '#fff' : '#f9fafb',
                                borderBottom: '1px solid #e5e7eb'
                              }}
                            >
                              {columns.slice(1).map((col, colIndex) => (
                                <td key={colIndex} style={{ 
                                  padding: '10px 8px',
                                  color: '#374151',
                                  textAlign: 'center',
                                  borderRight: colIndex < columns.length - 2 ? '1px solid #e5e7eb' : 'none'
                                }}>
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

          {/* Error Message */}
          {error && (
            <div style={{ 
              padding: '12px 16px', 
              background: '#fee2e2', 
              color: '#991b1b', 
              borderRadius: '8px', 
              marginBottom: '16px',
              fontWeight: '500',
              border: '1px solid #fecaca',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div style={{ 
              padding: '12px 16px', 
              background: '#d1fae5', 
              color: '#065f46', 
              borderRadius: '8px', 
              marginBottom: '16px',
              fontWeight: '500',
              border: '1px solid #a7f3d0',
              fontSize: '14px'
            }}>
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={submitting || !fileName}
            style={{
              width: '100%',
              background: (submitting || !fileName) ? '#9ca3af' : '#158e6d',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: (submitting || !fileName) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontSize: '16px'
            }}
          >
            {submitting ? '⏳ กำลังบันทึก...' : 'ยืนยันเพิ่มตารางสอบ'}
          </button>
        </form>
      </div>
    </div>
  );
};

async function postExamSchedule(fd: FormData): Promise<SubmitResult> {
  try {
    const res = await fetch('http://localhost:8080/api/news', {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error(err?.message || `HTTP ${res.status}`);
    }
    const data = (await safeJson(res)) || {};
    return { ok: true, id: data.id };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'network error' };
  }
}

async function sendPushNotification(examTitle: string, newsId: string): Promise<{ ok: boolean; count?: number }> {
  try {
    console.log('📤 Sending push notification for exam schedule:', examTitle);
    
    const res = await fetch(`${BACKEND_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '📅 ตารางสอบใหม่',
        body: examTitle,
        targetGroup: 'all',
        newsId: newsId
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log('✅ Push notification sent:', data);
    
    return { 
      ok: true, 
      count: data.sentCount || 0 
    };
  } catch (e: any) {
    console.error('❌ Failed to send push notification:', e);
    return { ok: false };
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default AddExamSchedule;
