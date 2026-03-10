// src/NewsList.tsx
import type { JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { LoggedInUser } from './Login';
import './style.css';

interface NewsFile {
  file_name: string;
  fileURL: string;
  file_size?: number;
  mime_type?: string;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category?: string;
  time?: any;
  group_id?: string;
  files?: NewsFile[];
  author?: {
    admin_id: string;
    admin_name: string;
    role?: string;
  };
}

interface Props {
  currentUser: LoggedInUser;
}

function fileIcon(mime?: string, name?: string): string {
  if (!mime && !name) return '📎';
  const m = mime || '';
  const n = (name || '').toLowerCase();
  if (m.startsWith('image/')) return '🖼️';
  if (m === 'application/pdf' || n.endsWith('.pdf')) return '📄';
  if (m.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return '📝';
  if (m.includes('excel') || n.endsWith('.xls') || n.endsWith('.xlsx')) return '📊';
  if (m.includes('powerpoint') || n.endsWith('.ppt') || n.endsWith('.pptx')) return '📊';
  return '📎';
}

function fileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewsList({ currentUser }: Props): JSX.Element {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  useEffect(() => { fetchNews(); }, []);

  async function fetchNews() {
    try {
      setLoading(true);
      const url = currentUser.role === 'teacher'
        ? `http://localhost:8080/api/news?author_id=${currentUser.docId}`
        : `http://localhost:8080/api/news`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNews(data.news || []);
    } catch (e: any) {
      setError(e?.message || 'ไม่สามารถโหลดข่าวได้');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  }

  function toggleSelectAll() {
    setSelectedIds(selectedIds.size === news.length ? new Set() : new Set(news.map(n => n.id)));
  }

  function toggleFiles(id: string) {
    const s = new Set(expandedFiles);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedFiles(s);
  }

  async function handleDelete() {
    if (selectedIds.size === 0) return alert('กรุณาเลือกข่าวที่ต้องการลบ');
    if (!confirm(`ต้องการลบข่าว ${selectedIds.size} รายการ?\nการลบจะไม่สามารถกู้คืนได้`)) return;
    setDeleting(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`http://localhost:8080/api/news/${id}`, { method: 'DELETE' });
        res.ok ? ok++ : fail++;
      } catch { fail++; }
    }
    setDeleting(false);
    if (ok > 0) {
      alert(`✅ ลบสำเร็จ ${ok} รายการ${fail > 0 ? `\n❌ ล้มเหลว ${fail} รายการ` : ''}`);
      setSelectedIds(new Set());
      await fetchNews();
    } else {
      alert('❌ ไม่สามารถลบข่าวได้');
    }
  }

  function formatDate(timestamp: any) {
    if (!timestamp) return '';
    try {
      const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
      return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#666', fontSize: '18px' }}>กำลังโหลด...</div>;

  if (error) return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
      <div style={{ padding: '16px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', textAlign: 'center' }}>❌ {error}</div>
    </div>
  );

  const pageTitle = currentUser.role === 'teacher' ? 'ข่าวสารที่ฉันเพิ่ม' : 'ข่าวสารทั้งหมด';

  // filter realtime
  const q = searchQuery.trim().toLowerCase();
  const filteredNews = q
    ? news.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.author?.admin_name || '').toLowerCase().includes(q)
      )
    : news;

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>{pageTitle}</h2>
          <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>
            {q ? (
              <>พบ <strong>{filteredNews.length}</strong> จาก {news.length} ข่าว</>
            ) : (
              <>ทั้งหมด {news.length} ข่าว</>
            )}
            {selectedIds.size > 0 && <span style={{ color: '#158e6d', fontWeight: '600', marginLeft: '12px' }}>• เลือกแล้ว {selectedIds.size} รายการ</span>}
          </p>
        </div>
        {news.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={toggleSelectAll} style={{ padding: '10px 20px', background: selectedIds.size === news.length ? '#158e6d' : 'white', color: selectedIds.size === news.length ? 'white' : '#158e6d', border: '2px solid #158e6d', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
              {selectedIds.size === news.length ? '✓ เลือกทั้งหมด' : 'เลือกทั้งหมด'}
            </button>
            {selectedIds.size > 0 && (
              <button onClick={handleDelete} disabled={deleting} style={{ padding: '10px 20px', background: deleting ? '#9CA3AF' : '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? '🔄 กำลังลบ...' : `🗑️ ลบที่เลือก (${selectedIds.size})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: '28px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', pointerEvents: 'none' }}>🔍</span>
        <input
          type="text"
          placeholder="ค้นหาจากหัวเรื่อง เนื้อหา หรือชื่อผู้เพิ่ม..."
          value={searchQuery}
          onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          style={{
            width: '100%', padding: '12px 40px 12px 44px',
            border: '2px solid #e5e7eb', borderRadius: '10px',
            fontSize: '15px', outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.2s',
            borderColor: searchQuery ? '#158e6d' : '#e5e7eb',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af', padding: '4px' }}
          >
            ✕
          </button>
        )}
      </div>

      {filteredNews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>{q ? '🔍' : '📰'}</div>
          <div style={{ fontSize: '18px' }}>
            {q ? `ไม่พบข่าวที่ตรงกับ "${searchQuery}"` : currentUser.role === 'teacher' ? 'คุณยังไม่มีข่าวสาร' : 'ยังไม่มีข่าวสาร'}
          </div>
          {q && <button onClick={() => setSearchQuery('')} style={{ marginTop: '12px', padding: '8px 20px', background: '#158e6d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>ล้างการค้นหา</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredNews.map(item => {
            const isSelected = selectedIds.has(item.id);
            const hasFiles = item.files && item.files.length > 0;
            const isFilesExpanded = expandedFiles.has(item.id);
            const isGroup = item.group_id && item.group_id !== 'all';

            return (
              <div key={item.id} style={{
                background: 'white', borderRadius: '12px', padding: '24px', position: 'relative',
                boxShadow: isSelected ? '0 0 0 3px #158e6d' : '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.2s'
              }}>
                {/* Checkbox */}
                <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#158e6d' }} />
                </div>

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingRight: '32px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#e6f4fe', color: '#158e6d', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                    {item.category || 'ทั่วไป'}
                  </span>
                  {isGroup ? (
                    <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>👥 กลุ่ม</span>
                  ) : (
                    <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>📢 ทุกคน</span>
                  )}
                  {hasFiles && (
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                      📎 {item.files!.length} ไฟล์
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: 'auto' }}>{formatDate(item.time)}</span>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '8px', lineHeight: '1.4' }}>
                  {item.title}
                </h3>

                {/* Content */}
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', marginBottom: '16px' }}>
                  {item.content}
                </p>

                {/* Files section */}
                {hasFiles && (
                  <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                    <button
                      onClick={() => toggleFiles(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#158e6d', fontWeight: '600', fontSize: '14px', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {isFilesExpanded ? '▼' : '▶'} ไฟล์แนบ ({item.files!.length} ไฟล์)
                    </button>

                    {isFilesExpanded && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {item.files!.map((f, idx) => (
                          <a
                            key={idx}
                            href={f.fileURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '10px 14px', background: '#f9fafb',
                              borderRadius: '8px', border: '1px solid #e5e7eb',
                              textDecoration: 'none', color: '#1f2937',
                              transition: 'background 0.15s'
                            }}
                          >
                            <span style={{ fontSize: '20px' }}>{fileIcon(f.mime_type, f.file_name)}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.file_name}
                              </div>
                              {f.file_size && (
                                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{fileSize(f.file_size)}</div>
                              )}
                            </div>
                            <span style={{ fontSize: '12px', color: '#158e6d', fontWeight: '600', whiteSpace: 'nowrap' }}>เปิด →</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: hasFiles ? '12px' : '16px', borderTop: hasFiles ? 'none' : '1px solid #f0f0f0', marginTop: hasFiles ? '0' : '0' }}>
                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                    {item.author?.role === 'teacher' ? '👨‍🏫' : '👤'} {item.author?.admin_name || 'Admin'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
