import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';

// Levenshtein distance for fuzzy matching text answers
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[i], dp[i - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[a.length];
}

function normalizeText(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '');
}

function fuzzyMatch(user: string, correct: string): boolean {
  const u = normalizeText(user);
  const c = normalizeText(correct);
  if (!u || !c) return false;
  if (u === c) return true;
  const dist = levenshtein(u, c);
  // Allow ~20% typos, minimum 1, max 3
  const tolerance = Math.min(3, Math.max(1, Math.floor(c.length * 0.2)));
  return dist <= tolerance;
}

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FilmStripTimer } from './FilmStripTimer';
import { OrnamentalDivider } from './OrnamentalDivider';
import { ReadAloudButton } from './ReadAloudButton';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { supabase, getCurrentMonth } from '@/lib/supabase';
import { getRandomAvatarId } from '@/lib/avatars';

interface Question {
  id: string;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
  question_type: string;
  day_number: number;
  month: string;
  image_url?: string | null;
}

interface ResultData {
  isCorrect: boolean;
  score: number;
  totalScore: number;
  streak: number;
  correctAnswer: string;
  userAnswer: string;
  question: Question;
}

interface QuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

export function QuizModal({ open, onOpenChange, onSubmitted }: QuizModalProps) {
  const { phoneNumber, displayName, kynUsername } = useUser();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResultData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const TOTAL_DURATION = 45;
  const [remainingSeconds, setRemainingSeconds] = useState(TOTAL_DURATION);
  const [submitting, setSubmitting] = useState(false);
  const [tabVisible, setTabVisible] = useState(
    typeof document === 'undefined' ? true : !document.hidden,
  );

  // Track tab visibility so the timer pauses when the tab is backgrounded.
  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Load a question only when needed. Do NOT reset state on close — that would
  // wipe the paused timer. Reopening with the same unanswered question resumes.
  useEffect(() => {
    if (!open || !phoneNumber) return;
    if (question && !result && remainingSeconds > 0) return; // resume
    loadQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phoneNumber]);

  // Countdown driver: only ticks when the modal is open, the tab is visible,
  // a question is being answered, and we're not mid-submit.
  const canTick = open && tabVisible && !!question && !result && !submitting && remainingSeconds > 0;
  useEffect(() => {
    if (!canTick) return;
    const t = setTimeout(() => setRemainingSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [canTick, remainingSeconds]);

  async function loadQuestion() {
    setLoading(true);
    try {
      // Atomically rotate (expire stale + activate next if needed) and return current live question
      // @ts-ignore — RPC name not in generated types yet
      const { data: liveRows, error: rpcErr } = await supabase.rpc('rotate_active_question');
      if (rpcErr) console.error('rotate error', rpcErr);

      let live: any = Array.isArray(liveRows) && liveRows.length > 0 ? liveRows[0] : null;

      if (!live) {
        setQuestion(null);
        setLoading(false);
        return;
      }

      // Defensive: always re-fetch full row (including image_url) directly from the table
      const { data: full } = await supabase
        .from('questions')
        .select('*')
        .eq('id', live.id)
        .maybeSingle();
      if (full) live = { ...live, ...full };

      // Has the user already answered this specific question?
      const { data: existing } = await supabase
        .from('submissions')
        .select('*, questions(correct_answer)')
        .eq('phone_number', phoneNumber!)
        .eq('question_id', live.id)
        .maybeSingle();

      if (existing) {
        const { data: lb } = await supabase
          .from('leaderboard')
          .select('total_score, streak')
          .eq('phone_number', phoneNumber!)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const time = existing.time_taken_seconds ?? 30;
        const isMcqQ = live.question_type === 'mcq';
        const mcqScore = time <= 15 ? 150 : time <= 30 ? 100 : 50;
        const textScore = time <= 15 ? 150 : time <= 30 ? 125 : 100;
        setResult({
          isCorrect: existing.is_correct,
          score: existing.is_correct ? (isMcqQ ? mcqScore : textScore) : 0,
          totalScore: lb?.total_score ?? 0,
          streak: lb?.streak ?? 0,
          correctAnswer: live.correct_answer,
          userAnswer: existing.answer_given ?? '',
          question: live as Question,
        });
        setLoading(false);
        return;
      }

      setQuestion(live as Question);
      setRemainingSeconds(TOTAL_DURATION);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const submitAnswer = useCallback(async (answer: string) => {
    if (submitting || !question || !phoneNumber || !displayName) return;
    setSubmitting(true);

    const month = question.month || getCurrentMonth();
    const dayNumber = question.day_number;

    const timeTaken = Math.max(0, TOTAL_DURATION - remainingSeconds);
    // MCQ: correct_answer can be either a letter (A/B/C/D) or the option text. Resolve both.
    const correctNorm = question.correct_answer.toLowerCase().trim();
    const mcqOptText = (letter: string) => {
      const k = `option_${letter.toLowerCase()}` as keyof Question;
      return ((question[k] as string) ?? '').toLowerCase().trim();
    };
    const answerNorm = answer.toLowerCase().trim();
    const mcqCorrectLetter = ['a','b','c','d'].find(l => mcqOptText(l) === correctNorm) ?? correctNorm;
    const isMcq = question.question_type === 'mcq';
    const isCorrect = isMcq
      ? answerNorm === mcqCorrectLetter || mcqOptText(answer) === correctNorm
      : answer !== '(timed out)' && fuzzyMatch(answer, question.correct_answer);
    const score = isCorrect
      ? (isMcq
          ? (timeTaken <= 15 ? 150 : timeTaken <= 30 ? 100 : 50)
          : (timeTaken <= 15 ? 150 : timeTaken <= 30 ? 125 : 100))
      : 0;

    await supabase.from('submissions').insert({
      phone_number: phoneNumber,
      name: displayName,
      display_name: displayName,
      kyn_username: kynUsername,
      question_id: question.id,
      day_number: dayNumber,
      answer_given: answer,
      is_correct: isCorrect,
      time_taken_seconds: Math.round(timeTaken * 10) / 10,
      month,
    });

    const { data: existingLb } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('month', month)
      .maybeSingle();

    let avatarId: number | null = null;
    const { data: prevEntry } = await supabase
      .from('leaderboard')
      .select('avatar_id')
      .eq('phone_number', phoneNumber)
      .not('avatar_id', 'is', null)
      .limit(1)
      .maybeSingle();
    avatarId = prevEntry?.avatar_id ?? getRandomAvatarId();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    if (existingLb) {
      const newStreak = existingLb.last_played_date === yesterdayStr
        ? existingLb.streak + 1
        : existingLb.last_played_date === todayStr ? existingLb.streak : 1;

      await supabase
        .from('leaderboard')
        .update({
          total_score: existingLb.total_score + score,
          streak: newStreak,
          last_played_date: todayStr,
          name: displayName,
          display_name: displayName,
          kyn_username: kynUsername,
          avatar_id: existingLb.avatar_id ?? avatarId,
        })
        .eq('phone_number', phoneNumber)
        .eq('month', month);

      setResult({
        isCorrect, score,
        totalScore: existingLb.total_score + score,
        streak: newStreak,
        correctAnswer: question.correct_answer,
        userAnswer: answer,
        question,
      });
    } else {
      await supabase.from('leaderboard').insert({
        phone_number: phoneNumber,
        name: displayName,
        display_name: displayName,
        kyn_username: kynUsername,
        total_score: score,
        streak: 1,
        last_played_date: todayStr,
        month,
        avatar_id: avatarId,
      });

      setResult({
        isCorrect, score,
        totalScore: score,
        streak: 1,
        correctAnswer: question.correct_answer,
        userAnswer: answer,
        question,
      });
    }

    setSubmitting(false);
    onSubmitted?.();
  }, [submitting, question, phoneNumber, displayName, kynUsername, startTime, onSubmitted]);

  const handleTimeout = useCallback(() => {
    submitAnswer('(timed out)');
  }, [submitAnswer]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border film-grain p-4 gap-0 max-h-[90vh] overflow-y-auto themed-scroll">
        <div>
          <div className="text-center mb-2">
            <h2 className="font-serif text-xl text-accent gold-glow tracking-wide">Today's Puzzle</h2>
            <OrnamentalDivider className="my-1.5" />
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-12 font-serif">Loading…</p>
          ) : result ? (
            (() => {
              const q = result.question;
              const isMcq = q.question_type === 'mcq';
              const optText = (letter: string) => {
                const k = `option_${letter.toLowerCase()}` as keyof Question;
                return (q[k] as string) ?? '';
              };
              const correctNormR = (result.correctAnswer ?? '').toLowerCase().trim();
              const correctLetter = isMcq
                ? (['A','B','C','D'].find(l => optText(l).toLowerCase().trim() === correctNormR) ?? '')
                : '';
              const fmt = (ans: string) => {
                if (!ans) return '—';
                if (ans === '(timed out)') return '(timed out)';
                if (isMcq) {
                  // ans may be a letter (user) or option text (correct_answer stored as text)
                  const L = ans.toUpperCase().trim();
                  if (['A','B','C','D'].includes(L) && optText(L)) return `${L}. ${optText(L)}`;
                  const matched = ['A','B','C','D'].find(l => optText(l).toLowerCase().trim() === ans.toLowerCase().trim());
                  if (matched) return `${matched}. ${optText(matched)}`;
                  return ans;
                }
                return ans;
              };
              return (
                <div className="text-center">
                  <div className="text-5xl mb-2">{result.isCorrect ? '🎉' : '😔'}</div>
                  <h3 className="font-serif text-2xl mb-3 text-accent">
                    {result.isCorrect ? 'Correct!' : 'Wrong!'}
                  </h3>

                  <div className="text-left bg-background/40 border border-border/60 rounded-lg p-3 mb-3 space-y-2">
                    {q.image_url && (
                      <div className="flex max-h-[120px] w-full items-center justify-center overflow-hidden rounded-md border border-border/60 bg-secondary/30">
                        <img src={q.image_url} alt="Illayaraja music riddle illustration" className="h-auto max-h-[120px] w-auto max-w-full object-contain" />
                      </div>
                    )}
                    <p className="font-serif text-sm text-foreground leading-snug">{q.question_text}</p>
                    <div className="flex justify-start">
                      <ReadAloudButton text={q.question_text} cacheKey={`recap-${q.id}`} />
                    </div>
                    <div className="pt-1 border-t border-border/40 space-y-1.5 text-xs">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0 w-24">Correct answer</span>
                        <span className="text-green-400 font-serif">{fmt(result.correctAnswer)}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground shrink-0 w-24">Your answer</span>
                        <span className={`font-serif ${result.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                          {fmt(result.userAnswer)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <OrnamentalDivider />
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-2xl font-serif text-accent">+{result.score}</p>
                      <p className="text-xs text-muted-foreground">Points</p>
                    </div>
                    <div>
                      <p className="text-2xl font-serif text-foreground">{result.totalScore}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-serif text-foreground">{result.streak} 🔥</p>
                      <p className="text-xs text-muted-foreground">Streak</p>
                    </div>
                  </div>
                  <Button onClick={() => onOpenChange(false)} className="w-full mt-6 bg-accent text-accent-foreground hover:bg-accent/90 font-serif">
                    Back to Leaderboard
                  </Button>
                </div>
              );
            })()
          ) : !question ? (
            <div className="text-center py-8">
              <h3 className="font-serif text-xl text-accent mb-2">No Puzzle Available</h3>
              <p className="text-muted-foreground text-sm mb-4">All questions have been played. Check back soon!</p>
              <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
            </div>
          ) : (
            <>
              <FilmStripTimer key={question.id} duration={45} onExpire={handleTimeout} isRunning={timerRunning} />
              <div className="mt-3">
                {question.image_url && (
                  <div className="mb-3 flex max-h-[180px] min-h-24 w-full items-center justify-center overflow-hidden rounded-md border border-border/70 bg-secondary/30 shadow-sm sm:max-h-[220px]">
                    <img
                      src={question.image_url}
                      alt="Illayaraja music riddle illustration"
                      className="h-auto max-h-[180px] w-auto max-w-full object-contain sm:max-h-[220px]"
                    />
                  </div>
                )}
                <h3 className="font-serif text-base text-foreground leading-snug mb-2 text-center">
                  {question.question_text}
                </h3>
                <div className="mb-3 flex justify-center">
                  <ReadAloudButton text={question.question_text} cacheKey={question.id} />
                </div>

                {question.question_type === 'mcq' ? (
                  <div className="space-y-1.5">
                    {(['A', 'B', 'C', 'D'] as const).map(opt => {
                      const text = question[`option_${opt.toLowerCase()}` as keyof Question] as string;
                      if (!text) return null;
                      const answered = !!selectedAnswer;
                      const ca = question.correct_answer.toLowerCase().trim();
                      const isCorrectOpt = ca === opt.toLowerCase() || ca === (text ?? '').toLowerCase().trim();
                      const isSelected = selectedAnswer === opt;
                      let stateClass = 'border-border/60 hover:border-accent/60 hover:bg-accent/5';
                      if (answered && isCorrectOpt) {
                        stateClass = 'border-green-500 bg-green-500/15 text-green-400';
                      } else if (answered && isSelected && !isCorrectOpt) {
                        stateClass = 'border-red-500 bg-red-500/15 text-red-400';
                      } else if (isSelected) {
                        stateClass = 'border-accent bg-accent/10';
                      }
                      return (
                        <button
                          key={opt}
                          onClick={() => { setSelectedAnswer(opt); submitAnswer(opt); }}
                          disabled={submitting || answered}
                          className={`w-full text-left px-3 py-2.5 rounded-md border text-sm transition-all ${stateClass} disabled:opacity-90 flex items-center gap-2.5`}
                        >
                          <span className="text-accent font-serif text-base w-5 shrink-0">{opt}.</span>
                          <span className="text-foreground">{text}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      value={textAnswer}
                      onChange={e => setTextAnswer(e.target.value)}
                      placeholder="Type your answer…"
                      className="bg-background"
                      onKeyDown={e => { if (e.key === 'Enter' && textAnswer.length > 0) submitAnswer(textAnswer); }}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Case-insensitive — minor typos are accepted.
                    </p>
                    <Button
                      onClick={() => submitAnswer(textAnswer)}
                      disabled={textAnswer.length === 0 || submitting}
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-serif"
                    >
                      Submit Answer
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
