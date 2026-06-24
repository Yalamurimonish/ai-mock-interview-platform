import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetMe, useUpdateProfile, getGetMeQueryKey } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  User as UserIcon, Mail, Briefcase, Star, Trophy,
  Flame, Zap, Target, TrendingUp, Clock, CheckCircle2,
  Github, Linkedin, Globe, Camera, Edit3,
} from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  targetRole: z.string().optional(),
  experienceLevel: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

// Mock stats (replace with real API)
const mockStats = {
  totalInterviews: 24,
  averageScore: 78,
  bestScore: 94,
  currentStreak: 7,
  xpPoints: 2340,
  level: 8,
  practiceHours: 14,
  rank: "Top 20%",
};

const mockAchievements = [
  { icon: "🔥", label: "7-Day Streak", earned: true, desc: "Practice 7 days in a row" },
  { icon: "🏅", label: "10 Interviews", earned: true, desc: "Complete 10 interviews" },
  { icon: "⭐", label: "90+ Score", earned: false, desc: "Score 90+ in any interview" },
  { icon: "🧠", label: "React Expert", earned: false, desc: "Ace 3 React interviews" },
  { icon: "🎯", label: "Sharpshooter", earned: true, desc: "Answer 5 questions perfectly" },
  { icon: "🚀", label: "Speed Runner", earned: false, desc: "Complete interview in under 20 min" },
];

const mockSkills = ["React", "TypeScript", "Node.js", "PostgreSQL", "REST APIs", "Git"];

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border text-center">
      <Icon className={`w-5 h-5 mb-2 ${color}`} />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default function Profile() {
  const { data: user, isLoading } = useGetMe();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "edit" | "achievements">("overview");

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", targetRole: "", experienceLevel: "" },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        targetRole: user.targetRole || "",
        experienceLevel: user.experienceLevel || "",
      });
    }
  }, [user, form]);

  const onSubmit = (data: ProfileForm) => {
    updateProfile.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Profile updated", description: "Your details have been saved." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setActiveTab("overview");
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const xpToNextLevel = 3000;
  const xpProgress = (mockStats.xpPoints / xpToNextLevel) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* ── Hero Card ── */}
      <Card className="overflow-hidden border-border">
        <div className="h-28 bg-gradient-to-r from-primary via-purple-500 to-pink-500 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,white,transparent)]" />
        </div>
        <CardContent className="pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-card border-4 border-background shadow-xl flex items-center justify-center text-primary">
                <UserIcon className="w-10 h-10" />
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{user?.name}</h1>
                <Badge className="bg-purple-500/15 text-purple-600 border-0">Level {mockStats.level}</Badge>
                <Badge className="bg-green-500/15 text-green-600 border-0">{mockStats.rank}</Badge>
              </div>
              <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {user?.email}
              </p>
              {user?.targetRole && (
                <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
                  <Briefcase className="w-3.5 h-3.5" /> {user.targetRole}
                </p>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={() => setActiveTab("edit")} className="flex-shrink-0">
              <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
            </Button>
          </div>

          {/* XP Progress */}
          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="font-medium">Level {mockStats.level} → {mockStats.level + 1}</span>
              <span>{mockStats.xpPoints} / {xpToNextLevel} XP</span>
            </div>
            <Progress value={xpProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(["overview", "edit", "achievements"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === tab ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={Target} label="Interviews" value={String(mockStats.totalInterviews)} color="text-blue-500" />
            <StatCard icon={TrendingUp} label="Avg Score" value={`${mockStats.averageScore}%`} color="text-green-500" />
            <StatCard icon={Flame} label="Streak" value={`${mockStats.currentStreak}d`} color="text-orange-500" />
            <StatCard icon={Zap} label="XP Points" value={mockStats.xpPoints.toLocaleString()} color="text-purple-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Performance Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" /> Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Best Score", value: `${mockStats.bestScore}/100`, color: "text-green-600" },
                  { label: "Average Score", value: `${mockStats.averageScore}/100`, color: "text-blue-600" },
                  { label: "Practice Hours", value: `${mockStats.practiceHours}h`, color: "text-purple-600" },
                  { label: "Global Rank", value: mockStats.rank, color: "text-orange-600" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" /> Skills from Resume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {mockSkills.map((skill) => (
                    <Badge key={skill} className="bg-primary/10 text-primary border-primary/20">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  + Upload Resume to Update Skills
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Social Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Social & Portfolio</CardTitle>
              <CardDescription>Add your links to enhance your profile</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: Github, label: "GitHub", placeholder: "github.com/username" },
                { icon: Linkedin, label: "LinkedIn", placeholder: "linkedin.com/in/name" },
                { icon: Globe, label: "Portfolio", placeholder: "yoursite.com" },
              ].map((link) => (
                <div key={link.label} className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer">
                  <link.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{link.placeholder}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Edit Tab ── */}
      {activeTab === "edit" && (
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your details to get tailored interview questions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <Label>Full Name</Label>
                    <FormControl><Input {...field} data-testid="input-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="targetRole" render={({ field }) => (
                  <FormItem>
                    <Label>Target Role</Label>
                    <FormControl>
                      <Input placeholder="e.g. Senior Frontend Engineer" {...field} data-testid="input-target-role" />
                    </FormControl>
                    <FormDescription>The role you are actively interviewing for.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="experienceLevel" render={({ field }) => (
                  <FormItem>
                    <Label>Experience Level</Label>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-experience">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="intern">Intern / New Grad</SelectItem>
                        <SelectItem value="junior">Junior (1-3 years)</SelectItem>
                        <SelectItem value="mid">Mid-level (3-5 years)</SelectItem>
                        <SelectItem value="senior">Senior (5-8+ years)</SelectItem>
                        <SelectItem value="staff">Staff / Principal (8+ years)</SelectItem>
                        <SelectItem value="manager">Manager / Director</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6 bg-muted/20">
                <Button type="button" variant="outline" onClick={() => setActiveTab("overview")}>Cancel</Button>
                <Button type="submit" disabled={updateProfile.isPending} data-testid="button-save-profile">
                  {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}

      {/* ── Achievements Tab ── */}
      {activeTab === "achievements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {mockAchievements.filter(a => a.earned).length} / {mockAchievements.length} earned
            </p>
            <Badge variant="outline">
              <Trophy className="w-3 h-3 mr-1 text-yellow-500" />
              {mockAchievements.filter(a => a.earned).length} badges
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockAchievements.map((a) => (
              <Card key={a.label} className={`transition-all ${!a.earned ? "opacity-50 grayscale" : "border-yellow-500/30"}`}>
                <CardContent className="pt-5 pb-5 flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${
                    a.earned ? "bg-yellow-500/15" : "bg-muted"
                  }`}>
                    {a.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{a.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                    {a.earned && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-600 font-medium">Earned</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
