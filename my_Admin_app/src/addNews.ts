// src/add-news.ts
import './style.css';

type SubmitResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

export function renderAddNewsPage(root: HTMLElement) {
  root.innerHTML = `
    <header class="topbar">
      <button class="btn-logout" id="btnBack">ย้อนกลับ</button>
    </header>

    <section class="container">
      <h2 class="page-title">เพิ่มข่าวสาร</h2>

      <form id="newsForm" class="card-form" novalidate>
        <div class="form-row">
          <label for="title">หัวเรื่อง <span class="req">*</span></label>
          <input id="title" name="title" type="text" class="input" maxlength="200" required placeholder="เช่น ประกาศตารางสอบกลางภาค">
          <div class="hint">สูงสุด 200 ตัวอักษร</div>
        </div>

        <div class="form-row">
          <label for="content">เนื้อหา <span class="req">*</span></label>
          <textarea id="content" name="content" class="textarea" rows="8" required placeholder="รายละเอียดข่าว/ประกาศ..."></textarea>
        </div>

        <div class="form-row">
          <label for="files">แนบไฟล์เอกสาร/รูปภาพ</label>
          <input id="files" name="files" type="file" class="file-input" multiple
                 accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*">
          <div id="filePreview" class="file-preview"></div>
          <div class="hint">อนุญาต: PDF, Word, Excel, PowerPoint, รูปภาพ / จำกัดไฟล์ละ ≤ 10MB</div>
        </div>

        <div id="formError" class="error" style="display:none"></div>
        <div id="formSuccess" class="success" style="display:none"></div>

        <div class="actions-row">
          <button type="submit" class="action-btn">ยืนยันเพิ่มข่าวสาร</button>
        </div>
      </form>
    </section>
  `;

  // ปุ่มย้อนกลับ (กลับไปหน้าเดิมของคุณ)
  document.getElementById('btnBack')?.addEventListener('click', () => {
    history.back();
  });

  const form = document.getElementById('newsForm') as HTMLFormElement;
  const filesInput = document.getElementById('files') as HTMLInputElement;
  const preview = document.getElementById('filePreview') as HTMLDivElement;
  const errBox = document.getElementById('formError') as HTMLDivElement;
  const okBox = document.getElementById('formSuccess') as HTMLDivElement;

  // พรีวิวไฟล์ที่เลือก (รูปจะแสดง thumbnail, ไฟล์เอกสารแสดงชื่อ/ขนาด)
  filesInput.addEventListener('change', () => {
    preview.innerHTML = '';
    const files = filesInput.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((f) => {
      const sizeMB = f.size / (1024 * 1024);
      const card = document.createElement('div');
      card.className = 'file-chip';

      if (f.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        img.alt = f.name;
        img.className = 'thumb';
        card.appendChild(img);
      }

      const meta = document.createElement('div');
      meta.className = 'file-meta';
      meta.innerHTML = `
        <div class="file-name">${escapeHtml(f.name)}</div>
        <div class="file-size">${sizeMB.toFixed(2)} MB</div>
      `;
      card.appendChild(meta);

      preview.appendChild(card);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.style.display = 'none';
    okBox.style.display = 'none';

    const title = (document.getElementById('title') as HTMLInputElement).value.trim();
    const content = (document.getElementById('content') as HTMLTextAreaElement).value.trim();
    const files = filesInput.files;

    // ตรวจง่าย ๆ
    if (!title) return showError('กรุณากรอกหัวเรื่อง');
    if (!content) return showError('กรุณากรอกเนื้อหา');

    // ตรวจขนาดไฟล์ (≤ 10MB/ไฟล์)
    if (files && files.length) {
      for (const f of Array.from(files)) {
        if (f.size > 10 * 1024 * 1024) {
          return showError(`ไฟล์ "${f.name}" มีขนาดเกิน 10MB`);
        }
      }
    }

    // เตรียม multipart/form-data
    const fd = new FormData();
    fd.append('title', title);
    fd.append('content', content);
    if (files) Array.from(files).forEach((f) => fd.append('files', f));

    // ส่งไป backend: POST /api/news
    toggleForm(form, true);
    const result = await postNews(fd);
    toggleForm(form, false);

    if (!result.ok) return showError(result.message || 'ไม่สามารถบันทึกข่าวได้');
    okBox.textContent = 'บันทึกข่าวสำเร็จ!';
    okBox.style.display = 'block';
    form.reset();
    preview.innerHTML = '';
  });

  function showError(msg: string) {
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }
}

function toggleForm(form: HTMLFormElement, loading: boolean) {
  const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  btn.disabled = loading;
  btn.textContent = loading ? 'กำลังบันทึก…' : 'ยืนยันเพิ่มข่าวสาร';
}

async function postNews(fd: FormData): Promise<SubmitResult> {
  try {
    const res = await fetch('/api/news', {
      method: 'POST',
      body: fd, // ไม่ต้องตั้ง headers ให้ FormData
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

function escapeHtml(str: string) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
