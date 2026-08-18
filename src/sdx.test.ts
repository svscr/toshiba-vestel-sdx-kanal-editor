import { describe, expect, it } from 'vitest';
import { parseSdx, serializeSdx, scoreCandidate } from './sdx';
const record = (version: string, type: string, frequency: string, name: string, sr: string) => {
  const output = new Uint8Array(129).fill(0x20); const value = new TextEncoder().encode(version + 'Turksat (42.0E)   ' + type.slice(0, 6) + frequency + '0000' + name.padEnd(8) + '0420TUR     ______' + sr.padStart(5, '0'));
  output.set(value.slice(0, 129)); return output;
};
const bytes = new Uint8Array([...record('SATCODX103', 'TMPG201', '11794', 'TRT1 HD', '30000'), ...record('SATCODX105', 'RMPG401', '11767', 'TRT 4K', '15000')]);
describe('SDX preservation', () => {
  it('finds signatures, reads fixed SatcoDX fields, and writes untouched bytes back identically', () => { const parsed = parseSdx(bytes.buffer); expect(parsed.channels).toHaveLength(2); expect(parsed.channels[0]).toMatchObject({ name: 'TRT1 HD', frequency: '11794', symbolRate: '30000', kind: 'TV' }); expect(parsed.channels[1]).toMatchObject({ name: 'TRT 4K', resolution: '4K', kind: 'Radyo' }); expect(serializeSdx(parsed, parsed.channels)).toEqual(bytes); });
  it('prefers an identical technical record', () => { const [a, b] = parseSdx(bytes.buffer).channels; expect(scoreCandidate(a, a)).toBeGreaterThan(scoreCandidate(a, b)); });
});
