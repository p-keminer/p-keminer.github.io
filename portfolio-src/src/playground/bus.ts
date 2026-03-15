type Listener = (p: unknown) => void;
const _m = new Map<string, Set<Listener>>();
export const pgEmit = (e: string, p?: unknown) => _m.get(e)?.forEach(fn => fn(p));
export const pgOn = (e: string, fn: Listener) => {
  if (!_m.has(e)) _m.set(e, new Set());
  _m.get(e)!.add(fn);
  return () => _m.get(e)?.delete(fn);
};
