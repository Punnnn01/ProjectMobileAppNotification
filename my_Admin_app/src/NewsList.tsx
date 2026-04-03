// src/NewsList.tsx
import type { JSX } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import type { LoggedInUser } from './Login';
import './style.css';

const BACKEND = 'https://projectmobileappnotification-production.up.railway.app';

interface NewsFile {
  file_name: string; fileURL: string;
  file_size?: number; mime_type?: string; storage_path?: string;
}
interface NewsLink { label: string; url: string; }
interface NewsItem {
  id: string; title: string; content: string;
  category?: string; time?: any; group_id?: string;
  files?: NewsFile[]; links?: NewsLink[];
  author?: { admin_id: string; admin_name: string; role?: string; };
}
interface Props { currentUser: LoggedInUser; }

function fIcon(mime?: string, name?: string) {
  const m = mime || '', n = (name || '').toLowerCase();
  if (m.startsWith('image/')) return { icon: '🖼', color: '#e91e8c', bg: '#fdf2f8' };
  if (m.includes('pdf') || n.endsWith('.pdf')) return { icon: '📄', color: '#e53935', bg: '#fff5f5' };
  if (m.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return { icon: '📝', color: '#1a73e8', bg: '#f0f4ff' };
  if (m.includes('excel') || n.endsWith('.xls') || n.endsWith('.xlsx')) return { icon: '📊', color: '#34a853', bg: '#f0fdf4' };
  if (m.includes('powerpoint') || n.endsWith('.ppt') || n.endsWith('.pptx')) return { icon: '📑', color: '#f57c00', bg: '#fff8f0' };
  return { icon: '📎', color: '#158e6d', bg: '#f0fdf9' };
}
function fSize(b?: number) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
function fDate(ts: any) {
  if (!ts) return '';
  try {
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// ── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ item, onClose, onSaved }: { item: NewsItem; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle]     = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [links, setLinks]     = useState<NewsLink[]>(item.links || []);
  const [linkUrl, setLinkUrl]   = useState('');
  const [existingFiles, setExistingFiles] = useState<NewsFile[]>(item.files || []);
  const [removePaths, setRemovePaths]     = useState<string[]>([]);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const filesRef = useRef<HTMLInputElement>(null);

  function addLink() {
    if (!linkUrl.trim()) return;
    const url = /^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    setLinks(prev => [...prev, { label: url, url }]);
    setLinkUrl('');
  }

  async function handleSave() {
    if (!title.trim()) return setError('กรุณากรอกหัวเรื่อง');
    if (!content.trim()) return setError('กรุณากรอกเนื้อหา');
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('content', content.trim());
      fd.append('links', JSON.stringify(links));
      if (removePaths.length > 0) fd.append('remove_file_paths', JSON.stringify(removePaths));
      const newFiles = filesRef.current?.files;
      if (newFiles) Array.from(newFiles).forEach(f => fd.append('files', f));
      const res = await fetch(`${BACKEND}/api/news/${item.id}`, { method: 'PUT', body: fd });
      if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.error || `HTTP ${res.status}`); }
      onSaved(); onClose();
    } catch (e: any) { setError(e.message || 'บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'var(--color-background-primary)', borderRadius:'16px', width:'100%', maxWidth:'600px', maxHeight:'90vh', display:'flex', flexDirection:'column', border:'0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ padding:'20px 24px 16px', borderBottom:'0.5px solid var(--color-border-tertiary)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:'16px', fontWeight:'500', color:'var(--color-text-primary)' }}>แก้ไขข่าวสาร</div>
          <button onClick={onClose} style={{ width:'28px', height:'28px', borderRadius:'50%', border:'none', background:'var(--color-background-secondary)', cursor:'pointer', fontSize:'14px', color:'var(--color-text-secondary)' }}>✕</button>
        </div>
        <div style={{ overflowY:'auto', flex:1, padding:'20px 24px', display:'flex', flexDirection:'column', gap:'14px' }}>
          <div>
            <label style={lbl}>หัวเรื่อง <span style={{ color:'#ef4444' }}>*</span></label>
            <input type="text" value={title} onInput={e => setTitle((e.target as HTMLInputElement).value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>เนื้อหา <span style={{ color:'#ef4444' }}>*</span></label>
            <textarea value={content} onInput={e => setContent((e.target as HTMLTextAreaElement).value)} rows={5} style={{ ...inp, resize:'vertical', fontFamily:'inherit' }} />
          </div>
          {existingFiles.length > 0 && (
            <div>
              <label style={lbl}>ไฟล์แนบเดิม</label>
              {existingFiles.map((f, i) => {
                const fc = fIcon(f.mime_type, f.file_name);
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'var(--color-background-secondary)', borderRadius:'8px', border:'0.5px solid var(--color-border-tertiary)', marginBottom:'6px' }}>
                    <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:fc.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>{fc.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:'500', color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.file_name}</div>
                      {f.file_size && <div style={{ fontSize:'11px', color:'var(--color-text-secondary)' }}>{fSize(f.file_size)}</div>}
                    </div>
                    <button onClick={() => { setRemovePaths(p => [...p, f.storage_path!]); setExistingFiles(p => p.filter((_, j) => j !== i)); }}
                      style={{ padding:'4px 10px', background:'#fef2f2', color:'#dc2626', border:'0.5px solid #fecaca', borderRadius:'6px', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>ลบ</button>
                  </div>
                );
              })}
            </div>
          )}
          <div>
            <label style={lbl}>เพิ่มไฟล์ใหม่</label>
            <input type="file" multiple ref={filesRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
              style={{ width:'100%', padding:'10px', border:'2px dashed var(--color-border-secondary)', borderRadius:'8px', fontSize:'13px', background:'var(--color-background-secondary)', cursor:'pointer', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={lbl}>ลิงก์แนบ</label>
            <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
              <input type="text" placeholder="URL" value={linkUrl} onInput={e => setLinkUrl((e.target as HTMLInputElement).value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLink())}
                style={{ ...inp, flex: 1 }} />
              <button type="button" onClick={addLink}
                style={{ padding:'9px 14px', background:'#158e6d', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'500', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', fontSize:'13px' }}>+ เพิ่ม</button>
            </div>
            {links.map((l, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'#f0fdf4', border:'0.5px solid #bbf7d0', borderRadius:'8px', marginBottom:'6px' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'13px', fontWeight:'500', color:'#065f46' }}>{l.label && l.label !== l.url ? l.label : l.url}</div>
                  {l.label && l.label !== l.url && <div style={{ fontSize:'11px', color:'#158e6d', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.url}</div>}
                </div>
                <button onClick={() => setLinks(p => p.filter((_, j) => j !== i))}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#ef4444', padding:'2px 4px' }}>✕</button>
              </div>
            ))}
          </div>
          {error && <div style={{ padding:'10px 14px', background:'#fee2e2', color:'#991b1b', borderRadius:'8px', fontSize:'13px' }}>{error}</div>}
        </div>
        <div style={{ padding:'16px 24px', borderTop:'0.5px solid var(--color-border-tertiary)', display:'flex', gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', background:'var(--color-background-secondary)', color:'var(--color-text-secondary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:'9px', fontWeight:'500', cursor:'pointer', fontFamily:'inherit' }}>ยกเลิก</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:2, padding:'11px', background:saving ? '#9ca3af' : '#158e6d', color:'#fff', border:'none', borderRadius:'9px', fontWeight:'500', cursor:saving ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ background:bg, color, padding:'2px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:'500', whiteSpace:'nowrap' }}>{label}</span>;
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function NewsList({ currentUser }: Props): JSX.Element {
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);

  useEffect(() => { fetchNews(); }, []);

  async function fetchNews() {
    try {
      setLoading(true);
      const url = currentUser.role === 'teacher'
        ? `${BACKEND}/api/news?author_id=${currentUser.docId}`
        : `${BACKEND}/api/news`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNews(data.news || []);
    } catch (e: any) { setError(e?.message || 'โหลดข่าวไม่สำเร็จ'); }
    finally { setLoading(false); }
  }

  function toggleExpand(id: string) {
    const s = new Set(expandedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedIds(s);
  }
  function toggleSelect(id: string) {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  }
  function toggleAll() {
    setSelectedIds(selectedIds.size === filteredNews.length ? new Set() : new Set(filteredNews.map(n => n.id)));
  }

  async function handleDelete() {
    if (!selectedIds.size) return alert('กรุณาเลือกข่าวที่ต้องการลบ');
    if (!confirm(`ต้องการลบ ${selectedIds.size} ข่าว?\nไม่สามารถกู้คืนได้`)) return;
    setDeleting(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try { const r = await fetch(`${BACKEND}/api/news/${id}`, { method:'DELETE' }); r.ok ? ok++ : fail++; }
      catch { fail++; }
    }
    setDeleting(false);
    if (ok > 0) { alert(`ลบสำเร็จ ${ok} รายการ${fail ? ` (ล้มเหลว ${fail})` : ''}`); setSelectedIds(new Set()); await fetchNews(); }
    else alert('ไม่สามารถลบข่าวได้');
  }

  if (loading) return <div style={{ textAlign:'center', padding:'60px', color:'var(--color-text-secondary)', fontSize:'14px' }}>กำลังโหลด...</div>;
  if (error) return <div style={{ padding:'16px', background:'#fee2e2', color:'#991b1b', borderRadius:'10px', margin:'24px' }}>{error}</div>;

  const pageTitle = currentUser.role === 'teacher' ? 'ข่าวสารของฉัน' : 'ข่าวสารทั้งหมด';
  const q = searchQuery.trim().toLowerCase();
  const filteredNews = q
    ? news.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || (n.author?.admin_name || '').toLowerCase().includes(q))
    : news;

  return (
    <div>
      {/* ── Sticky toolbar ── */}
      <div style={{ position:'sticky', top:60, zIndex:90, background:'#ffffff', borderBottom:'0.5px solid #e5e7eb', padding:'12px 24px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth:'1400px', margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', marginBottom:'10px', flexWrap:'wrap' }}>
            <div>
              <h2 style={{ fontSize:'20px', fontWeight:'500', color:'var(--color-text-primary)', margin:0 }}>{pageTitle}</h2>
              <p style={{ fontSize:'12px', color:'var(--color-text-secondary)', margin:'2px 0 0' }}>
                {q ? <>พบ <strong>{filteredNews.length}</strong> จาก {news.length} ข่าว</> : <>{news.length} ข่าว</>}
                {selectedIds.size > 0 && <span style={{ color:'#158e6d', fontWeight:'500', marginLeft:'10px' }}>• เลือกแล้ว {selectedIds.size}</span>}
              </p>
            </div>
            {news.length > 0 && (
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                <button onClick={toggleAll}
                  style={{ padding:'7px 14px', background: selectedIds.size === filteredNews.length ? '#158e6d' : 'var(--color-background-primary)', color: selectedIds.size === filteredNews.length ? '#fff' : '#158e6d', border:'0.5px solid #158e6d', borderRadius:'8px', fontWeight:'500', cursor:'pointer', fontSize:'13px', fontFamily:'inherit' }}>
                  {selectedIds.size === filteredNews.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                </button>
                {selectedIds.size > 0 && (
                  <button onClick={handleDelete} disabled={deleting}
                    style={{ padding:'7px 14px', background: deleting ? '#9ca3af' : '#dc2626', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'500', cursor: deleting ? 'not-allowed' : 'pointer', fontSize:'13px', fontFamily:'inherit' }}>
                    {deleting ? 'กำลังลบ...' : `ลบที่เลือก (${selectedIds.size})`}
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{ position:'relative' }}>
            <svg style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', width:'15px', height:'15px', opacity:0.4 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="ค้นหาหัวเรื่อง เนื้อหา หรือชื่อผู้เพิ่ม..." value={searchQuery}
              onInput={e => setSearchQuery((e.target as HTMLInputElement).value)}
              style={{ width:'100%', padding:'8px 36px 8px 34px', border:'0.5px solid #d1d5db', borderRadius:'9px', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit', background:'#f9fafb', color:'#1a1d23' }} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'14px', color:'var(--color-text-secondary)', padding:'2px' }}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── News list ── */}
      <div style={{ maxWidth:'1400px', margin:'0 auto', padding:'20px 24px 40px' }}>
        {filteredNews.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--color-text-secondary)' }}>
            <div style={{ fontSize:'36px', marginBottom:'12px', opacity:0.3 }}>{q ? '🔍' : '📰'}</div>
            <div style={{ fontSize:'15px', fontWeight:'500' }}>{q ? `ไม่พบข่าวที่ตรงกับ "${searchQuery}"` : 'ยังไม่มีข่าวสาร'}</div>
            {q && <button onClick={() => setSearchQuery('')} style={{ marginTop:'12px', padding:'7px 18px', background:'#158e6d', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', fontSize:'13px' }}>ล้างการค้นหา</button>}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {filteredNews.map(item => {
              const isSelected = selectedIds.has(item.id);
              const isExpanded = expandedIds.has(item.id);
              const hasFiles   = (item.files?.length ?? 0) > 0;
              const hasLinks   = (item.links?.length ?? 0) > 0;
              const hasAttach  = hasFiles || hasLinks;
              const isPersonal = item.group_id?.startsWith('personal_');
              const isGroup    = !isPersonal && item.group_id && item.group_id !== 'all';

              return (
                <div key={item.id} style={{
                  background:'#ffffff',
                  borderRadius:'12px',
                  border: isSelected ? '1.5px solid #158e6d' : '0.5px solid #e5e7eb',
                  borderLeft: isSelected ? '1.5px solid #158e6d' : '3px solid #158e6d',
                  overflow:'hidden',
                  transition:'box-shadow 0.15s',
                }}>
                  {/* Main content */}
                  <div style={{ padding:'16px 18px' }}>
                    {/* Badges + วันที่ */}
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'10px' }}>
                      {isPersonal ? <Badge label="รายบุคคล" bg="#fef3c7" color="#92400e" />
                        : isGroup  ? <Badge label="กลุ่ม"    bg="#ede9fe" color="#6d28d9" />
                        :            <Badge label="ทุกคน"   bg="#ecfdf5" color="#065f46" />}
                      {hasFiles && <Badge label={`${item.files!.length} ไฟล์`} bg="#e0f2fe" color="#0369a1" />}
                      {hasLinks && <Badge label={`${item.links!.length} ลิงก์`} bg="#fef9c3" color="#854d0e" />}
                      <span style={{ fontSize:'11px', color:'var(--color-text-secondary)', marginLeft:'auto', whiteSpace:'nowrap' }}>{fDate(item.time)}</span>
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize:'15px', fontWeight:'500', color:'var(--color-text-primary)', margin:'0 0 6px', lineHeight:'1.5' }}>{item.title}</h3>

                    {/* Content */}
                    <p style={{ fontSize:'13px', color:'var(--color-text-secondary)', lineHeight:'1.65', margin:'0 0 14px' }}>
                      {item.content.length > 160 && !isExpanded ? item.content.slice(0, 160) + '...' : item.content}
                    </p>

                    {/* Footer row */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                        <span style={{ fontSize:'12px', color:'var(--color-text-secondary)' }}>
                          {item.author?.role === 'teacher' ? 'อ. ' : ''}{item.author?.admin_name || 'Admin'}
                        </span>
                        {hasAttach && (
                          <button onClick={() => toggleExpand(item.id)}
                            style={{ background:'none', border:'none', cursor:'pointer', color:'#158e6d', fontWeight:'500', fontSize:'12px', padding:'0', display:'flex', alignItems:'center', gap:'4px', fontFamily:'inherit' }}>
                            {isExpanded ? '▲ ซ่อนไฟล์/ลิงก์' : '▼ ดูไฟล์/ลิงก์'}
                          </button>
                        )}
                      </div>
                      {/* Actions */}
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <button onClick={() => setEditingItem(item)}
                          style={{ padding:'4px 11px', background:'#f0f9ff', color:'#0369a1', border:'0.5px solid #bae6fd', borderRadius:'6px', fontWeight:'500', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>
                          แก้ไข
                        </button>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)}
                          style={{ width:'16px', height:'16px', cursor:'pointer', accentColor:'#158e6d', flexShrink:0 }} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded attachments */}
                  {isExpanded && hasAttach && (
                    <div style={{ borderTop:'0.5px solid #e5e7eb', padding:'12px 18px', background:'#f9fafb', display:'flex', flexDirection:'column', gap:'8px' }}>
                      {/* Files */}
                      {item.files?.map((f, i) => {
                        const fc = fIcon(f.mime_type, f.file_name);
                        return (
                          <a key={i} href={f.fileURL} target="_blank" rel="noopener noreferrer"
                            style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', background:'#ffffff', borderRadius:'8px', border:'0.5px solid #e5e7eb', textDecoration:'none', color:'#1a1d23' }}>
                            <div style={{ width:'34px', height:'34px', borderRadius:'8px', background:fc.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>{fc.icon}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:'13px', fontWeight:'500', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.file_name}</div>
                              {f.file_size && <div style={{ fontSize:'11px', color:'var(--color-text-secondary)' }}>{fSize(f.file_size)}</div>}
                            </div>
                            <span style={{ fontSize:'12px', color:'#158e6d', fontWeight:'500', whiteSpace:'nowrap' }}>เปิด ↗</span>
                          </a>
                        );
                      })}
                      {/* Links */}
                      {item.links?.map((l, i) => (
                        <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', background:'#fffbeb', borderRadius:'8px', border:'0.5px solid #fde68a', textDecoration:'none' }}>
                          <div style={{ width:'34px', height:'34px', borderRadius:'8px', background:'#fef3c7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', flexShrink:0 }}>🔗</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'13px', fontWeight:'500', color:'#92400e' }}>{l.label && l.label !== l.url ? l.label : l.url}</div>
                            {l.label && l.label !== l.url && <div style={{ fontSize:'11px', color:'#b45309', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.url}</div>}
                          </div>
                          <span style={{ fontSize:'12px', color:'#b45309', fontWeight:'500', whiteSpace:'nowrap' }}>เปิด ↗</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingItem && (
        <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSaved={() => { fetchNews(); setEditingItem(null); }} />
      )}
    </div>
  );
}

const lbl: any = { display:'block', fontWeight:'500', marginBottom:'6px', fontSize:'13px', color:'var(--color-text-primary)' };
const inp: any = { width:'100%', padding:'9px 13px', border:'0.5px solid var(--color-border-secondary)', borderRadius:'8px', fontSize:'13px', background:'var(--color-background-primary)', boxSizing:'border-box', fontFamily:'inherit', color:'var(--color-text-primary)', outline:'none' };
