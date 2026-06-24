import {
  useGetInterview,
  useListInterviewQuestions,
  useStartInterview,
  useSubmitAnswer,
  useCompleteInterview,
  getGetInterviewQueryKey,
  getListInterviewQuestionsQueryKey,
} from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  CheckCircle2,
  PlayCircle,
  Loader2,
  Lightbulb,
  Camera,
  Clock,
  Mic,
  MicOff,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useWebcam } from "@/hooks/use-webcam";
import { WebcamPanel } from "@/components/webcam-panel";
import { useSpeech } from "@/hooks/use-speech";

const VIDEO_METRICS_KEY = (id: number) => `video-metrics-${id}`;

export default function InterviewLive() {
  const { id } = useParams();
  const interviewId = parseInt(id || "0", 10);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: interview, isLoading: isLoadingInterview } = useGetInterview(interviewId, {
    query: { enabled: !!interviewId, queryKey: getGetInterviewQueryKey(interviewId) },
  });

  const { data: questions, isLoading: isLoadingQuestions } = useListInterviewQuestions(interviewId, {
    query: { enabled: !!interviewId, queryKey: getListInterviewQuestionsQueryKey(interviewId) },
  });

  const startInterview = useStartInterview();
  const submitAnswer = useSubmitAnswer();
  const completeInterview = useCompleteInterview();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialPositionSetRef = useRef(false);

  // Webcam
  const webcam = useWebcam();
  const [liveMetrics, setLiveMetrics] = useState({ facePresentPct: 0, eyeContactPct: 0, lookAwayCount: 0 });

  // Speech-to-text
  const speech = useSpeech((finalText) => {
    setAnswerText((prev) => prev + finalText);
  });

  // Start camera as soon as page loads
  useEffect(() => {
    webcam.start();
    return () => webcam.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll live metrics every 2s
  useEffect(() => {
    if (!webcam.isActive) return;
    const id = setInterval(() => {
      const m = webcam.getMetrics();
      setLiveMetrics({
        facePresentPct: m.facePresentPct,
        eyeContactPct: m.eyeContactPct,
        lookAwayCount: m.lookAwayCount,
      });
    }, 2000);
    return () => clearInterval(id);
  }, [webcam.isActive, webcam.getMetrics]);

  // Timer during in-progress
  useEffect(() => {
    if (interview?.status === "in_progress") {
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [interview?.status]);

  // Resume to first unanswered question — only on initial questions load, not after every refetch
  useEffect(() => {
    if (questions && questions.length > 0 && !initialPositionSetRef.current) {
      initialPositionSetRef.current = true;
      const first = questions.findIndex((q) => !q.isAnswered);
      setCurrentQuestionIndex(first === -1 ? questions.length - 1 : first);
    }
  }, [questions]);

  // Stop listening and clear draft when question changes
  useEffect(() => {
    if (speech.isListening) speech.stopListening();
    setAnswerText("");
    setShowHint(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex]);

  const handleStart = () => {
    startInterview.mutate({ id: interviewId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInterviewQueryKey(interviewId) });
        queryClient.invalidateQueries({ queryKey: getListInterviewQuestionsQueryKey(interviewId) });
      },
    });
  };

  const handleComplete = () => {
    // Save video metrics to localStorage before navigating
    const metrics = webcam.getMetrics();
    localStorage.setItem(VIDEO_METRICS_KEY(interviewId), JSON.stringify(metrics));
    webcam.stop();

    completeInterview.mutate({ id: interviewId }, {
      onSuccess: () => setLocation(`/interviews/${interviewId}/analysis`),
    });
  };

  const handleSubmitAnswer = () => {
    if (!currentQuestion || !answerText.trim()) return;
    if (speech.isListening) speech.stopListening();

    submitAnswer.mutate(
      { id: interviewId, data: { questionId: currentQuestion.id, answer: answerText } },
      {
        onSuccess: (result) => {
          toast({ title: "Answer submitted", description: `Score: ${result.score}/100` });
          queryClient.invalidateQueries({ queryKey: getListInterviewQuestionsQueryKey(interviewId) });
          setAnswerText("");
          setShowHint(false);

          const isLast = currentQuestionIndex === (questions?.length || 0) - 1;
          if (isLast) {
            handleComplete();
          } else {
            setCurrentQuestionIndex((prev) => prev + 1);
          }
        },
        onError: () => {
          toast({ title: "Submission failed", description: "Failed to submit answer.", variant: "destructive" });
        },
      }
    );
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const currentQuestion = questions?.[currentQuestionIndex];
  const answeredCount = questions?.filter((q) => q.isAnswered).length ?? 0;
  const progress = questions ? (answeredCount / questions.length) * 100 : 0;

  if (isLoadingInterview || isLoadingQuestions) {
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!interview || !questions) {
    return <div className="p-8 text-center text-muted-foreground">Interview not found.</div>;
  }

  // ── PENDING: Pre-start screen with camera preview ──────────────────────────
  if (interview.status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-3xl grid md:grid-cols-2 gap-6 items-center">
          {/* Left: info + start */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PlayCircle className="w-6 h-6 text-primary" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wide">Ready to begin</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">{interview.title}</h1>
              <p className="text-muted-foreground text-sm">
                {interview.questionCount} {interview.difficulty} {interview.type.replace("_", " ")} questions
              </p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Camera className="w-4 h-4 text-primary flex-shrink-0" /> Your camera will be active throughout the interview</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Face presence and eye contact will be tracked</p>
              <p className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0" /> Answer each question thoughtfully — take your time</p>
            </div>

            <Button
              size="lg"
              className="h-12 text-base w-full"
              onClick={handleStart}
              disabled={startInterview.isPending}
              data-testid="button-begin-interview"
            >
              {startInterview.isPending ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Questions...</>
              ) : (
                "Begin Interview"
              )}
            </Button>

            {webcam.permissionDenied && (
              <Alert variant="destructive" className="text-sm">
                <AlertTitle>Camera access denied</AlertTitle>
                <AlertDescription>
                  Enable camera permissions in your browser settings. You can still take the interview without camera tracking.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right: camera preview */}
          <div className="flex flex-col gap-3">
            <WebcamPanel
              videoRef={webcam.videoRef}
              isActive={webcam.isActive}
              permissionDenied={webcam.permissionDenied}
              permissionRequested={webcam.permissionRequested}
              faceDetected={webcam.faceDetected}
              eyeContact={webcam.eyeContact}
              hasFaceDetector={webcam.hasFaceDetector}
              compact
            />
            {webcam.isActive && (
              <p className="text-xs text-center text-muted-foreground">
                Camera is ready — make sure your face is fully visible
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── COMPLETED ──────────────────────────────────────────────────────────────
  if (interview.status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">Interview Completed</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Button
              size="lg"
              className="w-full h-12"
              onClick={() => setLocation(`/interviews/${interviewId}/analysis`)}
            >
              View Results
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── IN PROGRESS: 2-column layout ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-semibold text-sm truncate">{interview.title}</h1>
            <Badge variant="outline" className="text-xs shrink-0 capitalize">
              {interview.type.replace("_", " ")} · {interview.difficulty}
            </Badge>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="tabular-nums font-mono text-xs">{formatTime(elapsedSeconds)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{currentQuestionIndex + 1}</span>
              <span> / {questions.length}</span>
            </div>
          </div>
        </div>
        <Progress value={progress} className="h-0.5 rounded-none" />
      </div>

      {/* Main 2-col layout */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6 items-start">

        {/* ── Left: question + answer ── */}
        <div className="flex-1 min-w-0">
          {currentQuestion && (
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wide">
                    {currentQuestion.type} question
                  </Badge>
                  {currentQuestion.hint && !showHint && !currentQuestion.isAnswered && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => setShowHint(true)}
                    >
                      <Lightbulb className="w-3.5 h-3.5 mr-1.5" /> Hint
                    </Button>
                  )}
                </div>
                <CardTitle className="text-xl leading-relaxed font-medium">
                  {currentQuestion.text}
                </CardTitle>

                {showHint && currentQuestion.hint && (
                  <Alert className="mt-4 bg-primary/5 border-primary/20">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <AlertTitle className="text-primary text-sm font-medium">Hint</AlertTitle>
                    <AlertDescription className="text-muted-foreground text-sm">
                      {currentQuestion.hint}
                    </AlertDescription>
                  </Alert>
                )}
              </CardHeader>

              <CardContent className="p-0">
                {currentQuestion.isAnswered ? (
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Answer</p>
                      <div className="p-4 rounded-lg bg-muted/40 border text-sm whitespace-pre-wrap leading-relaxed">
                        {currentQuestion.userAnswer}
                      </div>
                    </div>
                    <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-primary">AI Feedback</p>
                        <span className="text-lg font-bold tabular-nums">{currentQuestion.score}<span className="text-muted-foreground text-sm font-normal">/100</span></span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{currentQuestion.feedback}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <Textarea
                      placeholder={
                        speech.isListening
                          ? "Listening… speak your answer now."
                          : "Type your answer, or click the mic to speak."
                      }
                      className="min-h-[220px] border-0 focus-visible:ring-0 rounded-none p-5 text-base resize-none"
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      data-testid="textarea-answer"
                    />

                    {/* Interim transcript preview */}
                    {speech.interimTranscript && (
                      <div className="px-5 pb-2">
                        <p className="text-sm text-muted-foreground italic border-l-2 border-primary/40 pl-3 leading-relaxed">
                          {speech.interimTranscript}
                          <span className="inline-block w-0.5 h-4 bg-primary ml-1 animate-pulse align-middle" />
                        </p>
                      </div>
                    )}

                    {/* Mic controls bar */}
                    <div className={`flex items-center gap-3 px-5 py-3 border-t ${speech.isListening ? "bg-red-500/5 border-red-500/20" : "bg-muted/20"}`}>
                      {speech.isSupported ? (
                        <>
                          <button
                            type="button"
                            onClick={() => speech.isListening ? speech.stopListening() : speech.startListening()}
                            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                              speech.isListening
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                            }`}
                            data-testid="button-mic-toggle"
                          >
                            {speech.isListening ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                <MicOff className="w-3.5 h-3.5" />
                                Stop recording
                              </>
                            ) : (
                              <>
                                <Mic className="w-3.5 h-3.5" />
                                Speak answer
                              </>
                            )}
                          </button>
                          {speech.isListening && (
                            <span className="text-xs text-red-500 font-medium">
                              Recording — speak clearly
                            </span>
                          )}
                          {!speech.isListening && !answerText && (
                            <span className="text-xs text-muted-foreground">
                              Or type your answer above
                            </span>
                          )}
                          {answerText && !speech.isListening && (
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                              onClick={() => setAnswerText("")}
                            >
                              Clear
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <MicOff className="w-3.5 h-3.5" />
                          Speech-to-text not available in this browser
                        </span>
                      )}
                    </div>

                    {/* Speech permission error */}
                    {speech.error && (
                      <div className="px-5 pb-3">
                        <Alert variant="destructive" className="py-2">
                          <AlertDescription className="text-xs">{speech.error}</AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t p-4 flex justify-between bg-muted/10">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex((p) => Math.max(0, p - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>

                {!currentQuestion.isAnswered ? (
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!answerText.trim() || submitAnswer.isPending}
                    className="px-8"
                    data-testid="button-submit-answer"
                  >
                    {submitAnswer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Answer
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (currentQuestionIndex < questions.length - 1) {
                        setCurrentQuestionIndex((p) => p + 1);
                      } else {
                        handleComplete();
                      }
                    }}
                    disabled={completeInterview.isPending}
                    className="px-8"
                    data-testid="button-next"
                  >
                    {completeInterview.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {currentQuestionIndex < questions.length - 1 ? (
                      <>Next Question <ChevronRight className="ml-1.5 w-4 h-4" /></>
                    ) : (
                      <>Finish Interview <CheckCircle2 className="ml-1.5 w-4 h-4" /></>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}

          {/* Question nav dots */}
          {questions.length > 1 && (
            <div className="flex gap-1.5 justify-center mt-4 flex-wrap">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(i)}
                  className={`w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                    i === currentQuestionIndex
                      ? "bg-primary text-primary-foreground scale-110"
                      : q.isAnswered
                      ? "bg-emerald-500/80 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  data-testid={`button-question-nav-${i}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: sticky camera panel ── */}
        <div className="hidden md:flex flex-col gap-4 w-64 xl:w-72 shrink-0 sticky top-20">
          <WebcamPanel
            videoRef={webcam.videoRef}
            isActive={webcam.isActive}
            permissionDenied={webcam.permissionDenied}
            permissionRequested={webcam.permissionRequested}
            faceDetected={webcam.faceDetected}
            eyeContact={webcam.eyeContact}
            hasFaceDetector={webcam.hasFaceDetector}
            facePresentPct={liveMetrics.facePresentPct}
            eyeContactPct={liveMetrics.eyeContactPct}
            lookAwayCount={liveMetrics.lookAwayCount}
          />

          {/* Progress summary card */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Progress</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Answered</span>
                <span className="font-semibold">{answeredCount} / {questions.length}</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time elapsed</span>
              <span className="font-mono text-xs font-semibold">{formatTime(elapsedSeconds)}</span>
            </div>
            {answeredCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg score</span>
                <span className="font-semibold">
                  {Math.round(
                    questions.filter((q) => q.isAnswered && q.score != null).reduce((s, q) => s + (q.score ?? 0), 0) /
                    Math.max(1, questions.filter((q) => q.isAnswered).length)
                  )}/100
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
