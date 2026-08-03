import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Sparkles, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FilmStripTimer } from './FilmStripTimer';
import { OrnamentalDivider } from './OrnamentalDivider';
import { ReadAloudButton } from './ReadAloudButton';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { supabase, getCurrentMonth } from '@/lib/supabase';
import { getRandomAvatarId } from '@/lib/avatars';
import { COMING_SOON_MODE } from '@/lib/relaunch';

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
  const TOTAL_DURATION = 75;
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
    if (COMING_SOON_MODE) {
      setQuestion(null);
      setLoading(false);
      return;
    }
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
      // @ts-ignore — RPC name not in generated types yet
      const { data: existing } = await supabase.rpc('get_submission_result', {
        p_phone: phoneNumber!,
        p_question_id: live.id,
      }).maybeSingle();

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
          correctAnswer: existing.correct_answer,
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

    const timeTaken = Math.max(0, TOTAL_DURATION - remainingSeconds);

    // Ensure user has an avatar (first-time players). Never sets score/streak.
    const { data: existingAvatarRow } = await supabase
      .from('leaderboard')
      .select('avatar_id')
      .eq('phone_number', phoneNumber)
      .not('avatar_id', 'is', null)
      .limit(1)
      .maybeSingle();
    if (!existingAvatarRow?.avatar_id) {
      // @ts-ignore — RPC not in generated types yet
      await supabase.rpc('update_leaderboard_identity', {
        p_phone: phoneNumber,
        p_display_name: displayName,
        p_kyn_username: kynUsername,
        p_avatar_id: getRandomAvatarId(),
      });
    }

    // Grading happens server-side now — the client never has (or needs) the
    // correct answer before this call returns.
    // @ts-ignore — RPC name not in generated types yet
    const { data: submitRows, error: submitError } = await supabase.rpc('submit_answer', {
      p_phone: phoneNumber,
      p_display_name: displayName,
      p_kyn_username: kynUsername,
      p_question_id: question.id,
      p_answer_given: answer,
      p_time_taken_seconds: Math.round(timeTaken * 10) / 10,
    });
    if (submitError) {
      console.error('submit_answer failed', submitError);
      alert(`Could not save your answer: ${submitError.message}. Please try again.`);
      setSubmitting(false);
      return;
    }
    const submitResult = Array.isArray(submitRows) ? submitRows[0] : submitRows;
    const isCorrect: boolean = submitResult?.is_correct ?? false;
    const score: number = submitResult?.score ?? 0;
    const correctAnswer: string = submitResult?.correct_answer ?? question.correct_answer;

    // Server-side trigger recomputes leaderboard (score/streak/last_played) from submissions.
    // Read the fresh values back so the result screen matches what other users will see.
    const { data: lbRow } = await supabase
      .from('leaderboard')
      .select('total_score, streak')
      .eq('phone_number', phoneNumber)
      .eq('month', month)
      .maybeSingle();

    setResult({
      isCorrect,
      score,
      totalScore: lbRow?.total_score ?? score,
      streak: lbRow?.streak ?? 1,
      correctAnswer,
      userAnswer: answer,
      question,
    });

    setSubmitting(false);
    onSubmitted?.();
  }, [submitting, question, phoneNumber, displayName, kynUsername, remainingSeconds, onSubmitted]);


  const handleTimeout = useCallback(() => {
    submitAnswer('(timed out)');
  }, [submitAnswer]);

  // Auto-submit as timed out when countdown hits zero (only while modal is open + visible).
  useEffect(() => {
    if (open && tabVisible && question && !result && !submitting && remainingSeconds <= 0) {
      handleTimeout();
    }
  }, [open, tabVisible, question, result, submitting, remainingSeconds, handleTimeout]);

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
            <div className="text-center py-6 px-1">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
                <Sparkles size={28} className="text-accent animate-pulse" />
              </div>
              <h3 className="font-serif text-2xl text-accent gold-glow mb-2">Something New Is Coming</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We're giving Paattu Puzzle a fresh new look — with new rewards and new ways to play.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1.5 mb-5">
                Stay tuned. We'll be back very soon.
              </p>

              <OrnamentalDivider className="mb-5" />

              <p className="text-xs text-muted-foreground mb-3">
                Got an idea for a reward, feature, or question? We'd love to hear it.
              </p>
              <a
                href="https://wa.me/918220850225?text=Hey!%20I%20have%20a%20suggestion%20for%20Paattu%20Puzzle%3A%20"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground font-serif text-sm px-5 py-2.5 shadow-lg shadow-accent/20 animate-cta-pulse hover:scale-105 transition-transform"
              >
                <MessageCircle size={16} />
                Share Your Suggestion
              </a>

              <div className="mt-6">
                <Button onClick={() => onOpenChange(false)} variant="outline" size="sm">Close</Button>
              </div>
            </div>
          ) : (
            <>
              <FilmStripTimer key={question.id} duration={TOTAL_DURATION} timeLeft={remainingSeconds} />
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
                      // Grading now happens server-side (submit_answer RPC), so the
                      // correct option is no longer known client-side at this point —
                      // it only appears once `result` comes back and the recap screen
                      // renders. Just reflect the pending selection here.
                      const isSelected = selectedAnswer === opt;
                      const stateClass = isSelected
                        ? (submitting ? 'border-accent bg-accent/10 opacity-70' : 'border-accent bg-accent/10')
                        : 'border-border/60 hover:border-accent/60 hover:bg-accent/5';
                      return (
                        <button
                          key={opt}
                          onClick={() => { setSelectedAnswer(opt); submitAnswer(opt); }}
                          disabled={submitting || !!selectedAnswer}
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
