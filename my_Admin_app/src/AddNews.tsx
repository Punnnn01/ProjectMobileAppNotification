// src/AddNews.tsx
import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
import './style.css';

type SubmitResult = { ok: true; id?: string } | { ok: false, message: string };

export default function AddNews(): JSX.Element {
  const titleRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const filesRef = useRef<HTMLInputElement | null>(null);

  const [previewItems, setPreviewItems] = useState<Array<{ id: string; name: string; sizeMB: number; url?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onFilesChange(e: any) {
    setPreviewItems([]);
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    const items: Array<{ id: string; name: string; sizeMB: number; url?: string }> = [];
    Array.from(files).forEach((f, i) => {
      const sizeMB = f.size / (1024 * 1024);
      const item: any = { id: String(i) + '_' + f.name, name: f.name, sizeMB };
      if (f.type.startsWith('image/')) item.url = URL.createObjectURL(f);
      items.push(item);
    });
    setPreviewItems(items);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const title = titleRef.current?.value.trim() ?? '';
    const content = contentRef.current?.value.trim() ?? '';
    const files = filesRef.current?.files;

    if (!title) return setError('กรุณากรอกหัวเรื่อง');
    if (!content) return setError('กรุณากรอกเนื้อหา');

    if (files && files.length) {
      for (const f of Array.from(files)) {
        if (f.size > 10 * 1024 * 1024) return setError(`ไฟล์ "${f.name}" มีขนาดเกิน 10MB`);
      }
    }

    const fd = new FormData();
    fd.append('title', title);
    fd.append('content', content);
    if (files) Array.from(files).forEach((f) => fd.append('files', f));

    setSubmitting(true);
    const result = await postNews(fd);
    setSubmitting(false);

    if (!result.ok) return setError(result.message || 'ไม่สามารถบันทึกข่าวได้');
    setSuccess('บันทึกข่าวสำเร็จ!');
    // reset
    (titleRef.current as HTMLInputElement).value = '';
    (contentRef.current as HTMLTextAreaElement).value = '';
    if (filesRef.current) filesRef.current.value = '';
    setPreviewItems([]);
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
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
          เพิ่มข่าวสาร
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Title Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#374151',
              fontSize: '14px'
            }}>
              หัวเรื่อง <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              placeholder="เช่น ประกาศตารางสอบกลางภาค" 
              maxLength={200} 
              required 
              ref={titleRef}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            />
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              สูงสุด 200 ตัวอักษร
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
              เนื้อหา <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea 
              rows={8} 
              placeholder="รายละเอียดข่าว/ประกาศ..." 
              required 
              ref={contentRef}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                minHeight: '150px',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* File Upload */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#374151',
              fontSize: '14px'
            }}>
              แนบไฟล์เอกสาร/รูปภาพ
            </label>
            <input 
              type="file" 
              multiple 
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" 
              onChange={onFilesChange} 
              ref={filesRef}
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
            
            {/* File Preview */}
            {previewItems.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {previewItems.map((p) => (
                  <div 
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    {p.url && (
                      <img 
                        src={p.url} 
                        alt={p.name}
                        style={{
                          width: '48px',
                          height: '48px',
                          objectFit: 'cover',
                          borderRadius: '6px'
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', fontSize: '14px', color: '#1f2937' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {p.sizeMB.toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
              อนุญาต: PDF, Word, Excel, PowerPoint, รูปภาพ / จำกัดไฟล์ละ ≤ 10MB
            </div>
          </div>

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
              ❌ {error}
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
              ✅ {success}
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={submitting}
            style={{
              width: '100%',
              background: submitting ? '#9ca3af' : '#158e6d',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontSize: '16px'
            }}
          >
            {submitting ? '⏳ กำลังบันทึก...' : 'ยืนยันเพิ่มข่าวสาร'}
          </button>
        </form>
      </div>
    </div>
  );
}

async function postNews(fd: FormData): Promise<SubmitResult> {
  try {
    const res = await fetch('/api/news', {
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

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
