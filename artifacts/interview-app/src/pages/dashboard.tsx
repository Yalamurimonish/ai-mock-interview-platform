import { useGetMe, useGetUserStats, useListRecentInterviews } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Video, Target, TrendingUp, Clock, Plus, ArrowRight,
  Flame, Zap, Trophy, Brain, Sparkles, FileText, Code2,
  Mic, Users, BarChart3, AlertCircle, CheckCircle2, Star,
  ChevronUp, BookOpen, Play,
} from "lucide-react";
import { format } from "date-fns";

// ─── Mock data for new sections (replace with API calls as you build them) ───
const mockStreak = 7;
const mockXP = 2340;
const mockLevel = 8;
const mockWeeklyGoal = 5;
const mockWeeklyDone = 3;
const weeklyScores = [40, 65, 55, 80, 70, 84, 78];
const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

const mockWeakAreas = [
  { topic: "Time Complexity", score: 48 },
  { topic: "Database Design", score: 55 },
  { topic: "React Hooks", score: 62 },
];

const mockAchievements = [
  { icon: "🔥", label: "7-Day Streak", earned: true },
  { icon: "🏅", label: "10 Interviews", earned: true },
  { icon: "⭐", label: "90+ Score", earned: false },
  { icon: "🧠", label: "React Expert", earned: false },
];

const mockRecommendations = [
  { text: "Practice Dynamic Programming problems", priority: "high", tag: "DSA" },
  { text: "Review SQL indexing & normalization", priority: "medium", tag: "Database" },
  { text: "Mock 2 HR interviews this week", priority: "low", tag: "Behavioral" },
];

const quickStart = [
  { label: "Technical", icon: Code2, color: "from-blue-500 to-indigo-600", path: "/interviews/new?type=technical" },
  { label: "HR Round", icon: Users, color: "from-purple-500 to-pink-600", path: "/interviews/new?type=hr" },
  { label: "Voice", icon: Mic, color: "from-green-500 to-teal-600", path: "/interviews/new?type=voice" },
  { label: "Coding", icon: Code2, color: "from-orange-500 to-red-600", path: "/interviews/new?type=coding" },
];

// ─── Helper components ────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 w-24">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold w-6 text-right">{score}</span>
    </div>
  );
}

