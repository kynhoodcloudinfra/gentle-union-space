import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { supabase, getCurrentMonth, getTodayDayNumber } from '@/lib/supabase';
import * as XLSX from 'xlsx';

const ADMIN_PASSWORD = 'rajaadmin123';

interface QuestionRow {
  day_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  question_type: string;
  month: string;
}

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [parsedRows, setParsedRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Single question form
  const [form, setForm] = useState<QuestionRow>({
    day_number: getTodayDayNumber(),
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: '',
    question_type: 'mcq',
    month: getCurrentMonth(),
  });

  useEffect(() => {
    if (sessionStorage.getItem('raja_admin') === 'true') {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (authenticated) loadQuestions();
  }, [authenticated]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('raja_admin', 'true');
      setAuthenticated(true);
    }
  };

  async function loadQuestions() {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .order('month', { ascending: false })
      .order('day_number', { ascending: true });
    setQuestions(data ?? []);
  }

  async function addQuestion() {
    setLoading(true);
    await supabase.from('questions').insert(form);
    setForm({ ...form, question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '' });
    await loadQuestions();
    setLoading(false);
  }

  async function deleteQuestion(id: string) {
    await supabase.from('questions').delete().eq('id', id);
    await loadQuestions();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<QuestionRow>(ws);
      setParsedRows(rows);
    };
    reader.readAsBinaryString(file);
  }

  async function saveParsedRows() {
    setLoading(true);
    await supabase.from('questions').insert(parsedRows);
    setParsedRows([]);
    await loadQuestions();
    setLoading(false);
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm">
          <h1 className="font-serif text-2xl text-accent text-center mb-4">Admin Access</h1>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            className="bg-background mb-3"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <Button onClick={handleLogin} className="w-full bg-accent text-accent-foreground">Enter</Button>
        </div>
      </div>
    );
  }

  const todayDay = getTodayDayNumber();
  const currentMonth = getCurrentMonth();
  const grouped: Record<string, any[]> = {};
  questions.forEach(q => {
    (grouped[q.month] ??= []).push(q);
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl text-accent gold-glow text-center pt-4">Admin Panel</h1>
        <OrnamentalDivider />

        {/* Add Single Question */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6 film-grain">
          <h2 className="font-serif text-xl text-accent mb-4">Add Question</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-muted-foreground">Day Number</label>
              <Input type="number" value={form.day_number} onChange={e => setForm({ ...form, day_number: parseInt(e.target.value) })} className="bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Month (YYYY-MM)</label>
              <Input value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className="bg-background" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-muted-foreground">Question</label>
            <Input value={form.question_text} onChange={e => setForm({ ...form, question_text: e.target.value })} className="bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Input placeholder="Option A" value={form.option_a} onChange={e => setForm({ ...form, option_a: e.target.value })} className="bg-background" />
            <Input placeholder="Option B" value={form.option_b} onChange={e => setForm({ ...form, option_b: e.target.value })} className="bg-background" />
            <Input placeholder="Option C" value={form.option_c} onChange={e => setForm({ ...form, option_c: e.target.value })} className="bg-background" />
            <Input placeholder="Option D" value={form.option_d} onChange={e => setForm({ ...form, option_d: e.target.value })} className="bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-muted-foreground">Correct Answer</label>
              <Input value={form.correct_answer} onChange={e => setForm({ ...form, correct_answer: e.target.value })} className="bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select value={form.question_type} onChange={e => setForm({ ...form, question_type: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="mcq">MCQ</option>
                <option value="text">Text</option>
              </select>
            </div>
          </div>
          <Button onClick={addQuestion} disabled={loading || !form.question_text} className="bg-accent text-accent-foreground">
            Add Question
          </Button>
        </div>

        {/* Bulk Upload */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6 film-grain">
          <h2 className="font-serif text-xl text-accent mb-4">Bulk Upload (.xlsx)</h2>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="text-sm text-muted-foreground mb-3" />
          {parsedRows.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground mb-2">{parsedRows.length} rows parsed:</p>
              <div className="max-h-48 overflow-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary">
                      <th className="p-2 text-left">Day</th>
                      <th className="p-2 text-left">Question</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Answer</th>
                      <th className="p-2 text-left">Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-2">{r.day_number}</td>
                        <td className="p-2 truncate max-w-[200px]">{r.question_text}</td>
                        <td className="p-2">{r.question_type}</td>
                        <td className="p-2">{r.correct_answer}</td>
                        <td className="p-2">{r.month}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={saveParsedRows} disabled={loading} className="mt-3 bg-accent text-accent-foreground">
                Save All to Database
              </Button>
            </div>
          )}
        </div>

        {/* Question Manager */}
        <div className="bg-card border border-border rounded-xl p-6 film-grain">
          <h2 className="font-serif text-xl text-accent mb-4">Questions</h2>
          {Object.entries(grouped).map(([m, qs]) => (
            <div key={m} className="mb-6">
              <h3 className="font-serif text-lg text-foreground mb-2">{m}</h3>
              <div className="space-y-2">
                {qs.map((q: any) => (
                  <div key={q.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-secondary/30">
                    <span className="text-accent font-serif w-8">D{q.day_number}</span>
                    {q.day_number === todayDay && q.month === currentMonth && (
                      <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-bold">LIVE</span>
                    )}
                    <span className="flex-1 text-sm truncate">{q.question_text}</span>
                    <span className="text-xs text-muted-foreground">{q.question_type}</span>
                    <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)} className="text-destructive hover:text-destructive">
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
