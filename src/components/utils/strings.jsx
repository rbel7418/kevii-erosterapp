export function emailPrefix(value) {
  const s = String(value ?? "");
  const at = s.indexOf("@");
  return at > 0 ? s.slice(0, at) : s;
}