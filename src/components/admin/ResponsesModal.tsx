import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { adminSelect } from '@/lib/adminApi';

interface Submission {
  id: string;
  display_name: string | null;
  name: string;
  kyn_username: string | null;
  phone_number: string;
  answer_given: string | null;
  is_correct: boolean;
  time_taken_seconds: number | null;
  submitted_at: string;
}

interface Props {
  questionId: string | null;
  questionText: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResponsesModal({ questionId, questionText, open, onOpenChange }: Props) {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !questionId) return;
    setLoading(true);
    adminSelect<Submission>('submissions', {
      columns: 'id, display_name, name, kyn_username, phone_number, answer_given, is_correct, time_taken_seconds, submitted_at',
      eq: [{ column: 'question_id', value: questionId }],
      order: { column: 'time_taken_seconds', ascending: true, nullsFirst: false },
    }).then(
      data => { setRows(data); setLoading(false); },
      () => { setRows([]); setLoading(false); },
    );
  }, [open, questionId]);

  const correctCount = rows.filter(r => r.is_correct).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl bg-card border-border film-grain max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-accent gold-glow text-center">
            Responses
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-foreground text-center font-serif">{questionText}</p>
        <OrnamentalDivider className="my-2" />

        {loading ? (
          <p className="text-center text-muted-foreground py-8 font-serif">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No responses yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3 text-center">
              <div className="bg-background/50 rounded-md p-2">
                <p className="text-2xl font-serif text-accent">{rows.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
              </div>
              <div className="bg-background/50 rounded-md p-2">
                <p className="text-2xl font-serif text-accent">{correctCount}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Correct</p>
              </div>
              <div className="bg-background/50 rounded-md p-2">
                <p className="text-2xl font-serif text-accent">
                  {rows.length ? Math.round((correctCount / rows.length) * 100) : 0}%
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Accuracy</p>
              </div>
            </div>

            <div className="overflow-auto flex-1 min-h-0 border border-border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-secondary sticky top-0">
                  <tr className="border-b border-border">
                    <th className="p-2 text-left font-serif">Player</th>
                    <th className="p-2 text-left font-serif">Answer</th>
                    <th className="p-2 text-center font-serif">Correct?</th>
                    <th className="p-2 text-right font-serif">Time</th>
                    <th className="p-2 text-right font-serif">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-background/30">
                      <td className="p-2">
                        <p className="font-serif text-foreground">{r.display_name ?? r.name}</p>
                        {r.kyn_username && <p className="text-[10px] text-muted-foreground">@{r.kyn_username}</p>}
                      </td>
                      <td className="p-2 text-foreground">{r.answer_given ?? '—'}</td>
                      <td className="p-2 text-center">
                        {r.is_correct ? (
                          <span className="text-accent">✓</span>
                        ) : (
                          <span className="text-destructive">✗</span>
                        )}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">{r.time_taken_seconds ?? '—'}s</td>
                      <td className="p-2 text-right text-muted-foreground">
                        {new Date(r.submitted_at).toLocaleString('en-GB', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
