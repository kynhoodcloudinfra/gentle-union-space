import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

interface QuestionRecord {
  id: string;
  day_number: number;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
  question_type: string;
  month: string;
}

interface Props {
  question: QuestionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function QuestionPreviewModal({ question, open, onOpenChange, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<QuestionRecord | null>(question);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(question);
    setEditing(false);
  }, [question]);

  if (!form) return null;

  async function save() {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase
      .from('questions')
      .update({
        question_text: form.question_text,
        option_a: form.option_a,
        option_b: form.option_b,
        option_c: form.option_c,
        option_d: form.option_d,
        correct_answer: form.correct_answer,
        question_type: form.question_type,
        day_number: form.day_number,
        month: form.month,
      })
      .eq('id', form.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Question updated' });
    setEditing(false);
    onSaved?.();
  }

  const isMcq = form.question_type === 'mcq';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border film-grain max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-accent gold-glow text-center">
            {editing ? 'Edit Question' : 'Question Preview'}
          </DialogTitle>
        </DialogHeader>

        <OrnamentalDivider className="my-2" />

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-muted-foreground">Day</label>
              {editing ? (
                <Input type="number" value={form.day_number} onChange={e => setForm({ ...form, day_number: parseInt(e.target.value) })} className="bg-background h-8" />
              ) : (
                <p className="font-serif text-accent">D{form.day_number}</p>
              )}
            </div>
            <div>
              <label className="text-muted-foreground">Month</label>
              {editing ? (
                <Input value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className="bg-background h-8" />
              ) : (
                <p className="font-serif">{form.month}</p>
              )}
            </div>
            <div>
              <label className="text-muted-foreground">Type</label>
              {editing ? (
                <select value={form.question_type} onChange={e => setForm({ ...form, question_type: e.target.value })} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
                  <option value="mcq">MCQ</option>
                  <option value="text">Text</option>
                </select>
              ) : (
                <p className="font-serif uppercase">{form.question_type}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Question</label>
            {editing ? (
              <Textarea
                value={form.question_text}
                onChange={e => setForm({ ...form, question_text: e.target.value })}
                className="bg-background min-h-[80px]"
              />
            ) : (
              <p className="font-serif text-foreground p-3 bg-background/50 rounded-md mt-1">{form.question_text}</p>
            )}
          </div>

          {isMcq && (
            <div className="space-y-2">
              {(['a', 'b', 'c', 'd'] as const).map(opt => {
                const key = `option_${opt}` as keyof QuestionRecord;
                const value = form[key] as string | null;
                const isCorrect = form.correct_answer.toLowerCase() === opt;
                return (
                  <div key={opt} className="flex items-start gap-2">
                    <span className={`font-serif w-6 pt-1.5 ${isCorrect ? 'text-accent' : 'text-muted-foreground'}`}>
                      {opt.toUpperCase()}.
                    </span>
                    {editing ? (
                      <Input
                        value={value ?? ''}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                        className={`bg-background ${isCorrect ? 'border-accent' : ''}`}
                      />
                    ) : (
                      <p className={`flex-1 p-2 rounded-md ${isCorrect ? 'bg-accent/10 border border-accent/40 text-accent' : 'bg-background/50'}`}>
                        {value ?? '—'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground">Correct Answer</label>
            {editing ? (
              <Input
                value={form.correct_answer}
                onChange={e => setForm({ ...form, correct_answer: e.target.value })}
                className="bg-background"
                placeholder={isMcq ? 'A / B / C / D' : 'The correct text answer'}
              />
            ) : (
              <p className="font-serif text-accent p-2 bg-background/50 rounded-md mt-1">{form.correct_answer}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {editing ? (
            <>
              <Button onClick={save} disabled={saving} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-serif">
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button onClick={() => { setForm(question); setEditing(false); }} variant="outline" className="flex-1">
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-serif">
              Edit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
