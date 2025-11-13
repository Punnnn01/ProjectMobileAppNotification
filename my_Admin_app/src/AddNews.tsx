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
    <section className="container">
      <h2 className="page-title">เพิ่มข่าวสาร</h2>

      <form id="newsForm" className="card-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="title">หัวเรื่อง <span className="req">*</span></label>
          <input id="title" name="title" type="text" className="input" maxLength={200} required placeholder="เช่น ประกาศตารางสอบกลางภาค" ref={titleRef} />
          <div className="hint">สูงสุด 200 ตัวอักษร</div>
        </div>

        <div className="form-row">
          <label htmlFor="content">เนื้อหา <span className="req">*</span></label>
          <textarea id="content" name="content" className="textarea" rows={8} required placeholder="รายละเอียดข่าว/ประกาศ..." ref={contentRef} />
        </div>

        <div className="form-row">
          <label htmlFor="files">แนบไฟล์เอกสาร/รูปภาพ</label>
          <input id="files" name="files" type="file" className="file-input" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" onChange={onFilesChange} ref={filesRef} />
          <div id="filePreview" className="file-preview">
            {previewItems.map((p) => (
              <div className="file-chip" key={p.id}>
                {p.url ? <img src={p.url} alt={p.name} className="thumb" /> : null}
                <div className="file-meta">
                  <div className="file-name">{p.name}</div>
                  <div className="file-size">{p.sizeMB.toFixed(2)} MB</div>
                </div>
              </div>
            ))}
          </div>
          <div className="hint">อนุญาต: PDF, Word, Excel, PowerPoint, รูปภาพ / จำกัดไฟล์ละ ≤ 10MB</div>
        </div>

        {error && <div id="formError" className="error">{error}</div>}
        {success && <div id="formSuccess" className="success">{success}</div>}

        <div className="actions-row">
          <button type="submit" className="action-btn" disabled={submitting}>{submitting ? 'กำลังบันทึก…' : 'ยืนยันเพิ่มข่าวสาร'}</button>
        </div>
      </form>
    </section>
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
