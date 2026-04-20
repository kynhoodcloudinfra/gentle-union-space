import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { supabase, getCurrentMonth, getTodayDayNumber } from '@/lib/supabase';
import { Eye, BarChart3, Trash2, Plus } from 'lucide-react';
import { BulkUpload } from './BulkUpload';
import { QuestionPreviewModal } from './QuestionPreviewModal';
import { ResponsesModal } from './ResponsesModal';
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

const blankForm = {
  day_number: getTodayDayNumber(),
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: '',
  question_type: 'mcq' as 'mcq' | 'text',
  month: getCurrentMonth(),
};

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
      .order('month', { ascending: false })
      .order('day_number', { ascending: true });
    setQuestions(qs ?? []);

    // Counts of submissions per question
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
      ? { ...form, option_a: null, option_b: null, option_c: null, option_d: null }
      : form;
    const { error } = await supabase.from('questions').insert(payload);
    setLoading(false);
    if (error) {
      toast({ title: 'Failed to add', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Question added' });
    setForm({ ...blankForm });
    setShowAddForm(false);
    loadQuestions();
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return;
    await supabase.from('questions').delete().eq('id', id);
    loadQuestions();
  }

  const todayDay = getTodayDayNumber();
  const currentMonth = getCurrentMonth();
  const grouped: Record<string, QuestionRecord[]> = {};
  questions.forEach(q => {
    (grouped[q.month] ??= []).push(q);
  });

  return (
    <div>
      {/* Add question */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6 film-grain">
        <button
          onClick={() => setShowAddForm(s => !s)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="font-serif text-lg text-accent">Add Question</h3>
          <Plus size={18} className={`text-accent transition-transform ${showAddForm ? 'rotate-45' : ''}`} />
        </button>

        {showAddForm && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Day</label>
                <Input type="number" value={form.day_number} onChange={e => setForm({ ...form, day_number: parseInt(e.target.value) })} className="bg-background h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Month</label>
                <Input value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className="bg-background h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <select value={form.question_type} onChange={e => setForm({ ...form, question_type: e.target.value as 'mcq' | 'text' })} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="mcq">MCQ</option>
                  <option value="text">Text</option>
                </select>
              </div>
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
              {loading ? 'Adding…' : 'Add Question'}
            </Button>
          </div>
        )}
      </div>

      {/* Bulk upload */}
      <BulkUpload onSaved={loadQuestions} />

      {/* Question list */}
      <div className="bg-card border border-border rounded-xl p-5 film-grain">
        <h3 className="font-serif text-lg text-accent mb-3">Questions</h3>
        {Object.entries(grouped).length === 0 ? (
          <p className="text-muted-foreground text-sm">No questions yet.</p>
        ) : (
          Object.entries(grouped).map(([m, qs]) => (
            <div key={m} className="mb-5">
              <h4 className="font-serif text-sm text-foreground mb-2 tracking-wide">{m}</h4>
              <OrnamentalDivider className="my-2" />
              <div className="space-y-1.5">
                {qs.map(q => {
                  const isLive = q.day_number === todayDay && q.month === currentMonth;
                  const responses = submissionCounts[q.id] ?? 0;
                  return (
                    <div key={q.id} className="flex items-center gap-2 p-2.5 border border-border/60 rounded-md bg-secondary/40 hover:bg-secondary transition-colors">
                      <span className="text-accent font-serif w-9 text-sm">D{q.day_number}</span>
                      {isLive && (
                        <span className="bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Live</span>
                      )}
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{q.question_type}</span>
                      <span className="flex-1 text-xs truncate text-foreground">{q.question_text}</span>
                      {responses > 0 && (
                        <button
                          onClick={() => setResponsesQ(q)}
                          className="text-muted-foreground hover:text-accent flex items-center gap-1 text-xs px-1.5"
                          title="View responses"
                        >
                          <BarChart3 size={14} /> {responses}
                        </button>
                      )}
                      <button
                        onClick={() => setPreviewQ(q)}
                        className="text-muted-foreground hover:text-accent p-1"
                        title="Preview / edit"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

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
