import { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SdxChannel, SdxFile, duplicateGroups, parseSdx, scoreCandidate, serializeSdx } from './sdx';
import './styles.css';
// Asset revision: forces a fresh content-hashed browser bundle after a failed deploy.

type BuildMode = 'replace' | 'prepend';
const download = (data: Uint8Array, filename: string) => { const safeCopy = data.slice(); const url = URL.createObjectURL(new Blob([safeCopy.buffer], { type: 'application/octet-stream' })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); };
const detail = (c: SdxChannel) => [c.frequency && `${c.frequency} MHz`, c.polarization, c.symbolRate && `SR ${c.symbolRate}`, c.resolution, c.encrypted === undefined ? undefined : c.encrypted ? 'Şifreli' : 'Şifresiz', c.language, c.satellite].filter(Boolean).join(' · ');

function Row({ channel, position, selected, onToggle }: { channel: SdxChannel; position: number; selected: boolean; onToggle(): void }) {
  const sortable = useSortable({ id: channel.id });
  return <tr ref={sortable.setNodeRef} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}>
    <td className="position">{position}</td><td><button className="handle" {...sortable.attributes} {...sortable.listeners} aria-label="Sürükle">⠿</button></td><td><input type="checkbox" checked={selected} onChange={onToggle} /></td>
    <td><strong>{channel.name}</strong><small>{detail(channel) || 'Teknik bilgi kayıtta metin olarak tespit edilemedi'}</small></td>
    <td>{channel.kind}</td><td>{channel.frequency ?? '—'}</td><td>{channel.polarization ?? '—'}</td><td>{channel.symbolRate ?? '—'}</td><td>{channel.serviceId ?? '—'}</td><td><span className="tag">{channel.version.slice(-3)}</span></td>
  </tr>;
}

