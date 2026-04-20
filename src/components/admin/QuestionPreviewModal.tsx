import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

export interface QuestionRecord {
  id: string;
  day_number: number | null;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
  question_type: string;
  month: string | null;
  is_active?: boolean;
  has_been_live?: boolean;
  activated_at?: string | null;
  expires_at?: string | null;
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

  // Lock editing once a question has gone live (or is currently live)
  const isLocked = !!form.has_been_live;

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
  const status = form.is_active
    ? 'Live'
    : form.has_been_live
      ? 'Expired'
      : 'Upcoming';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border film-grain max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-accent gold-glow text-center">
            {editing ? 'Edit Question' : 'Question Preview'}
          </DialogTitle>
        </DialogHeader>

        <OrnamentalDivider className="my-2" />

        {isLocked && !editing && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-secondary/40 border border-border/50 mb-2 text-xs text-muted-foreground">
            <Lock size={12} className="text-accent" />
            This question has gone live — it can no longer be edited or deleted. View only.
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-muted-foreground">Status</label>
              <p className={`font-serif ${form.is_active ? 'text-destructive' : form.has_been_live ? 'text-muted-foreground' : 'text-accent'}`}>
                {status}
              </p>
            </div>
            <div>
              <label className="text-muted-foreground">Day</label>
              <p className="font-serif">{form.day_number ? `D${form.day_number}` : '—'}</p>
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
          ) : !isLocked ? (
            <Button onClick={() => setEditing(true)} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-serif">
              Edit
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