function MiniBar({ value, max }: { value: number; max: number }) {
  return (
    <div
      className="flex-1 rounded-t-sm bg-primary/70 hover:bg-primary transition-colors"
      style={{ height: `${(value / max) * 100}%` }}
    />
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: user } = useGetMe();
  const { data: stats, isLoading: isLoadingStats } = useGetUserStats();
  const { data: recentInterviews, isLoading: isLoadingInterviews } = useListRecentInterviews();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const maxWeekly = Math.max(...weeklyScores);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}, {user?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-muted-foreground">
            You're on a <span className="text-orange-500 font-semibold">{mockStreak}-day streak</span> — keep it up!
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/resumes">
              <FileText className="mr-2 w-4 h-4" /> Upload Resume
            </Link>
          </Button>
          <Button asChild size="lg" className="h-11">
            <Link href="/interviews/new">
              <Plus className="mr-2 w-5 h-5" /> Start Interview
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-6 translate-x-6 bg-gradient-to-br from-blue-500 to-indigo-600" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{stats?.averageScore || 0}/100</div>
            )}
            {stats?.recentImprovement ? (
              <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                <ChevronUp className="w-3 h-3" /> +{stats.recentImprovement}% this week
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Last 10 interviews</p>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-6 translate-x-6 bg-gradient-to-br from-yellow-500 to-orange-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <Trophy className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{stats?.bestScore || 0}/100</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Personal record</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-6 translate-x-6 bg-gradient-to-br from-orange-500 to-red-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Daily Streak</CardTitle>
            <Flame className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStreak} days</div>
            <p className="text-xs text-muted-foreground mt-1">Personal best: 12 days</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 -translate-y-6 translate-x-6 bg-gradient-to-br from-purple-500 to-pink-600" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">XP Points</CardTitle>
            <Zap className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockXP.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Level {mockLevel}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Start ── */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> Quick Start
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickStart.map((opt) => (
            <Link key={opt.label} href={opt.path}>
              <div className={`relative bg-gradient-to-br ${opt.color} rounded-xl p-4 text-white cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-200`}>
                <opt.icon className="w-6 h-6 mb-2 opacity-90" />
                <p className="font-semibold text-sm">{opt.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Middle Row ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Weekly Goal */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Weekly Goal
              </CardTitle>
              <Badge variant="outline">{mockWeeklyDone}/{mockWeeklyGoal}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={(mockWeeklyDone / mockWeeklyGoal) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {mockWeeklyGoal - mockWeeklyDone} more to hit your weekly goal
            </p>
            <div>
              <p className="text-xs text-muted-foreground mb-2">This week's scores</p>
              <div className="flex items-end gap-1 h-12">
                {weeklyScores.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <MiniBar value={v} max={maxWeekly} />
                    <span className="text-[10px] text-muted-foreground">{weekDays[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Interviews */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Recent Interviews
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/interviews">
                  View All <ArrowRight className="ml-1 w-3 h-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingInterviews ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentInterviews?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Video className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No interviews yet</p>
                <Button size="sm" asChild>
                  <Link href="/interviews/new">Start First Interview</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentInterviews?.slice(0, 4).map((interview) => (
                  <div key={interview.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      (interview.overallScore ?? 0) >= 80 ? "bg-green-500" :
                      (interview.overallScore ?? 0) >= 60 ? "bg-yellow-500" : "bg-red-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{interview.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(interview.createdAt), "MMM d")} · {interview.type.replace("_", " ")}
                      </p>
                    </div>
                    {interview.overallScore !== null && (
                      <ScoreBar score={interview.overallScore ?? 0} />
                    )}
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs" asChild>
                      <Link href={interview.status === "completed" ? `/interviews/${interview.id}/analysis` : `/interviews/${interview.id}`}>
                        {interview.status === "completed" ? "Review" : "Resume"}
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Weak Areas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" /> Weak Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockWeakAreas.map((area) => (
              <div key={area.topic}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{area.topic}</span>
                  <span className="text-muted-foreground">{area.score}%</span>
                </div>
                <Progress value={area.score} className="h-1.5" />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-2" asChild>
              <Link href="/analytics">Full Analysis <ArrowRight className="ml-1 w-3 h-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" /> Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {mockAchievements.map((a) => (
                <div
                  key={a.label}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    a.earned ? "bg-yellow-500/10 border-yellow-500/30" : "bg-muted/30 border-border opacity-40 grayscale"
                  }`}
                >
                  <div className="text-2xl mb-1">{a.icon}</div>
                  <p className="text-xs font-medium leading-tight">{a.label}</p>
                  {a.earned && <CheckCircle2 className="w-3 h-3 text-green-500 mx-auto mt-1" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" /> AI Coach Says
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockRecommendations.map((rec, i) => (
              <div key={i} className="flex gap-2 items-start p-2.5 rounded-lg bg-muted/40">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                  rec.priority === "high" ? "bg-red-500" : rec.priority === "medium" ? "bg-yellow-500" : "bg-blue-500"
                }`} />
                <div>
                  <p className="text-sm">{rec.text}</p>
                  <Badge variant="outline" className="mt-1 text-[10px] h-4 px-1.5">{rec.tag}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Resume CTA ── */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5">
        <CardContent className="flex flex-col sm:flex-row items-center gap-6 py-6">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-semibold text-lg">Get Your Resume Analyzed</h3>
            <p className="text-muted-foreground text-sm mt-0.5">
              Upload your resume for an ATS score, skill extraction, missing skills, and AI-powered improvement tips.
            </p>
          </div>
          <Button className="flex-shrink-0" asChild>
            <Link href="/resumes">
              <FileText className="w-4 h-4 mr-2" /> Upload Resume
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* ── Practice Resources ── */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Recommended Practice
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "DSA Fundamentals", tag: "30 questions", difficulty: "Medium", color: "text-blue-500" },
            { title: "System Design Basics", tag: "15 scenarios", difficulty: "Hard", color: "text-red-500" },
            { title: "Behavioral Stories", tag: "20 prompts", difficulty: "Easy", color: "text-green-500" },
          ].map((item) => (
            <Card key={item.title} className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="pt-4 pb-4">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium text-sm">{item.title}</h4>
                  <span className={`text-xs font-semibold ${item.color}`}>{item.difficulty}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.tag}</p>
                <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs w-full opacity-0 group-hover:opacity-100 transition-opacity">
                  Start Practice →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
