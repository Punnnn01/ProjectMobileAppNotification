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

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  url: string;
  file: File;
}

// ฟังก์ชันแปลง Excel serial date เป็นวันที่
function excelDateToJSDate(serial: number): Date {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

// ฟังก์ชันแปลงวันที่เป็นรูปแบบที่อ่านง่าย
function formatDate(value: any): string {
  if (!value) return '-';

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

  if (value instanceof Date) {
    const day = value.getDate().toString().padStart(2, '0');
    const month = (value.getMonth() + 1).toString().padStart(2, '0');
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const str = String(value).trim();
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    const day = parsedDate.getDate().toString().padStart(2, '0');
    const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
    const year = parsedDate.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return str;
}

// ฟังก์ชันแปลงเวลา
function formatTime(value: any): string {
  if (!value) return '-';

  if (typeof value === 'number' && value < 1) {
    const totalSeconds = Math.round(value * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  return String(value).trim();
}

// ฟังก์ชันแปลงขนาดไฟล์
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ฟังก์ชันตรวจสอบประเภทไฟล์
function getFileIcon(type: string): string {
  if (type.includes('pdf')) return '📄';
  if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) return '📊';
  if (type.includes('image')) return '🖼️';
  if (type.includes('word') || type.includes('document')) return '📝';
  return '📎';
}

const AddExamSchedule = (): JSX.Element => {
  const [rows, setRows] = useState<ExamRow[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = (e: any) => {
    const files = Array.from((e.target as HTMLInputElement).files || []) as File[];
    if (files.length === 0) return;

    setUploading(true);

    files.forEach((file) => {
      const fileUrl = URL.createObjectURL(file);
      
      // เพิ่มไฟล์ลงรายการ
      const newFile: UploadedFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: fileUrl,
        file: file
      };
      
      setUploadedFiles(prev => [...prev, newFile]);

      // ถ้าเป็น Excel หรือ CSV ให้อ่านและแสดงข้อมูล
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

            const parsed = json.map((row) => ({
              date: formatDate(row['วันที่']),
              time: formatTime(row['เวลา']),
              subject: row['วิชา'] || '-',
              group: row['หมู่เรียน'] || '-',
              studentCount: Number(row['จำนวนนิสิต']) || 0,
              room: row['ห้องสอบ'] || '-',
              examiner: row['กรรมการคุมสอบ'] || '-',
            })) as ExamRow[];

            setRows(prev => [...prev, ...parsed]);
          } catch (error) {
            console.error('Error parsing file:', error);
            alert(`❌ เกิดข้อผิดพลาดในการอ่านไฟล์ ${file.name}`);
          }
        };
        reader.readAsBinaryString(file);
      }
    });

    setUploading(false);
  };

  const handleRemoveFile = (index: number) => {
    const file = uploadedFiles[index];
    URL.revokeObjectURL(file.url);
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    try {
      console.log('ส่งข้อมูลไป backend:');
      console.log('- ตารางสอบ:', rows);
      console.log('- ไฟล์ที่อัปโหลด:', uploadedFiles);
      
      // TODO: ส่งข้อมูลไป backend ที่นี่
      
      alert(`✅ ส่งตารางสอบและไฟล์ ${uploadedFiles.length} ไฟล์เรียบร้อยแล้ว`);
      setRows([]);
      setUploadedFiles([]);
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาด');
    }
  };

  const handleClearAll = () => {
    uploadedFiles.forEach(file => URL.revokeObjectURL(file.url));
    setRows([]);
    setUploadedFiles([]);
  };

  return (
    <div style={{ 
      maxWidth: '1200px', 
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

        {/* File Upload Section */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#374151',
            fontSize: '14px'
          }}>
            อัปโหลดไฟล์ตารางสอบ:
          </label>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv, .pdf, .doc, .docx, image/*" 
            multiple
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
          <p style={{ 
            fontSize: '13px', 
            marginTop: '8px', 
            color: '#6b7280'
          }}>
            💡 รองรับ: Excel, CSV, PDF, Word, รูปภาพ (สามารถเลือกหลายไฟล์พร้อมกัน)
          </p>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#374151'
              }}>
                📎 ไฟล์ที่อัปโหลด ({uploadedFiles.length})
              </h3>
              <button
                onClick={handleClearAll}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🗑️ ลบทั้งหมด
              </button>
            </div>
            
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {uploadedFiles.map((file, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: index < uploadedFiles.length - 1 ? '1px solid #e5e7eb' : 'none',
                    background: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <span style={{ fontSize: '24px' }}>
                      {getFileIcon(file.type)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#374151',
                        marginBottom: '4px'
                      }}>
                        {file.name}
                      </p>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#6b7280'
                      }}>
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Preview Button for Images and PDFs */}
                    {(file.type.includes('image') || file.type.includes('pdf')) && (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          textDecoration: 'none',
                          fontWeight: '500'
                        }}
                      >
                        👁️ ดู
                      </a>
                    )}
                    
                    <button
                      onClick={() => handleRemoveFile(index)}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploading && (
          <p style={{ 
            fontSize: '14px', 
            marginTop: '8px', 
            color: '#2563eb',
            textAlign: 'center',
            padding: '12px',
            background: '#dbeafe',
            borderRadius: '8px'
          }}>
            ⏳ กำลังอ่านไฟล์...
          </p>
        )}

        {/* Table Preview (only for Excel/CSV files) */}
        {rows.length > 0 && (
          <>
            <div style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              marginBottom: '16px',
              textAlign: 'center',
              padding: '12px',
              background: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #bbf7d0'
            }}>
              📊 พบข้อมูลตารางสอบ <strong>{rows.length}</strong> รายการ
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
          </>
        )}

        {/* Confirm Button */}
        {(uploadedFiles.length > 0 || rows.length > 0) && (
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
            ✅ ยืนยันและบันทึกข้อมูล
          </button>
        )}

        {/* Empty State */}
        {uploadedFiles.length === 0 && rows.length === 0 && !uploading && (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: '#9ca3af',
            fontSize: '14px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <p style={{ fontWeight: '600', fontSize: '16px', marginBottom: '8px' }}>
              กรุณาอัปโหลดไฟล์ตารางสอบ
            </p>
            <p style={{ fontSize: '13px' }}>
              รองรับไฟล์: Excel, CSV, PDF, Word, รูปภาพ
            </p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              💡 สามารถเลือกหลายไฟล์พร้อมกันได้
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddExamSchedule;
