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
        helper="The currently active question (auto-expires after 24h)."
        bucket="live"
        questions={live}
        counts={submissionCounts}
        onPreview={setPreviewQ}
        onDelete={deleteQuestion}
        onResponses={setResponsesQ}
      />

      <Section
        title="Upcoming Pool"
        helper="Waiting to be selected. You can edit or delete these."
        bucket="upcoming"
        questions={upcoming}
        counts={submissionCounts}
        onPreview={setPreviewQ}
        onDelete={deleteQuestion}
        onResponses={setResponsesQ}
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
}

function Section({ title, helper, bucket, questions, counts, onPreview, onDelete, onResponses }: SectionProps) {
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
            return (
              <div key={q.id} className="flex items-center gap-2 p-2.5 border border-border/60 rounded-md bg-secondary/40 hover:bg-secondary transition-colors">
                {bucket === 'live' && (
                  <span className="bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Live</span>
                )}
                {bucket === 'expired' && q.day_number != null && (
                  <span className="text-accent font-serif w-9 text-xs">D{q.day_number}</span>
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
