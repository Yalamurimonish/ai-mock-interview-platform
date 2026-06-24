import {
  useGetInterviewAnalysis,
  useGetInterview,
  getGetInterviewAnalysisQueryKey,
  getGetInterviewQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, ArrowLeft, Target, Video, Eye, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";
import type { VideoMetrics } from "@/hooks/use-webcam";

const VIDEO_METRICS_KEY = (id: number) => `video-metrics-${id}`;

function getVideoMetrics(interviewId: number): VideoMetrics | null {
  try {
    const raw = localStorage.getItem(VIDEO_METRICS_KEY(interviewId));
    return raw ? (JSON.parse(raw) as VideoMetrics) : null;
  } catch {
    return null;
  }
}

function scoreLabel(pct: number) {
  if (pct >= 85) return { label: "Excellent", color: "text-emerald-500" };
  if (pct >= 70) return { label: "Good", color: "text-blue-500" };
  if (pct >= 50) return { label: "Fair", color: "text-yellow-500" };
  return { label: "Needs work", color: "text-red-500" };
}

export default function InterviewAnalysis() {
  const { id } = useParams();
  const interviewId = parseInt(id || "0", 10);

  const { data: interview, isLoading: isLoadingInterview } = useGetInterview(interviewId, {
    query: { enabled: !!interviewId, queryKey: getGetInterviewQueryKey(interviewId) },
  });

  const { data: analysis, isLoading: isLoadingAnalysis } = useGetInterviewAnalysis(interviewId, {
    query: { enabled: !!interviewId, queryKey: getGetInterviewAnalysisQueryKey(interviewId) },
  });

  const videoMetrics = useMemo(() => getVideoMetrics(interviewId), [interviewId]);

  if (isLoadingInterview || isLoadingAnalysis) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48 md:col-span-2" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!interview || !analysis) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Analysis not available.</p>
        <Button asChild>
          <Link href="/interviews">Back to Interviews</Link>
        </Button>
      </div>
    );
  }

  const overallScore = analysis.overallScore;
  const scoreColor =
    overallScore >= 80 ? "text-emerald-500" : overallScore >= 60 ? "text-yellow-500" : "text-destructive";

  const durationMin = interview.durationMinutes ?? Math.round((videoMetrics?.durationMs ?? 0) / 60000);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/interviews">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Interview Results</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground text-sm truncate">{interview.title}</p>
            <Badge variant="outline" className="text-xs capitalize shrink-0">
              {interview.type.replace("_", " ")} · {interview.difficulty}
            </Badge>
          </div>
        </div>
        {durationMin > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
            <Clock className="w-4 h-4" />
            {durationMin}m
          </div>
        )}
      </div>

      {/* Score + summary row */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 flex flex-col justify-center items-center p-6 text-center border-primary/20">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-sm text-muted-foreground font-normal uppercase tracking-wide">
              Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className={`text-7xl font-bold tracking-tighter tabular-nums ${scoreColor}`}>
              {Math.round(overallScore)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">out of 100</div>
            <Progress value={overallScore} className="mt-4 h-1.5" />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{analysis.summary}</p>
          </CardContent>
        </Card>
      </div>

      {/* Strengths + improvements */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-base">
              <CheckCircle2 className="w-5 h-5" /> Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span className="text-sm">{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-base">
              <AlertTriangle className="w-5 h-5" /> Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.improvements.map((im, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span className="text-sm">{im}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* AI Feedback Scores */}
      {(interview.communicationScore || interview.technicalScore || interview.confidenceScore) && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" /> AI Feedback Scores
            </CardTitle>
            <CardDescription>Performance evaluation across key interview dimensions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {interview.communicationScore !== null && (
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">Communication</div>
                  <div className={`text-3xl font-bold tabular-nums tracking-tight ${
                    interview.communicationScore >= 80 ? "text-emerald-500" : 
                    interview.communicationScore >= 60 ? "text-blue-500" : 
                    interview.communicationScore >= 40 ? "text-yellow-500" : "text-red-500"
                  }`}>
                    {Math.round(interview.communicationScore)}
                  </div>
                  <Progress value={interview.communicationScore} className="h-1.5" />
                </div>
              )}
              {interview.technicalScore !== null && (
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">Technical</div>
                  <div className={`text-3xl font-bold tabular-nums tracking-tight ${
                    interview.technicalScore >= 80 ? "text-emerald-500" : 
                    interview.technicalScore >= 60 ? "text-blue-500" : 
                    interview.technicalScore >= 40 ? "text-yellow-500" : "text-red-500"
                  }`}>
                    {Math.round(interview.technicalScore)}
                  </div>
                  <Progress value={interview.technicalScore} className="h-1.5" />
                </div>
              )}
              {interview.confidenceScore !== null && (
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">Confidence</div>
                  <div className={`text-3xl font-bold tabular-nums tracking-tight ${
                    interview.confidenceScore >= 80 ? "text-emerald-500" : 
                    interview.confidenceScore >= 60 ? "text-blue-500" : 
                    interview.confidenceScore >= 40 ? "text-yellow-500" : "text-red-500"
                  }`}>
                    {Math.round(interview.confidenceScore)}
                  </div>
                  <Progress value={interview.confidenceScore} className="h-1.5" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Improvement Tips */}
      {interview.improvementTips && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <AlertTriangle className="w-5 h-5" /> AI Improvement Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{interview.improvementTips}</p>
          </CardContent>
        </Card>
      )}

      {/* Skill breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" /> Skill Breakdown
          </CardTitle>
          <CardDescription>Detailed scoring across evaluated competencies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {analysis.skillScores.map((skill) => {
              const pct = (skill.score / skill.maxScore) * 100;
              const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
              return (
                <div key={skill.skill} className="space-y-1.5">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{skill.skill}</span>
                    <span className="tabular-nums">
                      {Math.round(skill.score)}<span className="text-muted-foreground font-normal"> / {skill.maxScore}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Video analysis section */}
      {videoMetrics && (
        <Card className="border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-500" /> Video Analysis
            </CardTitle>
            <CardDescription>
              Camera tracking data recorded during your interview
              {!videoMetrics.facePresentPct && !videoMetrics.eyeContactPct
                ? " — face detection not available in this browser"
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {/* Face presence */}
              <VideoMetricCard
                icon={<Video className="w-4 h-4" />}
                title="Face Visible"
                value={videoMetrics.facePresentPct > 0 ? `${videoMetrics.facePresentPct}%` : "N/A"}
                description={
                  videoMetrics.facePresentPct > 0
                    ? scoreLabel(videoMetrics.facePresentPct).label
                    : "Face detection unavailable"
                }
                colorClass={videoMetrics.facePresentPct > 0 ? scoreLabel(videoMetrics.facePresentPct).color : "text-muted-foreground"}
                progress={videoMetrics.facePresentPct}
                showProgress={videoMetrics.facePresentPct > 0}
              />

              {/* Eye contact */}
              <VideoMetricCard
                icon={<Eye className="w-4 h-4" />}
                title="Eye Contact"
                value={videoMetrics.eyeContactPct > 0 ? `${videoMetrics.eyeContactPct}%` : "N/A"}
                description={
                  videoMetrics.eyeContactPct > 0
                    ? scoreLabel(videoMetrics.eyeContactPct).label
                    : "Face detection unavailable"
                }
                colorClass={videoMetrics.eyeContactPct > 0 ? scoreLabel(videoMetrics.eyeContactPct).color : "text-muted-foreground"}
                progress={videoMetrics.eyeContactPct}
                showProgress={videoMetrics.eyeContactPct > 0}
              />

              {/* Look aways */}
              <VideoMetricCard
                icon={<AlertTriangle className="w-4 h-4" />}
                title="Look Aways"
                value={videoMetrics.facePresentPct > 0 ? String(videoMetrics.lookAwayCount) : "N/A"}
                description={
                  videoMetrics.facePresentPct > 0
                    ? videoMetrics.lookAwayCount === 0
                      ? "No distractions"
                      : videoMetrics.lookAwayCount <= 3
                      ? "Minimal distractions"
                      : "Several distractions"
                    : "Face detection unavailable"
                }
                colorClass={
                  videoMetrics.facePresentPct > 0
                    ? videoMetrics.lookAwayCount === 0
                      ? "text-emerald-500"
                      : videoMetrics.lookAwayCount <= 3
                      ? "text-yellow-500"
                      : "text-red-500"
                    : "text-muted-foreground"
                }
                showProgress={false}
              />
            </div>

            {videoMetrics.durationMs > 0 && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Camera was active for {Math.round(videoMetrics.durationMs / 60000)}m {Math.round((videoMetrics.durationMs % 60000) / 1000)}s
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed feedback */}
      {analysis.detailedFeedback && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {analysis.detailedFeedback}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <div className="flex gap-3 pb-8">
        <Button variant="outline" asChild className="flex-1 sm:flex-none">
          <Link href="/interviews">View All Interviews</Link>
        </Button>
        <Button asChild className="flex-1 sm:flex-none">
          <Link href="/interviews/new">Start New Interview</Link>
        </Button>
      </div>
    </div>
  );
}

function VideoMetricCard({
  icon,
  title,
  value,
  description,
  colorClass,
  progress,
  showProgress,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  colorClass: string;
  progress?: number;
  showProgress: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className={`text-3xl font-bold tabular-nums tracking-tight ${colorClass}`}>{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {showProgress && progress !== undefined && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              progress >= 80 ? "bg-emerald-500" : progress >= 60 ? "bg-blue-500" : progress >= 40 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
