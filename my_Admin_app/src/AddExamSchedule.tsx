import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import * as XLSX from 'xlsx';

interface ExamRow {
  date: string;
  time: string;
  subject: string;
  group: string;
  studentCount: number;
  room: string;
  examiner: string;
}

// ฟังก์ชันแปลง Excel serial date เป็นวันที่
function excelDateToJSDate(serial: number): Date {
  // Excel stores dates as days since 1899-12-30 (with 1900-01-01 being day 1)
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

// ฟังก์ชันแปลงวันที่เป็นรูปแบบที่อ่านง่าย
function formatDate(value: any): string {
  if (!value) return '-';

  // ถ้าเป็นตัวเลข (Excel serial date)
  if (typeof value === 'number') {
    try {
      const date = excelDateToJSDate(value);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error converting date:', error);
      return String(value);
    }
  }

  // ถ้าเป็น Date object
  if (value instanceof Date) {
    const day = value.getDate().toString().padStart(2, '0');
    const month = (value.getMonth() + 1).toString().padStart(2, '0');
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // ถ้าเป็นข้อความแล้ว (รูปแบบวันที่ต่างๆ)
  const str = String(value).trim();
  
  // ลองแปลงเป็น Date
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    const day = parsedDate.getDate().toString().padStart(2, '0');
    const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
    const year = parsedDate.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // ถ้าแปลงไม่ได้ ให้คืนค่าเดิม
  return str;
}

// ฟังก์ชันแปลงเวลา
function formatTime(value: any): string {
  if (!value) return '-';

  // ถ้าเป็นตัวเลข (Excel time serial - fraction of day)
  if (typeof value === 'number' && value < 1) {
    const totalSeconds = Math.round(value * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // ถ้าเป็นข้อความ
  return String(value).trim();
}

const AddExamSchedule = (): JSX.Element => {
  const [rows, setRows] = useState<ExamRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = (e: any) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { 
          type: 'binary',
          cellDates: true // พยายามแปลงวันที่อัตโนมัติ
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        console.log('Raw Excel data:', json);

        const parsed = json.map((row) => {
          const dateValue = row['วันที่'];
          const timeValue = row['เวลา'];

          console.log('Processing row:', { dateValue, timeValue });

          return {
            date: formatDate(dateValue),
            time: formatTime(timeValue),
            subject: row['วิชา'] || '-',
            group: row['หมู่เรียน'] || '-',
            studentCount: Number(row['จำนวนนิสิต']) || 0,
            room: row['ห้องสอบ'] || '-',
            examiner: row['กรรมการคุมสอบ'] || '-',
          };
        }) as ExamRow[];

        console.log('Parsed data:', parsed);
        setRows(parsed);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('❌ เกิดข้อผิดพลาดในการอ่านไฟล์');
      } finally {
        setUploading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleConfirm = async () => {
    try {
      console.log('ส่งข้อมูลไป backend:', rows);
      alert('✅ ส่งตารางสอบเรียบร้อยแล้ว');
      setRows([]);
      setFileName(null);
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาด');
    }
  };

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '40px auto', 
      padding: '0 24px'
    }}>
      {/* Card Container */}
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

        {/* File Upload Section */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#374151',
            fontSize: '14px'
          }}>
            อัปโหลดไฟล์ Excel/CSV:
          </label>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload}
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
            <p style={{ 
              fontSize: '14px', 
              marginTop: '8px', 
              color: '#6b7280',
              padding: '8px 12px',
              background: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              📄 ไฟล์ที่เลือก: <strong>{fileName}</strong>
            </p>
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
        </div>

        {/* Table Preview */}
        {rows.length > 0 && (
          <>
            <div style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              marginBottom: '16px',
              textAlign: 'center',
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '8px'
            }}>
              📊 พบข้อมูล <strong>{rows.length}</strong> รายการ
            </div>

            <div style={{ 
              overflowX: 'auto',
              marginBottom: '24px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead style={{ background: '#f3f4f6' }}>
                  <tr>
                    <th style={{ 
                      border: '1px solid #e5e7eb', 
                      padding: '12px 8px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>วันที่</th>
                    <th style={{ 
                      border: '1px solid #e5e7eb', 
                      padding: '12px 8px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>เวลา</th>
                    <th style={{ 
                      border: '1px solid #e5e7eb', 
                      padding: '12px 8px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>วิชา</th>
                    <th style={{ 
                      border: '1px solid #e5e7eb', 
                      padding: '12px 8px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>หมู่เรียน</th>
                    <th style={{ 
                      border: '1px solid #e5e7eb', 
                      padding: '12px 8px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>จำนวนนิสิต</th>
                    <th style={{ 
                      border: '1px solid #e5e7eb', 
                      padding: '12px 8px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>ห้องสอบ</th>
                    <th style={{ 
                      border: '1px solid #e5e7eb', 
                      padding: '12px 8px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>กรรมการคุมสอบ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} style={{ 
                      textAlign: 'center',
                      background: index % 2 === 0 ? 'white' : '#f9fafb'
                    }}>
                      <td style={{ 
                        border: '1px solid #e5e7eb', 
                        padding: '10px 8px',
                        color: '#374151'
                      }}>{row.date}</td>
                      <td style={{ 
                        border: '1px solid #e5e7eb', 
                        padding: '10px 8px',
                        color: '#374151'
                      }}>{row.time}</td>
                      <td style={{ 
                        border: '1px solid #e5e7eb', 
                        padding: '10px 8px',
                        color: '#374151'
                      }}>{row.subject}</td>
                      <td style={{ 
                        border: '1px solid #e5e7eb', 
                        padding: '10px 8px',
                        color: '#374151'
                      }}>{row.group}</td>
                      <td style={{ 
                        border: '1px solid #e5e7eb', 
                        padding: '10px 8px',
                        color: '#374151'
                      }}>{row.studentCount}</td>
                      <td style={{ 
                        border: '1px solid #e5e7eb', 
                        padding: '10px 8px',
                        color: '#374151'
                      }}>{row.room}</td>
                      <td style={{ 
                        border: '1px solid #e5e7eb', 
                        padding: '10px 8px',
                        color: '#374151'
                      }}>{row.examiner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleConfirm}
              style={{
                width: '100%',
                background: '#158e6d',
                color: 'white',
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ✅ ยืนยันตารางสอบ
            </button>
          </>
        )}

        {/* Empty State */}
        {rows.length === 0 && !uploading && (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: '#9ca3af',
            fontSize: '14px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <p>กรุณาอัปโหลดไฟล์ตารางสอบ</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>
              รองรับไฟล์: Excel (.xlsx, .xls) และ CSV
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddExamSchedule;
