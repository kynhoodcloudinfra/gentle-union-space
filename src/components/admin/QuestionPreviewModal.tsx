import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { supabase } from '@/lib/supabase';
import { adminUpdate } from '@/lib/adminApi';
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
  scheduled_for?: string | null;
  created_at?: string | null;
  image_url?: string | null;
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
  const isLocked = !!form.has_been_live && !form.is_active;

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      await adminUpdate('questions', {
        question_text: form.question_text,
        option_a: form.option_a,
        option_b: form.option_b,
        option_c: form.option_c,
        option_d: form.option_d,
        correct_answer: form.correct_answer,
        question_type: form.question_type,
        image_url: form.image_url || null,
      }, { eq: [{ column: 'id', value: form.id }] });
    } catch (err: any) {
      setSaving(false);
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
      return;
    }
    setSaving(false);
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
      <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg bg-card border-border film-grain max-h-[calc(100dvh-2rem)] overflow-y-auto ${isLocked && !editing ? 'sm:max-w-xl' : ''}`}>
        <DialogHeader>
          <DialogTitle className={`font-serif text-2xl text-accent gold-glow ${isLocked && !editing ? 'text-center' : 'text-center'}`}>
            {editing ? 'Edit Question' : 'Question Preview'}
          </DialogTitle>
        </DialogHeader>

        <OrnamentalDivider className="my-2" />

        {isLocked && !editing && (
          <div className="flex items-center justify-center gap-2 p-2.5 rounded-md bg-secondary/40 border border-border/50 mb-2 text-xs text-muted-foreground text-center">
            <Lock size={12} className="text-accent" />
            <span>This question has gone live — view only.</span>
          </div>
        )}

        <div className={`space-y-3 ${isLocked && !editing ? 'text-center' : ''}`}>
          <div className={`grid grid-cols-3 gap-2 text-xs ${isLocked && !editing ? 'max-w-sm mx-auto' : ''}`}>
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
              <p className={`font-serif text-foreground p-3 bg-background/50 rounded-md mt-1 ${isLocked ? 'text-center text-base' : ''}`}>
                {form.question_text}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Image</label>
            {editing ? (
              <div className="space-y-2 mt-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async e => {
                    const f = e.target.files?.[0];
                    if (!f || !form) return;
                    const ext = f.name.split('.').pop() || 'png';
                    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
                    const { error: upErr } = await supabase.storage.from('question-images').upload(path, f);
                    if (upErr) { toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' }); return; }
                    const { data } = supabase.storage.from('question-images').getPublicUrl(path);
                    setForm({ ...form, image_url: data.publicUrl });
                  }}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-serif file:bg-accent file:text-accent-foreground"
                />
                <Input
                  placeholder="…or paste an image URL"
                  value={form.image_url ?? ''}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                  className="bg-background"
                />
                {form.image_url && (
                  <div className="relative inline-block">
                    <img src={form.image_url} alt="preview" className="max-h-32 rounded-md border border-border" />
                    <button type="button" onClick={() => setForm({ ...form, image_url: '' })} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs leading-none">×</button>
                  </div>
                )}
              </div>
            ) : form.image_url ? (
              <img src={form.image_url} alt="Question" className="mt-1 max-h-48 w-full object-contain rounded-md border border-border bg-background/50" />
            ) : (
              <p className="text-xs text-muted-foreground/60 italic mt-1">No image</p>
            )}
          </div>

          {isMcq && (
            <div className={`space-y-2 ${isLocked && !editing ? 'max-w-md mx-auto text-left' : ''}`}>
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

          <div className={isLocked && !editing ? 'max-w-md mx-auto' : ''}>
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
