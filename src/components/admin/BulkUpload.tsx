import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { downloadSampleXlsx, type QuestionRow } from '@/lib/sampleXlsx';
import { Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  onSaved?: () => void;
}

export function BulkUpload({ onSaved }: Props) {
  const [parsedRows, setParsedRows] = useState<QuestionRow[]>([]);
  const [saving, setSaving] = useState(false);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<QuestionRow>(ws);
        // Strip out any legacy day_number/month columns from older files
        const cleaned = rows.map(r => {
          const { day_number, month, ...rest } = r as any;
          return rest as QuestionRow;
        });
        setParsedRows(cleaned);
      } catch (err) {
        toast({ title: 'Failed to parse file', description: String(err), variant: 'destructive' });
      }
    };
    reader.readAsBinaryString(file);
  }

  function updateRow(index: number, field: keyof QuestionRow, value: string) {
    setParsedRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  function removeRow(index: number) {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  }

  async function saveAll() {
    setSaving(true);
    // Insert as inactive — system will rotate them in automatically
    const payload = parsedRows.map(r => {
      let scheduled: string | null = null;
      if (r.scheduled_for && String(r.scheduled_for).trim()) {
        const d = new Date(String(r.scheduled_for).trim().replace(' ', 'T'));
        if (!isNaN(d.getTime())) scheduled = d.toISOString();
      }
      return {
        question_text: r.question_text,
        option_a: r.option_a ?? null,
        option_b: r.option_b ?? null,
        option_c: r.option_c ?? null,
        option_d: r.option_d ?? null,
        correct_answer: r.correct_answer,
        question_type: r.question_type,
        is_active: false,
        has_been_live: false,
        scheduled_for: scheduled,
        image_url: r.image_url?.trim() || null,
      };
    });
    const { error } = await supabase.from('questions').insert(payload as any);
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Added ${parsedRows.length} questions` });
    setParsedRows([]);
    onSaved?.();
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-6 film-grain">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-lg text-accent">Bulk Upload</h3>
        <Button onClick={downloadSampleXlsx} variant="outline" size="sm" className="text-xs border-accent/40 text-accent hover:bg-accent/10">
          <Download size={12} className="mr-1.5" /> Sample .xlsx
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        Optional columns: <span className="text-accent">scheduled_for</span> (e.g. <code>2026-05-01 09:00</code>) and <span className="text-accent">image_url</span> (public URL of an image to show with the question).
        Use landscape 4:3 images, ideally 1200×900 px; the quiz will show the complete image without cropping.
      </p>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-serif file:bg-accent file:text-accent-foreground hover:file:bg-accent/90"
      />

      {parsedRows.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">{parsedRows.length} rows parsed — review & edit before saving:</p>
          <div className="max-h-72 overflow-auto border border-border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-secondary sticky top-0">
                <tr className="border-b border-border">
                  <th className="p-2 text-left">Question</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Answer</th>
                  <th className="p-2 text-left">Schedule</th>
                  <th className="p-2 text-left">Image URL</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((r, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-1.5 max-w-[280px]">
                      <input
                        value={r.question_text}
                        onChange={e => updateRow(i, 'question_text', e.target.value)}
                        className="w-full bg-background border border-input rounded px-1.5 py-1 text-xs"
                      />
                    </td>
                    <td className="p-1.5">
                      <select
                        value={r.question_type}
                        onChange={e => updateRow(i, 'question_type', e.target.value)}
                        className="bg-background border border-input rounded px-1.5 py-1 text-xs"
                      >
                        <option value="mcq">mcq</option>
                        <option value="text">text</option>
                      </select>
                    </td>
                    <td className="p-1.5">
                      <input
                        value={r.correct_answer}
                        onChange={e => updateRow(i, 'correct_answer', e.target.value)}
                        className="w-20 bg-background border border-input rounded px-1.5 py-1 text-xs"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        placeholder="YYYY-MM-DD HH:MM"
                        value={r.scheduled_for ?? ''}
                        onChange={e => updateRow(i, 'scheduled_for', e.target.value)}
                        className="w-36 bg-background border border-input rounded px-1.5 py-1 text-xs"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        placeholder="https://…"
                        value={r.image_url ?? ''}
                        onChange={e => updateRow(i, 'image_url', e.target.value)}
                        className="w-44 bg-background border border-input rounded px-1.5 py-1 text-xs"
                      />
                    </td>
                    <td className="p-1.5 text-right">
                      <button
                        onClick={() => removeRow(i)}
                        className="text-destructive hover:text-destructive/80 text-base leading-none"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={saveAll} disabled={saving || parsedRows.length === 0} className="mt-3 bg-accent text-accent-foreground hover:bg-accent/90 font-serif">
            {saving ? 'Saving…' : `Save ${parsedRows.length} to Pool`}
          </Button>
        </div>
      )}
    </div>
  );
}
