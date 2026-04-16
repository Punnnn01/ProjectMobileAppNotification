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
interface Props { currentUser: LoggedInUser; onNavigate?: (path: string) => void; }

function fDate(ts: any) {
  if (!ts) return '';
  try {
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function getPreviewImage(item: NewsItem): string | null {
  const imgFile = item.files?.find(f =>
    f.mime_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(f.file_name)
  );
  return imgFile?.fileURL || null;
}

function RecipientBadge({ groupId }: { groupId?: string }) {
  const isPersonal = groupId?.startsWith('personal_');
  const isGroup = !isPersonal && groupId && groupId !== 'all';
  const [bg, color, label] = isPersonal
    ? ['#fef3c7', '#92400e', 'รายบุคคล']
    : isGroup
    ? ['#ede9fe', '#6d28d9', 'กลุ่ม']
    : ['#ecfdf5', '#065f46', 'ทุกคน'];
  return <span style={{ background: bg, color, padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700' }}>{label}</span>;
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ item, onClose, onSaved }: { item: NewsItem; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle]     = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [links, setLinks]     = useState<NewsLink[]>(item.links || []);
  const [linkUrl, setLinkUrl] = useState('');
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
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'#ffffff', borderRadius:'16px', width:'100%', maxWidth:'600px', maxHeight:'90vh', display:'flex', flexDirection:'column', border:'1px solid #e5e7eb', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:'16px', fontWeight:'600', color:'#1a1d23' }}>แก้ไขข่าวสาร</div>
          <button onClick={onClose} style={{ width:'28px', height:'28px', borderRadius:'50%', border:'none', background:'#f3f4f6', cursor:'pointer', fontSize:'14px', color:'#6b7280' }}>✕</button>
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
              {existingFiles.map((f, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'#f9fafb', borderRadius:'8px', border:'1px solid #e5e7eb', marginBottom:'6px' }}>
                  <div style={{ flex:1, fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.file_name}</div>
                  <button onClick={() => { setRemovePaths(p => [...p, f.storage_path!]); setExistingFiles(p => p.filter((_, j) => j !== i)); }}
                    style={{ padding:'3px 9px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'6px', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>ลบ</button>
                </div>
              ))}
            </div>
          )}
          <div>
            <label style={lbl}>เพิ่มไฟล์ใหม่</label>
            <input type="file" multiple ref={filesRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
              style={{ width:'100%', padding:'10px', border:'2px dashed #d1d5db', borderRadius:'8px', fontSize:'13px', background:'#f9fafb', cursor:'pointer', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={lbl}>ลิงก์แนบ</label>
            <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
              <input type="text" placeholder="URL" value={linkUrl} onInput={e => setLinkUrl((e.target as HTMLInputElement).value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLink())} style={{ ...inp, flex:1 }} />
              <button type="button" onClick={addLink}
                style={{ padding:'9px 14px', background:'#158e6d', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'500', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', fontSize:'13px' }}>+ เพิ่ม</button>
            </div>
            {links.map((l, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px', marginBottom:'6px' }}>
                <div style={{ flex:1, fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#065f46' }}>{l.url}</div>
                <button type="button" onClick={() => setLinks(p => p.filter((_, j) => j !== i))}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#ef4444', padding:'2px 4px' }}>✕</button>
              </div>
            ))}
          </div>
          {error && <div style={{ padding:'10px 14px', background:'#fee2e2', color:'#991b1b', borderRadius:'8px', fontSize:'13px' }}>{error}</div>}
        </div>
        <div style={{ padding:'16px 24px', borderTop:'1px solid #f0f0f0', display:'flex', gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', background:'#f3f4f6', color:'#555', border:'1px solid #e5e7eb', borderRadius:'9px', fontWeight:'500', cursor:'pointer', fontFamily:'inherit' }}>ยกเลิก</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:2, padding:'11px', background:saving ? '#9ca3af' : '#158e6d', color:'#fff', border:'none', borderRadius:'9px', fontWeight:'500', cursor:saving ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function NewsList({ currentUser, onNavigate }: Props): JSX.Element {
  const [news, setNews]           = useState<NewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType]   = useState<'all' | 'everyone' | 'group' | 'personal'>('all');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting]   = useState(false);
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

  if (loading) return <div style={{ textAlign:'center', padding:'60px', color:'#888', fontSize:'14px' }}>กำลังโหลด...</div>;
  if (error) return <div style={{ padding:'16px', background:'#fee2e2', color:'#991b1b', borderRadius:'10px', margin:'24px' }}>{error}</div>;

  const pageTitle = currentUser.role === 'teacher' ? 'ข่าวสารของฉัน' : 'ข่าวสารทั้งหมด';
  const q = searchQuery.trim().toLowerCase();
  const filteredNews = news.filter(n => {
    // filter ตาม search
    if (q && !n.title.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q) && !(n.author?.admin_name || '').toLowerCase().includes(q)) return false;
    // filter ตามประเภทผู้รับ
    if (filterType === 'personal') return n.group_id?.startsWith('personal_');
    if (filterType === 'group')    return !n.group_id?.startsWith('personal_') && n.group_id && n.group_id !== 'all';
    if (filterType === 'everyone') return !n.group_id || n.group_id === 'all';
    return true;
  });

  return (
    <div>
      {/* Sticky toolbar */}
      <div style={{ position:'sticky', top:60, zIndex:90, background:'#ffffff', borderBottom:'1px solid #e5e7eb', padding:'12px 24px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth:'1400px', margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', marginBottom:'10px', flexWrap:'wrap' }}>
            <div>
              <h2 style={{ fontSize:'20px', fontWeight:'700', color:'#1a1d23', margin:0 }}>{pageTitle}</h2>
              <p style={{ fontSize:'12px', color:'#6b7280', margin:'2px 0 0' }}>
                {filteredNews.length !== news.length
                  ? <>กรอง <strong>{filteredNews.length}</strong> จาก {news.length} ข่าว</>
                  : <>{news.length} ข่าว</>}
                {selectedIds.size > 0 && <span style={{ color:'#158e6d', fontWeight:'600', marginLeft:'10px' }}>• เลือกแล้ว {selectedIds.size}</span>}
              </p>
            </div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
              {onNavigate && (
                <button onClick={() => onNavigate('/add-news')}
                  style={{ padding:'7px 16px', background:'#158e6d', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'600', cursor:'pointer', fontSize:'13px', fontFamily:'inherit' }}>
                  + เพิ่มข่าว
                </button>
              )}
              {news.length > 0 && (
                <>
                  <button onClick={toggleAll}
                    style={{ padding:'7px 14px', background: selectedIds.size === filteredNews.length && filteredNews.length > 0 ? '#158e6d' : '#fff', color: selectedIds.size === filteredNews.length && filteredNews.length > 0 ? '#fff' : '#158e6d', border:'1.5px solid #158e6d', borderRadius:'8px', fontWeight:'600', cursor:'pointer', fontSize:'13px', fontFamily:'inherit' }}>
                    {selectedIds.size === filteredNews.length && filteredNews.length > 0 ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </button>
                  {selectedIds.size > 0 && (
                    <button onClick={handleDelete} disabled={deleting}
                      style={{ padding:'7px 14px', background: deleting ? '#9ca3af' : '#dc2626', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'600', cursor: deleting ? 'not-allowed' : 'pointer', fontSize:'13px', fontFamily:'inherit' }}>
                      {deleting ? 'กำลังลบ...' : `ลบที่เลือก (${selectedIds.size})`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Filter buttons */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'10px', flexWrap:'wrap' }}>
            {(['all', 'everyone', 'group', 'personal'] as const).map(f => {
              const labels = { all:'ทั้งหมด', everyone:'ทุกคน', group:'กลุ่ม', personal:'รายบุคคล' };
              const colors = { all:['#f3f4f6','#374151'], everyone:['#ecfdf5','#065f46'], group:['#ede9fe','#6d28d9'], personal:['#fef3c7','#92400e'] };
              const active = filterType === f;
              const [bg, color] = colors[f];
              return (
                <button key={f} onClick={() => setFilterType(f)}
                  style={{ padding:'5px 14px', background: active ? (f === 'all' ? '#374151' : bg) : '#ffffff', color: active ? (f === 'all' ? '#fff' : color) : '#6b7280', border:`1.5px solid ${active ? (f === 'all' ? '#374151' : color) : '#e5e7eb'}`, borderRadius:'20px', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
                  {labels[f]}
                </button>
              );
            })}
          </div>
          <div style={{ position:'relative' }}>
            <input type="text" placeholder="ค้นหาหัวเรื่อง เนื้อหา หรือชื่อผู้เพิ่ม..."
              value={searchQuery} onInput={e => setSearchQuery((e.target as HTMLInputElement).value)}
              style={{ width:'100%', padding:'9px 36px 9px 14px', border:'1.5px solid #e5e7eb', borderRadius:'9px', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit', background:'#f9fafb', color:'#1a1d23' }} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'15px', color:'#9ca3af' }}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:'1400px', margin:'0 auto', padding:'20px 24px 40px' }}>
        {filteredNews.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#9ca3af' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px', opacity:0.4 }}>{q ? '🔍' : '📰'}</div>
            <div style={{ fontSize:'16px' }}>{q ? `ไม่พบข่าวที่ตรงกับ "${searchQuery}"` : 'ยังไม่มีข่าวสาร'}</div>
            {q && <button onClick={() => setSearchQuery('')} style={{ marginTop:'12px', padding:'8px 20px', background:'#158e6d', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', fontSize:'13px' }}>ล้างการค้นหา</button>}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px' }}>
            {filteredNews.map(item => {
              const isSelected = selectedIds.has(item.id);
              const previewImg = getPreviewImage(item);
              const hasFiles   = (item.files?.length ?? 0) > 0;
              const hasLinks   = (item.links?.length ?? 0) > 0;

              return (
                <div key={item.id} style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: isSelected ? '2px solid #158e6d' : '1px solid #e5e7eb',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 0.15s',
                }}>

                  {/* Preview area */}
                  <div style={{ position:'relative', width:'100%', paddingTop:'52%', background:'#f0fdf4', overflow:'hidden', flexShrink:0 }}>
                    {previewImg ? (
                      <img src={previewImg} alt={item.title}
                        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                    ) : (
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, #e8f5f0 0%, #c8e6de 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                        <div style={{ fontSize:'32px', opacity:0.35 }}>
                          {hasFiles ? '📎' : hasLinks ? '🔗' : '📰'}
                        </div>
                      </div>
                    )}
                    {/* badge */}
                    <div style={{ position:'absolute', top:'10px', right:'10px' }}>
                      <RecipientBadge groupId={item.group_id} />
                    </div>
                    {/* checkbox */}
                    <div style={{ position:'absolute', top:'10px', left:'10px' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)}
                        style={{ width:'16px', height:'16px', cursor:'pointer', accentColor:'#158e6d' }} />
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:'6px', flex:1 }}>
                    <h3 style={{ fontSize:'14px', fontWeight:'700', color:'#1a1d23', margin:0, lineHeight:'1.45',
                      display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize:'12px', color:'#6b7280', margin:0, lineHeight:'1.55',
                      display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                      {item.content}
                    </p>

                    {/* ไฟล์ + ลิงก์ — กดเปิดได้เลย */}
                    {(hasFiles || hasLinks) && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'4px' }}>
                        {item.files?.map((f, fi) => (
                          <a key={fi} href={f.fileURL} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize:'11px', background:'#e0f2fe', color:'#0369a1', padding:'3px 9px', borderRadius:'6px', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'3px', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            📎 {f.file_name.length > 18 ? f.file_name.slice(0, 18) + '…' : f.file_name}
                          </a>
                        ))}
                        {item.links?.map((l, li) => (
                          <a key={li} href={l.url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize:'11px', background:'#fef9c3', color:'#854d0e', padding:'3px 9px', borderRadius:'6px', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'3px', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            🔗 {(l.label !== l.url ? l.label : l.url.replace(/^https?:\/\//, '')).slice(0, 20)}{(l.label !== l.url ? l.label : l.url).length > 20 ? '…' : ''}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Author + Date */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto', paddingTop:'6px' }}>
                      <span style={{ fontSize:'11px', color:'#9ca3af' }}>
                        {item.author?.role === 'teacher' ? 'อ.' : ''} {item.author?.admin_name || 'Admin'}
                      </span>
                      <span style={{ fontSize:'11px', color:'#9ca3af' }}>{fDate(item.time)}</span>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div style={{ padding:'10px 16px', borderTop:'1px solid #f3f4f6', display:'flex', justifyContent:'flex-end' }}>
                    <button onClick={() => setEditingItem(item)} style={{
                      padding:'5px 14px', background:'#f0f9ff', color:'#0369a1',
                      border:'1px solid #bae6fd', borderRadius:'7px',
                      fontSize:'12px', cursor:'pointer', fontFamily:'inherit', fontWeight:'500',
                    }}>แก้ไข</button>
                  </div>
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

const lbl: any = { display:'block', fontWeight:'500', marginBottom:'6px', fontSize:'13px', color:'#374151' };
const inp: any = { width:'100%', padding:'9px 13px', border:'1.5px solid #d1d5db', borderRadius:'8px', fontSize:'13px', background:'#ffffff', boxSizing:'border-box', fontFamily:'inherit', color:'#1a1d23', outline:'none' };
