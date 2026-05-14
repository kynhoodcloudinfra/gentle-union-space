import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FilmStripTimer } from './FilmStripTimer';
import { OrnamentalDivider } from './OrnamentalDivider';
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
  const [timerRunning, setTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !phoneNumber) return;
    loadQuestion();
    return () => {
      setQuestion(null);
      setResult(null);
      setSelectedAnswer('');
      setTextAnswer('');
      setTimerRunning(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phoneNumber]);

  async function loadQuestion() {
    setLoading(true);
    try {
      // Atomically rotate (expire stale + activate next if needed) and return current live question
      // @ts-ignore — RPC name not in generated types yet
      const { data: liveRows, error: rpcErr } = await supabase.rpc('rotate_active_question');
      if (rpcErr) console.error('rotate error', rpcErr);

      const live = Array.isArray(liveRows) && liveRows.length > 0 ? liveRows[0] : null;

      if (!live) {
        setQuestion(null);
        setLoading(false);
        return;
      }

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
        setResult({
          isCorrect: existing.is_correct,
          score: existing.is_correct ? (time <= 10 ? 150 : time <= 20 ? 125 : 100) : 0,
          totalScore: lb?.total_score ?? 0,
          streak: lb?.streak ?? 0,
          // @ts-ignore — joined relation
          correctAnswer: existing.questions?.correct_answer ?? '',
        });
        setLoading(false);
        return;
      }

      setQuestion(live as Question);
      setTimerRunning(true);
      setStartTime(Date.now());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const submitAnswer = useCallback(async (answer: string) => {
    if (submitting || !question || !phoneNumber || !displayName) return;
    setSubmitting(true);
    setTimerRunning(false);

    const month = question.month || getCurrentMonth();
    const dayNumber = question.day_number;

    const timeTaken = (Date.now() - startTime) / 1000;
    // MCQ: case-insensitive (just A/B/C/D). Text: strict — case + space sensitive.
    const isCorrect = question.question_type === 'mcq'
      ? answer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()
      : answer === question.correct_answer;
    const score = isCorrect ? (timeTaken <= 10 ? 150 : timeTaken <= 20 ? 125 : 100) : 0;

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
      <DialogContent className="max-w-md bg-card border-border film-grain p-0 gap-0 overflow-hidden">
        <div className="p-6">
          <div className="text-center mb-3">
            <h2 className="font-serif text-2xl text-accent gold-glow">Today's Riddle</h2>
            <OrnamentalDivider className="my-2" />
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-12 font-serif">Loading…</p>
          ) : result ? (
            <div className="text-center">
              <div className="text-5xl mb-3">{result.isCorrect ? '🎉' : '😔'}</div>
              <h3 className="font-serif text-2xl mb-2 text-accent">
                {result.isCorrect ? 'Correct!' : 'Wrong!'}
              </h3>
              {!result.isCorrect && (
                <p className="text-muted-foreground text-sm mb-3">
                  Answer: <span className="text-accent">{result.correctAnswer}</span>
                </p>
              )}
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
          ) : !question ? (
            <div className="text-center py-8">
              <h3 className="font-serif text-xl text-accent mb-2">No Riddle Available</h3>
              <p className="text-muted-foreground text-sm mb-4">All questions have been played. Check back soon!</p>
              <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
            </div>
          ) : (
            <>
              <FilmStripTimer duration={30} onExpire={handleTimeout} isRunning={timerRunning} />
              <div className="mt-5">
                <h3 className="font-serif text-lg text-foreground leading-relaxed mb-5">
                  {question.question_text}
                </h3>

                {question.question_type === 'mcq' ? (
                  <div className="space-y-2.5">
                    {(['A', 'B', 'C', 'D'] as const).map(opt => {
                      const text = question[`option_${opt.toLowerCase()}` as keyof Question] as string;
                      if (!text) return null;
                      const answered = !!selectedAnswer;
                      const isCorrectOpt = question.correct_answer.toLowerCase().trim() === opt.toLowerCase();
                      const isSelected = selectedAnswer === opt;
                      let stateClass = 'border-border hover:border-accent/50 hover:bg-secondary';
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
                          className={`w-full text-left p-3.5 rounded-lg border transition-all ${stateClass} disabled:opacity-90`}
                        >
                          <span className="text-accent font-serif mr-3">{opt}.</span>
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
                      placeholder="Type your answer (case & spaces matter)…"
                      className="bg-background"
                      onKeyDown={e => { if (e.key === 'Enter' && textAnswer.length > 0) submitAnswer(textAnswer); }}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Answers are checked exactly — capitalization and spaces must match.
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