export default function App() {
  const input = useRef<HTMLInputElement>(null); const [file, setFile] = useState<SdxFile | null>(null); const [filename, setFilename] = useState('kanal-listesi.sdx');
  const [channels, setChannels] = useState<SdxChannel[]>([]); const [catalog, setCatalog] = useState<SdxChannel[]>([]); const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState(''); const [kind, setKind] = useState('Tümü'); const [mode, setMode] = useState<BuildMode>('replace'); const [modal, setModal] = useState<SdxChannel[] | null>(null); const [pageSize, setPageSize] = useState(20); const [page, setPage] = useState(1);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const visible = useMemo(() => channels.filter(c => (kind === 'Tümü' || c.kind === kind) && `${c.name} ${detail(c)}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))), [channels, kind, query]);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize)); const currentPage = Math.min(page, totalPages); const pageChannels = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const groups = useMemo(() => duplicateGroups(catalog), [catalog]);
  async function load(files: FileList | null) { if (!files?.length) return; const parsed = await Promise.all([...files].map(async f => ({ f, p: parseSdx(await f.arrayBuffer()) }))); const main = parsed[0]; setFile(main.p); setFilename(main.f.name.replace(/\.sdx$/i, '') + '-duzenlenmis.sdx'); setChannels(main.p.channels); setCatalog(parsed.flatMap(x => x.p.channels)); setSelected(new Set()); setPage(1); }
  const toggle = (id: string) => setSelected(old => { const next = new Set(old); next.has(id) ? next.delete(id) : next.add(id); return next; });
  function useSelection() { const picks = catalog.filter(c => selected.has(c.id)); if (!picks.length) return; if (mode === 'replace') setChannels(picks); else setChannels([...picks, ...channels.filter(c => !selected.has(c.id))]); setSelected(new Set()); }
  function recommend(group: SdxChannel[]) { const target = group[0]; return [...group].sort((a, b) => scoreCandidate(target, b) - scoreCandidate(target, a)); }
  return <main>
    <header><div><h1>SDX Kanal Düzenleyici</h1><p>Toshiba / Vestel SatcoDX listelerini cihazınızdan çıkarmadan düzenleyin.</p></div><button className="primary" onClick={() => input.current?.click()}>SDX dosyası yükle</button><input ref={input} type="file" accept=".sdx" multiple hidden onChange={e => load(e.target.files)} /></header>
    {!file ? <section className="empty"><h2>Başlamak için bir veya daha fazla .sdx dosyası seçin</h2><p>İlk dosya düzenlenecek ana listedir; diğerleri aranabilir yerel katalogya eklenir.</p><button className="primary" onClick={() => input.current?.click()}>Dosya seç</button></section> : <>
      <section className="summary"><b>{channels.length} kayıt</b><span>· katalogda {catalog.length} kayıt</span><span>· {groups.length} yinelenen ad grubu</span><span>· dosyalar tarayıcıdan ayrılmaz</span></section>
      {file.warnings.length > 0 && <aside>{file.warnings.map(w => <div key={w}>⚠ {w}</div>)}</aside>}
      <section className="toolbar"><input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Kanal, frekans veya teknik bilgi ara" /><select value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option>Tümü</option><option>TV</option><option>Radyo</option><option>Bilinmiyor</option></select><button onClick={() => setSelected(new Set(visible.map(c => c.id)))}>Görünenleri seç</button><button onClick={() => setSelected(new Set())}>Seçimi temizle</button><label><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Yeni liste</label><label><input type="radio" checked={mode === 'prepend'} onChange={() => setMode('prepend')} /> Başa taşı</label><button onClick={useSelection} disabled={!selected.size}>Seçilenleri uygula ({selected.size})</button><button className="primary" onClick={() => download(serializeSdx(file, channels), filename)}>SDX indir</button></section>
      <p className="hint">Katalogdan seçim yapmak için birden fazla SDX yükleyin. Seçiminiz mevcut listedeki kayıtları veya katalogdaki kayıtları kullanabilir.</p>
      <section className="pagination"><label>Sayfa başına <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select> kayıt</label><span>{visible.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, visible.length)} / ${visible.length}` : '0 kayıt'}</span><button onClick={() => setPage(1)} disabled={currentPage === 1}>İlk</button><button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>Önceki</button><b>{currentPage} / {totalPages}</b><button onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}>Sonraki</button><button onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>Son</button></section>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (!over || active.id === over.id) return; const a = channels.findIndex(c => c.id === active.id), b = channels.findIndex(c => c.id === over.id); setChannels(arrayMove(channels, a, b)); }}><table><thead><tr><th>SDX sıra</th><th></th><th></th><th>Kanal</th><th>Tür</th><th>Frekans</th><th>Pol.</th><th>SR</th><th>Service ID</th><th>Sürüm</th></tr></thead><tbody><SortableContext items={pageChannels.map(c => c.id)} strategy={verticalListSortingStrategy}>{pageChannels.map(channel => <Row key={channel.id} channel={channel} position={channels.findIndex(c => c.id === channel.id) + 1} selected={selected.has(channel.id)} onToggle={() => toggle(channel.id)} />)}</SortableContext></tbody></table></DndContext>
      <section className="duplicates"><h2>Aynı adlı adaylar ({groups.length})</h2><p>Belirsiz kayıtlarda uygulama seçim yapmaz; adayları karşılaştırmanız için gösterir.</p>{groups.slice(0, 12).map(([name, group]) => <button key={name} onClick={() => setModal(recommend(group))}>{name} <span>{group.length} aday</span></button>)}</section>
    </>}
    {modal && <div className="overlay" role="dialog"><div className="dialog"><button className="close" onClick={() => setModal(null)}>×</button><h2>Aday karşılaştırma</h2><p>İlk kayıt en yüksek puanlı öneridir. Birini ana listeye eklemek için seçin.</p>{modal.map((c, i) => <div className="candidate" key={c.id}><b>{i === 0 ? 'Önerilen · ' : ''}{c.name}</b><span>{detail(c)} · SID: {c.serviceId ?? '—'} · TSID: {c.tsid ?? '—'} · ONID: {c.onid ?? '—'}</span><button onClick={() => { setChannels(old => [...old, c]); setModal(null); }}>Listeye ekle</button></div>)}</div></div>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
