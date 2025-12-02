export function downloadCsvTemplate(filename, headers) {
  const line = (headers || []).join(",") + "\n";
  const blob = new Blob([line], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename || "template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function deriveHeadersFromSchema(properties = {}, preferredOrder = []) {
  const keys = Object.keys(properties || {});
  const preferred = preferredOrder.filter((k) => keys.includes(k));
  const remaining = keys.filter((k) => !preferred.includes(k)).sort();
  return [...preferred, ...remaining];
}