
import React from "react";
import { WikiEntry } from "@/entities/WikiEntry";
import { User } from "@/entities/User";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Tag as TagIcon, Filter } from "lucide-react";

export default function AppWiki() {
  const [entries, setEntries] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [me, setMe] = React.useState(null);

  // new entry form
  const [showForm, setShowForm] = React.useState(false);
  const [term, setTerm] = React.useState("");
  const [definition, setDefinition] = React.useState("");
  const [newCat, setNewCat] = React.useState("staffing");
  const [tags, setTags] = React.useState("");
  const [synonyms, setSynonyms] = React.useState("");
  const [examples, setExamples] = React.useState("");

  const load = async () => {
    setLoading(true);
    try {
      const list = await WikiEntry.list("-updated_date", 1000);
      setEntries(list || []);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    User.me().then(setMe).catch(() => setMe(null));
  }, []);

  const canCreate = me && (me.role === "admin" || me.access_level === "manager");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (entries || []).filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      const hay = [
        e.term,
        e.definition,
        (e.tags || []).join(" "),
        (e.synonyms || []).join(" ")
      ].join(" ").toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => String(a.term).localeCompare(String(b.term)));
  }, [entries, query, category]);

  const onCreate = async () => {
    if (!term.trim() || !definition.trim()) return;
    const payload = {
      term: term.trim(),
      definition: definition.trim(),
      category: newCat,
      tags: tags.split(",").map(s => s.trim()).filter(Boolean),
      synonyms: synonyms.split(",").map(s => s.trim()).filter(Boolean),
      examples: examples.trim() || undefined,
      status: "published",
      owner_email: me?.email || ""
    };
    await WikiEntry.create(payload);
    setTerm(""); setDefinition(""); setNewCat("staffing"); setTags(""); setSynonyms(""); setExamples("");
    setShowForm(false);
    await load();
  };

  return (
    <div className="p-4 md:p-6 themed">
      <Card className="max-w-5xl mx-auto">
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>AppWiki</CardTitle>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--dm-text-tertiary)' }} />
              <Input
                placeholder="Search terms, definitions, tags…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 md:w-80"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: 'var(--dm-text-tertiary)' }} />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="staffing">Staffing</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="governance">Governance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canCreate && (
              <Button onClick={() => setShowForm(!showForm)} className="whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" /> New entry
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && canCreate && (
            <div className="border rounded-lg p-4" style={{ background: 'var(--dm-bg-subtle)', borderColor: 'var(--dm-border)' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-600 mb-1">Term</div>
                  <Input value={term} onChange={(e) => setTerm(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Category</div>
                  <Select value={newCat} onValueChange={setNewCat}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staffing">Staffing</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="data">Data</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="governance">Governance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-slate-600 mb-1">Definition</div>
                  <Textarea value={definition} onChange={(e) => setDefinition(e.target.value)} rows={4} />
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Tags (comma-separated)</div>
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., leave, policy, non-working" />
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Synonyms (comma-separated)</div>
                  <Input value={synonyms} onChange={(e) => setSynonyms(e.target.value)} placeholder="e.g., AL, OFF" />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-slate-600 mb-1">Examples (optional)</div>
                  <Textarea value={examples} onChange={(e) => setExamples(e.target.value)} rows={2} placeholder="How this is applied in reports" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={onCreate}>Save</Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-sm" style={{ color: 'var(--dm-text-tertiary)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--dm-text-tertiary)' }}>No entries match your search.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filtered.map((e) => (
                <div key={e.id} className="border rounded-lg p-4" style={{ background: 'var(--dm-bg-elevated)', borderColor: 'var(--dm-border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold" style={{ color: 'var(--dm-text-primary)' }}>{e.term}</div>
                      <div className="text-xs" style={{ color: 'var(--dm-text-tertiary)' }}>{e.category}</div>
                    </div>
                    {e.last_reviewed_date && (
                      <div className="text-[11px]" style={{ color: 'var(--dm-text-tertiary)' }}>Reviewed: {e.last_reviewed_date}</div>
                    )}
                  </div>
                  <div className="text-sm mt-2 whitespace-pre-wrap" style={{ color: 'var(--dm-text-secondary)' }}>{e.definition}</div>
                  {e.examples && <div className="text-xs mt-2" style={{ color: 'var(--dm-text-tertiary)' }}>Example: {e.examples}</div>}
                  {(e.tags && e.tags.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {e.tags.map((t, i) => (
                        <Badge key={i} variant="outline" className="gap-1">
                          <TagIcon className="w-3 h-3" /> {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {(e.synonyms && e.synonyms.length > 0) && (
                    <div className="text-xs mt-2" style={{ color: 'var(--dm-text-tertiary)' }}>
                      Synonyms: {e.synonyms.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
