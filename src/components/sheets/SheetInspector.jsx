import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { googleSheetsDb } from "@/functions/googleSheetsDb";
import { format, parse } from "date-fns";

function colLetter(idx) {
  let n = idx + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function cleanName(s) {
  const t = String(s || "").trim();
  // Remove job titles in ( ... ) and trim
  const beforeParen = t.split("(")[0].trim();
  return beforeParen;
}

function extractIdInBrackets(s) {
  const m = String(s || "").match(/\[(.+?)\]/);
  return m ? m[1] : null;
}

export default function SheetInspector({ spreadsheetId: initialId = "", sheetName: initialTab = "Rota" }) {
  const [spreadsheetId, setSpreadsheetId] = React.useState(() => initialId || (typeof localStorage !== "undefined" ? localStorage.getItem("gs_spreadsheet_id") || "" : ""));
  const [sheetName, setSheetName] = React.useState(initialTab || "Rota");
  const [headerYear, setHeaderYear] = React.useState(new Date().getFullYear());
  const [headerRowIndex, setHeaderRowIndex] = React.useState(() => {
    try { const v = parseInt(localStorage.getItem('gs_header_row_index') || '1', 10); return isNaN(v) ? 1 : v; } catch { return 1; }
  }); // 1-based
  const [nameColIndex, setNameColIndex] = React.useState(() => {
    try { const v = parseInt(localStorage.getItem('gs_name_col_index') || '1', 10); return isNaN(v) ? 1 : v; } catch { return 1; }
  }); // 1-based (A=1)

  const [loading, setLoading] = React.useState(false);
  const [headers, setHeaders] = React.useState([]); // [{text, parsed, col, letter}]
  const [names, setNames] = React.useState([]);     // [{text, row, cleaned, idHint}]
  const [rawRows, setRawRows] = React.useState([]);

  const [employeeQuery, setEmployeeQuery] = React.useState("");
  const [dateQuery, setDateQuery] = React.useState(""); // yyyy-MM-dd
  const [result, setResult] = React.useState(null);
  const [notes, setNotes] = React.useState("");

  const parseHeader = React.useCallback((txt) => {
    if (!txt) return null;
    const s = String(txt).trim();
    // Try explicit formats
    const tryFormats = [
      "d-MMM",
      "dd-MMM",
      "d/MM/yyyy",
      "dd/MM/yyyy",
      "yyyy-MM-dd",
      "d MMM",
      "dd MMM"
    ];
    for (let f of tryFormats) {
      try {
        const base = f.includes("yyyy") ? s : `${s}-${headerYear}`;
        const parsed = parse(base, f.includes("yyyy") ? f : `${f}-yyyy`, new Date());
        if (!isNaN(parsed?.getTime?.())) return format(parsed, "yyyy-MM-dd");
      } catch {}
    }
    // Fallback Date()
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
    } catch {}
    return null;
  }, [headerYear]);

  React.useEffect(() => {
    try { localStorage.setItem('gs_header_row_index', String(headerRowIndex)); } catch {}
  }, [headerRowIndex]);
  React.useEffect(() => {
    try { localStorage.setItem('gs_name_col_index', String(nameColIndex)); } catch {}
  }, [nameColIndex]);

  const load = async () => {
    if (!spreadsheetId || !sheetName) return;
    setLoading(true);
    setNotes("");
    try {
      const { data } = await googleSheetsDb({
        action: "read",
        spreadsheetId,
        sheetName,
        range: `${sheetName}!A1:ZZ200`
      });
      const raw = Array.isArray(data?.raw) ? data.raw : [];
      setRawRows(raw);
      const hrIdx = Math.max(1, headerRowIndex) - 1; // 0-based
      const headerRow = raw[hrIdx] || [];
      const hdrs = headerRow.map((text, idx) => ({ text, parsed: parseHeader(text), col: idx + 1, letter: colLetter(idx) }));
      setHeaders(hdrs);
      const nameIdx = Math.max(1, nameColIndex) - 1;
      const nm = raw.slice(hrIdx + 1).map((row, i) => {
        const cell = row?.[nameIdx] ?? "";
        return { text: cell, row: hrIdx + 2 + i, cleaned: cleanName(cell), idHint: extractIdInBrackets(cell) };
      });
      setNames(nm);
      setNotes(`Loaded ${raw.length} rows, ${headerRow.length} columns. Parsed ${hdrs.filter(h=>h.parsed).length} date headers. Using header row #${headerRowIndex}, names column ${colLetter(nameIdx)}.`);
    } catch (e) {
      setNotes(String(e?.response?.data || e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const compute = () => {
    setResult(null);
    if (!employeeQuery || !dateQuery) return;

    // Find date column
    const hdr = headers.find((h) => h.parsed === dateQuery);
    // Try alternative: if header holds day-month (no year) parseHeader(dateQuery display)? not needed here

    // Find row by name or id
    const q = employeeQuery.trim().toLowerCase();
    let rowRec = null;
    // Prefer match by [ID]
    rowRec = names.find((n) => (n.idHint || "").toLowerCase() === q) || null;
    if (!rowRec) {
      rowRec = names.find((n) => n.cleaned.toLowerCase() === q) || null;
    }
    if (!rowRec) {
      rowRec = names.find((n) => n.text.toLowerCase().includes(q)) || null;
    }

    if (!hdr || !rowRec) {
      setResult({
        ok: false,
        message: `Missing ${!hdr ? "date column" : "employee row"}`,
        dateFound: !!hdr,
        rowFound: !!rowRec
      });
      return;
    }

    const a1 = `${hdr.letter}${rowRec.row}`;
    setResult({ ok: true, a1, col: hdr.col, row: rowRec.row, colLetter: hdr.letter, headerText: hdr.text, employeeCell: rowRec.text });
  };

  React.useEffect(() => {
    if (dateQuery && headers.length) compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateQuery, employeeQuery, headers, names]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Sheet Inspector</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs">Header Year</Label>
          <Input type="number" className="w-24 h-8" value={headerYear} onChange={(e)=>setHeaderYear(Number(e.target.value)||new Date().getFullYear())} />
          <Label className="text-xs">Header Row</Label>
          <Input type="number" className="w-20 h-8" value={headerRowIndex} onChange={(e)=>setHeaderRowIndex(Math.max(1, Number(e.target.value)||1))} />
          <Label className="text-xs">Name Column</Label>
          <Input className="w-20 h-8" value={colLetter(Math.max(1, nameColIndex)-1)} onChange={(e)=>{
            const v = String(e.target.value||'A').toUpperCase().replace(/[^A-Z]/g,'');
            const idx = Math.max(1, v.charCodeAt(0) - 64);
            setNameColIndex(idx);
          }} />
          <Button size="sm" onClick={load} disabled={!spreadsheetId || !sheetName || loading}>{loading ? "Loading…" : "Load"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Spreadsheet ID</Label>
          <Input value={spreadsheetId} onChange={(e)=>setSpreadsheetId(e.target.value)} placeholder="..." />
          <Label className="text-xs mt-2 block">Sheet (Tab) Name</Label>
          <Input value={sheetName} onChange={(e)=>setSheetName(e.target.value)} placeholder="Rota" />
          <p className="mt-2 text-xs text-slate-500 whitespace-pre-wrap">{notes || "—"}</p>
        </div>

        <div>
          <Label className="text-xs">Date headers (parsed)</Label>
          <div className="mt-1 h-40 overflow-auto border rounded">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left">Header</th>
                  <th className="px-2 py-1 text-left">Parsed</th>
                  <th className="px-2 py-1 text-left">Col</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={i} className={!h.parsed ? "text-slate-400" : ""}>
                    <td className="px-2 py-1">{String(h.text || "").trim() || "(blank)"}</td>
                    <td className="px-2 py-1">{h.parsed || "—"}</td>
                    <td className="px-2 py-1">{h.letter} ({h.col})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Pick a date</Label>
            <Input type="date" value={dateQuery} onChange={(e)=>setDateQuery(e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="text-xs">Names (column A)</Label>
          <Input className="mt-1" placeholder="Search name or [EMPID]" value={employeeQuery} onChange={(e)=>setEmployeeQuery(e.target.value)} />
          <div className="mt-2 h-40 overflow-auto border rounded">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left">Row</th>
                  <th className="px-2 py-1 text-left">Name cell</th>
                </tr>
              </thead>
              <tbody>
                {names
                  .filter(n => !employeeQuery || n.text.toLowerCase().includes(employeeQuery.toLowerCase()) || (n.idHint||"").toLowerCase().includes(employeeQuery.toLowerCase()))
                  .slice(0, 200)
                  .map((n, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1">{n.row}</td>
                      <td className="px-2 py-1">{n.text || "(blank)"}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-sm">
            {result ? (
              result.ok ? (
                <div className="p-2 rounded border bg-green-50 text-green-700 flex items-center gap-3">
                  <span>Target cell: <strong>{result.a1}</strong> (col {result.colLetter}, row {result.row})</span>
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(result.a1)}>Copy</Button>
                </div>
              ) : (
                <div className="p-2 rounded border bg-amber-50 text-amber-700">
                  {result.message}
                </div>
              )
            ) : (
              <div className="text-slate-500 text-xs">Pick a date and search a name to compute the A1 cell.</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}