export type SdxVersion = 'SATCODX103' | 'SATCODX105';
export type ChannelKind = 'TV' | 'Radyo' | 'Bilinmiyor';

export interface SdxChannel {
  id: string;
  version: SdxVersion;
  raw: Uint8Array;
  name: string;
  kind: ChannelKind;
  frequency?: string;
  polarization?: string;
  symbolRate?: string;
  serviceId?: string;
  tsid?: string;
  onid?: string;
  encrypted?: boolean;
  resolution?: 'SD' | 'HD' | '4K';
  language?: string;
  satellite?: string;
  text: string;
}

export interface SdxFile { prefix: Uint8Array; suffix: Uint8Array; channels: SdxChannel[]; warnings: string[]; }

const encoder = new TextEncoder();
const signatures: SdxVersion[] = ['SATCODX103', 'SATCODX105'];
const ascii = (bytes: Uint8Array) => Array.from(bytes, b => b >= 32 && b <= 126 ? String.fromCharCode(b) : ' ').join('');
const latin1 = (bytes: Uint8Array) => Array.from(bytes, b => String.fromCharCode(b)).join('');

function startsAt(bytes: Uint8Array, pos: number, value: string) {
  const expected = encoder.encode(value);
  return expected.every((byte, index) => bytes[pos + index] === byte);
}
function printableParts(bytes: Uint8Array) {
  return ascii(bytes).split(/\s{2,}|\0+/).map(x => x.trim()).filter(x => x.length >= 2);
}
function readMatch(text: string, pattern: RegExp) { return text.match(pattern)?.[1]; }

function inspect(raw: Uint8Array, index: number): SdxChannel {
  const version = signatures.find(x => startsAt(raw, 0, x))!;
  const text = ascii(raw);
  // SatcoDX records use the same leading field layout in 103 and 105:
  // [28] T/R, [32..33] service class, [34..38] frequency, [43..50] DVB name,
  // [69..73] symbol rate. The remainder remains opaque and is preserved verbatim.
  const name = latin1(raw.slice(43, 51)).replace(/[\x00-\x1f]/g, '').trim() || `Kanal ${index + 1}`;
  const upper = `${name} ${text}`.toUpperCase();
  const field = (start: number, end: number) => latin1(raw.slice(start, end)).replace(/[^0-9]/g, '') || undefined;
  const frequency = field(34, 39);
  const symbolRate = field(69, 74);
  const serviceId = field(87, 91);
  const tsid = field(91, 95);
  const onid = field(95, 99);
  const serviceClass = latin1(raw.slice(32, 34));
  const resolution = serviceClass === '40' || /(?:2160|UHD|4K)/i.test(upper) ? '4K' : /(?:1080|720|\bHD\b)/i.test(upper) ? 'HD' : /(?:SD\b)/i.test(upper) ? 'SD' : undefined;
  const kind: ChannelKind = raw[28] === 0x52 ? 'Radyo' : raw[28] === 0x54 ? 'TV' : 'Bilinmiyor';
  return { id: `${index}-${version}-${name}`, version, raw, name, kind, frequency, polarization: undefined, symbolRate, serviceId, tsid, onid,
    encrypted: undefined, resolution,
    language: undefined, satellite: latin1(raw.slice(10, 28)).trim() || undefined, text };
}

/** Splits only at recognised SatcoDX record signatures; every record's raw bytes are retained verbatim. */
export function parseSdx(input: ArrayBuffer): SdxFile {
  const bytes = new Uint8Array(input); const starts: number[] = [];
  for (let i = 0; i <= bytes.length - 10; i++) if (signatures.some(sig => startsAt(bytes, i, sig))) starts.push(i);
  if (!starts.length) return { prefix: bytes, suffix: new Uint8Array(), channels: [], warnings: ['SATCODX103 veya SATCODX105 kaydı bulunamadı. Dosya değiştirilmeden korunuyor.'] };
  const channels = starts.map((start, i) => inspect(bytes.slice(start, starts[i + 1] ?? bytes.length), i));
  const warnings: string[] = [];
  if (starts[0] > 0) warnings.push(`${starts[0]} baytlık dosya başlığı korunacak.`);
  if (channels.some(c => c.raw.length < 20)) warnings.push('Kesik görünen kayıtlar tespit edildi.');
  return { prefix: bytes.slice(0, starts[0]), suffix: new Uint8Array(), channels, warnings };
}
export function serializeSdx(file: SdxFile, channels: SdxChannel[]) {
  const pieces = [file.prefix, ...channels.map(c => c.raw), file.suffix]; const length = pieces.reduce((n, p) => n + p.length, 0);
  const result = new Uint8Array(length); let at = 0; for (const piece of pieces) { result.set(piece, at); at += piece.length; } return result;
}
export function normalizeName(value: string) { return value.toLocaleLowerCase('tr-TR').replace(/[\W_]+/g, ' ').replace(/\b(hd|sd|uhd|4k|tv)\b/g, '').trim(); }
export function duplicateGroups(channels: SdxChannel[]) { const m = new Map<string, SdxChannel[]>(); channels.forEach(c => { const key = normalizeName(c.name); if (key) m.set(key, [...(m.get(key) ?? []), c]); }); return [...m.entries()].filter(([, list]) => list.length > 1); }
export function scoreCandidate(target: SdxChannel, candidate: SdxChannel) {
  let score = normalizeName(target.name) === normalizeName(candidate.name) ? 50 : 0;
  for (const key of ['resolution','frequency','serviceId','tsid','onid','language','kind'] as const) if (target[key] && target[key] === candidate[key]) score += key === 'serviceId' ? 25 : 8;
  if (target.encrypted !== undefined && target.encrypted === candidate.encrypted) score += 5;
  return score;
}
