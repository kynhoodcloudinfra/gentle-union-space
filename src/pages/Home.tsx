import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { LoginFlow } from '@/components/LoginFlow';
import { CommunityGatePopup } from '@/components/CommunityGatePopup';
import { FilmStripTimer } from '@/components/FilmStripTimer';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase, getCurrentMonth, getTodayDayNumber } from '@/lib/supabase';
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
}

interface ResultData {
  isCorrect: boolean;
  score: number;
  totalScore: number;
  streak: number;
  correctAnswer: string;
}

export default function Home() {
  const { phoneNumber, name, isIdentified, authStatus, isCommunityMember } = useUser();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const month = getCurrentMonth();
  const dayNumber = getTodayDayNumber();

  useEffect(() => {
    if (!isIdentified) return;
    loadQuestion();
  }, [isIdentified]);

  async function loadQuestion() {
    setLoading(true);
    try {
      // Check existing submission
      const { data: existing } = await supabase
        .from('submissions')
        .select('*, questions(correct_answer)')
        .eq('phone_number', phoneNumber!)
        .eq('day_number', dayNumber)
        .eq('month', month)
        .maybeSingle();

      if (existing) {
        setAlreadyAnswered(true);
        // Get leaderboard data
        const { data: lb } = await supabase
          .from('leaderboard')
          .select('total_score, streak')
          .eq('phone_number', phoneNumber!)
          .eq('month', month)
          .maybeSingle();

        setResult({
          isCorrect: existing.is_correct,
          score: existing.is_correct ? (existing.time_taken_seconds <= 10 ? 150 : existing.time_taken_seconds <= 20 ? 125 : 100) : 0,
          totalScore: lb?.total_score ?? 0,
          streak: lb?.streak ?? 0,
          correctAnswer: existing.questions?.correct_answer ?? '',
        });
        setLoading(false);
        return;
      }

      // Load today's question
      const { data: q } = await supabase
        .from('questions')
        .select('*')
        .eq('day_number', dayNumber)
        .eq('month', month)
        .maybeSingle();

      setQuestion(q);
      if (q) {
        setTimerRunning(true);
        setStartTime(Date.now());
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const submitAnswer = useCallback(async (answer: string) => {
    if (submitting || !question || !phoneNumber || !name) return;
    setSubmitting(true);
    setTimerRunning(false);

    const timeTaken = (Date.now() - startTime) / 1000;
    const isCorrect = answer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
    const score = isCorrect ? (timeTaken <= 10 ? 150 : timeTaken <= 20 ? 125 : 100) : 0;

    // Insert submission
    await supabase.from('submissions').insert({
      phone_number: phoneNumber,
      name,
      question_id: question.id,
      day_number: dayNumber,
      answer_given: answer,
      is_correct: isCorrect,
      time_taken_seconds: Math.round(timeTaken * 10) / 10,
      month,
    });

    // Check existing leaderboard entry
    const { data: existingLb } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('month', month)
      .maybeSingle();

    // Look up avatar from any previous month
    let avatarId: number | null = null;
    const { data: prevEntry } = await supabase
      .from('leaderboard')
      .select('avatar_id')
      .eq('phone_number', phoneNumber)
      .not('avatar_id', 'is', null)
      .limit(1)
      .maybeSingle();

    avatarId = prevEntry?.avatar_id ?? getRandomAvatarId();

    // Calculate streak
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
          name,
          avatar_id: existingLb.avatar_id ?? avatarId,
        })
        .eq('phone_number', phoneNumber)
        .eq('month', month);

      setResult({
        isCorrect,
        score,
        totalScore: existingLb.total_score + score,
        streak: newStreak,
        correctAnswer: question.correct_answer,
      });
    } else {
      await supabase.from('leaderboard').insert({
        phone_number: phoneNumber,
        name,
        total_score: score,
        streak: 1,
        last_played_date: todayStr,
        month,
        avatar_id: avatarId,
      });

      setResult({
        isCorrect,
        score,
        totalScore: score,
        streak: 1,
        correctAnswer: question.correct_answer,
      });
    }

    setAlreadyAnswered(true);
    setSubmitting(false);
  }, [submitting, question, phoneNumber, name, startTime, dayNumber, month]);

  const handleTimeout = useCallback(() => {
    submitAnswer('(timed out)');
  }, [submitAnswer]);

  if (authStatus === 'loading' || authStatus === 'checking_membership') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-serif">Loading...</p>
      </div>
    );
  }

  if (!isIdentified) return <LoginFlow />;

  if (isCommunityMember === false) return <CommunityGatePopup />;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <h1 className="font-serif text-3xl text-accent gold-glow">🎬 Raja Quiz</h1>
          <p className="text-muted-foreground text-sm mt-1">Day {dayNumber} • {month}</p>
          <OrnamentalDivider />
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center film-grain">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : result ? (
          /* Result Card */
          <div className="bg-card border border-border rounded-xl p-6 film-grain">
            <div className="text-center">
              <div className="text-5xl mb-3">{result.isCorrect ? '🎉' : '😔'}</div>
              <h2 className="font-serif text-2xl mb-2 text-accent">
                {result.isCorrect ? 'Correct!' : 'Wrong!'}
              </h2>
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
            </div>
            <div className="mt-6">
              <Link to={`/leaderboard?phoneNumber=${phoneNumber}&name=${encodeURIComponent(name!)}`}>
                <Button variant="outline" className="w-full">View Leaderboard</Button>
              </Link>
            </div>
          </div>
        ) : !question ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center film-grain">
            <h2 className="font-serif text-xl text-accent mb-2">No Question Today</h2>
            <p className="text-muted-foreground text-sm">Check back tomorrow for the next question!</p>
          </div>
        ) : (
          /* Quiz Card */
          <div className="bg-card border border-border rounded-xl p-6 film-grain">
            <FilmStripTimer duration={30} onExpire={handleTimeout} isRunning={timerRunning} />
            
            <div className="mt-6">
              <h2 className="font-serif text-xl text-foreground leading-relaxed mb-6">
                {question.question_text}
              </h2>

              {question.question_type === 'mcq' ? (
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const text = question[`option_${opt.toLowerCase()}` as keyof Question] as string;
                    if (!text) return null;
                    return (
                      <button
                        key={opt}
                        onClick={() => { setSelectedAnswer(opt); submitAnswer(opt); }}
                        disabled={submitting}
                        className={`w-full text-left p-4 rounded-lg border transition-all
                          ${selectedAnswer === opt
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-accent/50 hover:bg-secondary'
                          }
                          disabled:opacity-50`}
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
                    placeholder="Type your answer..."
                    className="bg-background"
                    onKeyDown={e => { if (e.key === 'Enter' && textAnswer.trim()) submitAnswer(textAnswer.trim()); }}
                  />
                  <Button
                    onClick={() => submitAnswer(textAnswer.trim())}
                    disabled={!textAnswer.trim() || submitting}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-serif"
                  >
                    Submit Answer
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-4 text-center">
          <Link to={`/leaderboard?phoneNumber=${phoneNumber}&name=${encodeURIComponent(name!)}`} className="text-accent text-sm hover:underline">
            View Leaderboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
