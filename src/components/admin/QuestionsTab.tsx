import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { supabase } from '@/lib/supabase';
import { Eye, BarChart3, Trash2, Plus, Lock, Play, Pause, Clock } from 'lucide-react';
import { BulkUpload } from './BulkUpload';
import { QuestionPreviewModal, type QuestionRecord } from './QuestionPreviewModal';
import { ResponsesModal } from './ResponsesModal';
import { toast } from '@/hooks/use-toast';

const blankForm = {
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: '',
  question_type: 'mcq' as 'mcq' | 'text',
};

type Bucket = 'live' | 'upcoming' | 'expired';

export function QuestionsTab() {
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(false);
  const [previewQ, setPreviewQ] = useState<QuestionRecord | null>(null);
  const [responsesQ, setResponsesQ] = useState<QuestionRecord | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [scheduleQ, setScheduleQ] = useState<QuestionRecord | null>(null);
  const [scheduleValue, setScheduleValue] = useState('');

  async function loadQuestions() {
    const { data: qs } = await supabase
      .from('questions')
      .select('*')
      .order('is_active', { ascending: false })
      .order('activated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    setQuestions((qs ?? []) as QuestionRecord[]);

    if (qs && qs.length) {
      const { data: subs } = await supabase
        .from('submissions')
        .select('question_id');
      const counts: Record<string, number> = {};
      (subs ?? []).forEach(s => {
        counts[s.question_id] = (counts[s.question_id] ?? 0) + 1;
      });
      setSubmissionCounts(counts);
    }
  }

  useEffect(() => { loadQuestions(); }, []);

  async function addQuestion() {
    setLoading(true);
    const payload = form.question_type === 'text'
      ? { ...form, option_a: null, option_b: null, option_c: null, option_d: null, is_active: false, has_been_live: false }
      : { ...form, is_active: false, has_been_live: false };
    const { error } = await supabase.from('questions').insert(payload as any);
    setLoading(false);
    if (error) {
      toast({ title: 'Failed to add', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Question added to pool' });
    setForm({ ...blankForm });
    setShowAddForm(false);
    loadQuestions();
  }

  async function deleteQuestion(q: QuestionRecord) {
    if (q.has_been_live) {
      toast({
        title: 'Cannot delete',
        description: 'This question has gone live. It can only be viewed.',
        variant: 'destructive',
      });
      return;
    }
    if (!confirm('Delete this question?')) return;
    await supabase.from('questions').delete().eq('id', q.id);
    loadQuestions();
  }

  async function activateQuestion(q: QuestionRecord) {
    // Deactivate any currently live question first
    const { data: liveQs } = await supabase.from('questions').select('id').eq('is_active', true);
    if (liveQs && liveQs.length > 0) {
      if (!confirm('A question is currently live. Deactivate it and make this one live now?')) return;
      await supabase.from('questions').update({ is_active: false }).in('id', liveQs.map(r => r.id));
    } else {
      if (!confirm('Make this question live now? It will run for 24 hours.')) return;
    }
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { data: maxRow } = await supabase
      .from('questions')
      .select('day_number')
      .order('day_number', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const nextDay = (maxRow?.day_number ?? 0) + 1;
    const { error } = await supabase.from('questions').update({
      is_active: true,
      has_been_live: true,
      activated_at: now.toISOString(),
      expires_at: expires.toISOString(),
      scheduled_for: null,
      day_number: q.day_number ?? nextDay,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    }).eq('id', q.id);
    if (error) {
      toast({ title: 'Activation failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Question is now live' });
    loadQuestions();
  }

  async function deactivateQuestion(q: QuestionRecord) {
    if (!confirm('Deactivate this question? It will be marked expired.')) return;
    const { error } = await supabase.from('questions').update({
      is_active: false,
      expires_at: new Date().toISOString(),
    }).eq('id', q.id);
    if (error) {
      toast({ title: 'Deactivation failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Question deactivated' });
    loadQuestions();
  }

  function openSchedule(q: QuestionRecord) {
    setScheduleQ(q);
    // Pre-fill with existing scheduled_for or now+1h, formatted for datetime-local
    const seed = q.scheduled_for ? new Date(q.scheduled_for) : new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    setScheduleValue(
      `${seed.getFullYear()}-${pad(seed.getMonth() + 1)}-${pad(seed.getDate())}T${pad(seed.getHours())}:${pad(seed.getMinutes())}`
    );
  }

  async function saveSchedule() {
    if (!scheduleQ) return;
    const iso = scheduleValue ? new Date(scheduleValue).toISOString() : null;
    const { error } = await supabase.from('questions').update({ scheduled_for: iso }).eq('id', scheduleQ.id);
    if (error) {
      toast({ title: 'Schedule failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: iso ? 'Question scheduled' : 'Schedule cleared' });
    setScheduleQ(null);
    loadQuestions();
  }

  async function clearSchedule() {
    if (!scheduleQ) return;
    await supabase.from('questions').update({ scheduled_for: null }).eq('id', scheduleQ.id);
    toast({ title: 'Schedule cleared' });
    setScheduleQ(null);
    loadQuestions();
  }

  // Categorise
  const live: QuestionRecord[] = [];
  const upcoming: QuestionRecord[] = [];
  const expired: QuestionRecord[] = [];
  questions.forEach(q => {
    if (q.is_active) live.push(q);
    else if (q.has_been_live) expired.push(q);
    else upcoming.push(q);
  });

  return (
    <div>
      {/* Add question */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6 film-grain">
        <button
          onClick={() => setShowAddForm(s => !s)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="font-serif text-lg text-accent">Add Question to Pool</h3>
          <Plus size={18} className={`text-accent transition-transform ${showAddForm ? 'rotate-45' : ''}`} />
        </button>

        {showAddForm && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Questions go into a pool. The system shuffles and makes one live each day automatically — no manual scheduling.
            </p>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select value={form.question_type} onChange={e => setForm({ ...form, question_type: e.target.value as 'mcq' | 'text' })} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                <option value="mcq">MCQ</option>
                <option value="text">Text</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Question</label>
              <Textarea value={form.question_text} onChange={e => setForm({ ...form, question_text: e.target.value })} className="bg-background min-h-[70px]" />
            </div>

            {form.question_type === 'mcq' && (
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Option A" value={form.option_a} onChange={e => setForm({ ...form, option_a: e.target.value })} className="bg-background" />
                <Input placeholder="Option B" value={form.option_b} onChange={e => setForm({ ...form, option_b: e.target.value })} className="bg-background" />
                <Input placeholder="Option C" value={form.option_c} onChange={e => setForm({ ...form, option_c: e.target.value })} className="bg-background" />
                <Input placeholder="Option D" value={form.option_d} onChange={e => setForm({ ...form, option_d: e.target.value })} className="bg-background" />
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground">Correct Answer</label>
              <Input
                value={form.correct_answer}
                onChange={e => setForm({ ...form, correct_answer: e.target.value })}
                className="bg-background"
                placeholder={form.question_type === 'mcq' ? 'A / B / C / D' : 'The correct text answer'}
              />
            </div>

            <Button onClick={addQuestion} disabled={loading || !form.question_text || !form.correct_answer} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-serif">
              {loading ? 'Adding…' : 'Add to Pool'}
            </Button>
          </div>
        )}
      </div>

      {/* Bulk upload */}
      <BulkUpload onSaved={loadQuestions} />

      {/* Sections */}
      <Section
        title="Live Now"
        helper="The currently active question. Auto-expires after 24h, or deactivate manually."
        bucket="live"
        questions={live}
        counts={submissionCounts}
        onPreview={setPreviewQ}
        onDelete={deleteQuestion}
        onResponses={setResponsesQ}
        onActivate={activateQuestion}
        onDeactivate={deactivateQuestion}
        onSchedule={openSchedule}
      />

      <Section
        title="Upcoming Pool"
        helper="Waiting to go live. Activate now, schedule a time, or let auto-rotation pick."
        bucket="upcoming"
        questions={upcoming}
        counts={submissionCounts}
        onPreview={setPreviewQ}
        onDelete={deleteQuestion}
        onResponses={setResponsesQ}
        onActivate={activateQuestion}
        onDeactivate={deactivateQuestion}
        onSchedule={openSchedule}
      />

      <Section
        title="Expired"
        helper="Already played. View stats only — no edits or deletes."
        bucket="expired"
        questions={expired}
        counts={submissionCounts}
        onPreview={setPreviewQ}
        onDelete={deleteQuestion}
        onResponses={setResponsesQ}
        onActivate={activateQuestion}
        onDeactivate={deactivateQuestion}
        onSchedule={openSchedule}
      />

      <QuestionPreviewModal
        question={previewQ}
        open={!!previewQ}
        onOpenChange={open => !open && setPreviewQ(null)}
        onSaved={loadQuestions}
      />
      <ResponsesModal
        questionId={responsesQ?.id ?? null}
        questionText={responsesQ?.question_text ?? ''}
        open={!!responsesQ}
        onOpenChange={open => !open && setResponsesQ(null)}
      />

      {/* Schedule dialog */}
      {scheduleQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={() => setScheduleQ(null)}>
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-sm film-grain" onClick={e => e.stopPropagation()}>
            <h3 className="font-serif text-lg text-accent text-center">Schedule Question</h3>
            <OrnamentalDivider className="my-2" />
            <p className="text-xs text-muted-foreground mb-3 truncate">{scheduleQ.question_text}</p>
            <label className="text-xs text-muted-foreground">Go live at</label>
            <Input
              type="datetime-local"
              value={scheduleValue}
              onChange={e => setScheduleValue(e.target.value)}
              className="bg-background mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Auto-rotation will pick this question once the time arrives (and the current live one ends).
            </p>
            <div className="flex gap-2 mt-4">
              <Button onClick={saveSchedule} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-serif">
                Save
              </Button>
              {scheduleQ.scheduled_for && (
                <Button onClick={clearSchedule} variant="outline" className="flex-1">
                  Clear
                </Button>
              )}
              <Button onClick={() => setScheduleQ(null)} variant="ghost" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  helper: string;
  bucket: Bucket;
  questions: QuestionRecord[];
  counts: Record<string, number>;
  onPreview: (q: QuestionRecord) => void;
  onDelete: (q: QuestionRecord) => void;
  onResponses: (q: QuestionRecord) => void;
  onActivate: (q: QuestionRecord) => void;
  onDeactivate: (q: QuestionRecord) => void;
  onSchedule: (q: QuestionRecord) => void;
}

function Section({ title, helper, bucket, questions, counts, onPreview, onDelete, onResponses, onActivate, onDeactivate, onSchedule }: SectionProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 film-grain mb-4">
      <h3 className="font-serif text-lg text-accent">{title} <span className="text-xs text-muted-foreground font-sans">({questions.length})</span></h3>
      <p className="text-[11px] text-muted-foreground mt-0.5">{helper}</p>
      <OrnamentalDivider className="my-2" />

      {questions.length === 0 ? (
        <p className="text-muted-foreground text-xs italic py-2">None.</p>
      ) : (
        <div className="space-y-1.5">
          {questions.map(q => {
            const responses = counts[q.id] ?? 0;
            const locked = bucket !== 'upcoming';
            const scheduled = !!q.scheduled_for;
            return (
              <div key={q.id} className="flex items-center gap-2 p-2.5 border border-border/60 rounded-md bg-secondary/40 hover:bg-secondary transition-colors">
                {bucket === 'live' && (
                  <span className="bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Live</span>
                )}
                {bucket === 'expired' && q.day_number != null && (
                  <span className="text-accent font-serif w-9 text-xs">D{q.day_number}</span>
                )}
                {bucket === 'upcoming' && scheduled && (
                  <span className="text-[9px] uppercase tracking-wider text-accent border border-accent/40 px-1 py-0.5 rounded" title={`Scheduled for ${new Date(q.scheduled_for!).toLocaleString()}`}>
                    Scheduled
                  </span>
                )}
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{q.question_type}</span>
                <span className="flex-1 text-xs truncate text-foreground">{q.question_text}</span>
                {responses > 0 && (
                  <button
                    onClick={() => onResponses(q)}
                    className="text-muted-foreground hover:text-accent flex items-center gap-1 text-xs px-1.5"
                    title="View responses"
                  >
                    <BarChart3 size={14} /> {responses}
                  </button>
                )}
                {bucket === 'upcoming' && (
                  <>
                    <button
                      onClick={() => onActivate(q)}
                      className="text-muted-foreground hover:text-accent p-1"
                      title="Activate now (make live)"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={() => onSchedule(q)}
                      className={`p-1 ${scheduled ? 'text-accent' : 'text-muted-foreground hover:text-accent'}`}
                      title={scheduled ? `Scheduled: ${new Date(q.scheduled_for!).toLocaleString()}` : 'Schedule'}
                    >
                      <Clock size={14} />
                    </button>
                  </>
                )}
                {bucket === 'live' && (
                  <button
                    onClick={() => onDeactivate(q)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Deactivate"
                  >
                    <Pause size={14} />
                  </button>
                )}
                <button
                  onClick={() => onPreview(q)}
                  className="text-muted-foreground hover:text-accent p-1"
                  title="Preview / edit"
                >
                  <Eye size={14} />
                </button>
                {locked ? (
                  <span className="text-muted-foreground/40 p-1" title="Locked — has been live">
                    <Lock size={14} />
                  </span>
                ) : (
                  <button
                    onClick={() => onDelete(q)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
