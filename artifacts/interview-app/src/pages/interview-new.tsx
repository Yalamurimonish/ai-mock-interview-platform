import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateInterview, useListResumes } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Code2, Users, Brain, Layers, MessageSquare, Cpu,
  Building2, Mic, ChevronRight, Sparkles, Target,
  Clock, BarChart3, FileText, Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

const interviewSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  type: z.string(),
  difficulty: z.string(),
  targetRole: z.string().optional(),
  questionCount: z.coerce.number().min(3).max(20),
  resumeId: z.coerce.number().optional(),
});

type InterviewForm = z.infer<typeof interviewSchema>;

// ─── Data ─────────────────────────────────────────────────────────────────────

const interviewTypes = [
  { value: "technical", label: "Technical", icon: Code2, color: "from-blue-500 to-indigo-600", desc: "DSA, system concepts, problem solving" },
  { value: "hr", label: "HR Round", icon: Users, color: "from-purple-500 to-pink-600", desc: "Behavioral, culture fit, soft skills" },
  { value: "system_design", label: "System Design", icon: Layers, color: "from-orange-500 to-red-500", desc: "Architecture, scalability, databases" },
  { value: "coding", label: "Coding Round", icon: Cpu, color: "from-green-500 to-teal-600", desc: "Live coding, algorithms, optimization" },
  { value: "behavioral", label: "Behavioral", icon: MessageSquare, color: "from-pink-500 to-rose-600", desc: "STAR method, leadership, teamwork" },
  { value: "mixed", label: "Mixed", icon: Brain, color: "from-violet-500 to-purple-600", desc: "Combination of all types" },
];

const roles = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "React Developer", "Node.js Developer", "Java Developer",
  "Python Developer", "Data Analyst", "Data Scientist",
  "DevOps Engineer", "Cloud Engineer", "ML Engineer",
  "Android Developer", "iOS Developer", "UI/UX Designer",
  "Product Manager", "QA Engineer", "Security Engineer",
];

const companies = [
  { name: "Google", emoji: "🔵", style: "border-blue-500/40 bg-blue-500/5 hover:border-blue-500" },
  { name: "Amazon", emoji: "🟠", style: "border-orange-500/40 bg-orange-500/5 hover:border-orange-500" },
  { name: "Microsoft", emoji: "🟩", style: "border-green-500/40 bg-green-500/5 hover:border-green-500" },
  { name: "Meta", emoji: "🔷", style: "border-blue-400/40 bg-blue-400/5 hover:border-blue-400" },
  { name: "Apple", emoji: "⬛", style: "border-gray-500/40 bg-gray-500/5 hover:border-gray-500" },
  { name: "Netflix", emoji: "🔴", style: "border-red-500/40 bg-red-500/5 hover:border-red-500" },
  { name: "TCS", emoji: "🟦", style: "border-indigo-500/40 bg-indigo-500/5 hover:border-indigo-500" },
  { name: "Infosys", emoji: "🟪", style: "border-purple-500/40 bg-purple-500/5 hover:border-purple-500" },
  { name: "Wipro", emoji: "🟫", style: "border-yellow-600/40 bg-yellow-600/5 hover:border-yellow-600" },
  { name: "Accenture", emoji: "🟣", style: "border-violet-500/40 bg-violet-500/5 hover:border-violet-500" },
  { name: "Flipkart", emoji: "🟡", style: "border-yellow-500/40 bg-yellow-500/5 hover:border-yellow-500" },
  { name: "Startup", emoji: "🚀", style: "border-teal-500/40 bg-teal-500/5 hover:border-teal-500" },
];

const difficulties = [
  { value: "beginner", label: "Beginner", desc: "Fresh grads & entry level", color: "text-green-500" },
  { value: "intermediate", label: "Intermediate", desc: "2-4 years experience", color: "text-yellow-500" },
  { value: "advanced", label: "Advanced", desc: "Senior & lead roles", color: "text-red-500" },
];

// ─── Steps ────────────────────────────────────────────────────────────────────

const steps = ["Type", "Role & Company", "Settings", "Review"];

export default function InterviewNew() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: resumes } = useListResumes();
  const createInterview = useCreateInterview();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("intermediate");

  const form = useForm<InterviewForm>({
    resolver: zodResolver(interviewSchema),
    defaultValues: {
      title: "",
      type: "technical",
      difficulty: "intermediate",
      targetRole: "",
      questionCount: 5,
    },
  });

  const onSubmit = (data: InterviewForm) => {
    const title = data.title || `${selectedCompany ? selectedCompany + " - " : ""}${data.targetRole || "General"} ${data.type.replace("_", " ")} Interview`;
    createInterview.mutate(
      { data: { ...data, title, difficulty: selectedDifficulty, type: selectedType || data.type } },
      {
        onSuccess: (interview) => {
          toast({ title: "Interview created!", description: "Get ready to begin." });
          setLocation(`/interviews/${interview.id}`);
        },
        onError: () => {
          toast({ title: "Failed to create interview", variant: "destructive" });
        },
      }
    );
  };

  const selectedTypeData = interviewTypes.find(t => t.value === selectedType);

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-primary" /> New Interview
        </h1>
        <p className="text-muted-foreground mt-1">Customize your mock interview session</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
              i < currentStep ? "bg-green-500 text-white" :
              i === currentStep ? "bg-primary text-white" :
              "bg-muted text-muted-foreground"
            }`}>
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === currentStep ? "text-foreground" : "text-muted-foreground"}`}>
              {step}
            </span>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full ${i < currentStep ? "bg-green-500" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>

          {/* ── Step 0: Interview Type ── */}
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" /> Choose Interview Type
                </CardTitle>
                <CardDescription>What kind of interview do you want to practice?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {interviewTypes.map((type) => (
                    <div
                      key={type.value}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedType === type.value
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40"
                      }`}
                      onClick={() => {
                        setSelectedType(type.value);
                        form.setValue("type", type.value);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center flex-shrink-0`}>
                          <type.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.desc}</p>
                        </div>
                        {selectedType === type.value && (
                          <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end">
                <Button onClick={nextStep} disabled={!selectedType}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ── Step 1: Role & Company ── */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" /> Role & Company
                </CardTitle>
                <CardDescription>Target a specific role or company for tailored questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Role */}
                <FormField control={form.control} name="targetRole" render={({ field }) => (
                  <FormItem>
                    <Label>Target Role</Label>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormDescription>Or type a custom role below</FormDescription>
                    <FormControl>
                      <Input placeholder="e.g. Senior React Developer" {...field} className="mt-2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Company */}
                <div>
                  <Label className="mb-3 block">Company (Optional)</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {companies.map((co) => (
                      <button
                        key={co.name}
                        type="button"
                        onClick={() => setSelectedCompany(selectedCompany === co.name ? "" : co.name)}
                        className={`p-2.5 rounded-xl border-2 text-center text-sm font-medium transition-all ${
                          selectedCompany === co.name
                            ? "border-primary bg-primary/10 shadow"
                            : co.style + " border"
                        }`}
                      >
                        <div className="text-lg mb-0.5">{co.emoji}</div>
                        <div className="text-xs">{co.name}</div>
                      </button>
                    ))}
                  </div>
                  {selectedCompany && (
                    <p className="text-xs text-primary mt-2 font-medium">
                      ✓ Questions will be tailored for {selectedCompany} style interviews
                    </p>
                  )}
                </div>

                {/* Resume */}
                {resumes && resumes.length > 0 && (
                  <FormField control={form.control} name="resumeId" render={({ field }) => (
                    <FormItem>
                      <Label className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> Use Resume Context
                      </Label>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a resume (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {resumes.map(r => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.filename}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>AI will generate questions based on your resume</FormDescription>
                    </FormItem>
                  )} />
                )}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button variant="outline" onClick={prevStep}>Back</Button>
                <Button onClick={nextStep}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </CardFooter>
            </Card>
          )}

          {/* ── Step 2: Settings ── */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> Interview Settings
                </CardTitle>
                <CardDescription>Set difficulty and number of questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Difficulty */}
                <div>
                  <Label className="mb-3 block">Difficulty Level</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {difficulties.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => {
                          setSelectedDifficulty(d.value);
                          form.setValue("difficulty", d.value);
                        }}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          selectedDifficulty === d.value
                            ? "border-primary bg-primary/5 shadow"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <p className={`font-bold text-sm ${d.color}`}>{d.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{d.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question count */}
                <FormField control={form.control} name="questionCount" render={({ field }) => (
                  <FormItem>
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" /> Number of Questions
                    </Label>
                    <div className="flex gap-2 flex-wrap">
                      {[3, 5, 7, 10, 15].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => form.setValue("questionCount", n)}
                          className={`w-12 h-10 rounded-lg border-2 text-sm font-semibold transition-all ${
                            field.value === n
                              ? "border-primary bg-primary text-white"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <FormControl>
                        <Input
                          type="number" min="3" max="20"
                          className="w-20 h-10"
                          placeholder="Custom"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormDescription>
                      ~{(field.value || 5) * 3}-{(field.value || 5) * 5} minutes estimated
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Custom title */}
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <Label>Session Title (Optional)</Label>
                    <FormControl>
                      <Input
                        placeholder={`${selectedCompany ? selectedCompany + " - " : ""}${form.watch("targetRole") || "General"} Interview`}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Leave blank to auto-generate</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button variant="outline" onClick={prevStep}>Back</Button>
                <Button onClick={nextStep}>Review <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </CardFooter>
            </Card>
          )}

          {/* ── Step 3: Review ── */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> Ready to Start
                </CardTitle>
                <CardDescription>Review your interview setup before beginning</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="rounded-2xl border border-border bg-muted/30 divide-y divide-border">
                  {[
                    { label: "Type", value: selectedTypeData?.label || selectedType, icon: selectedTypeData ? selectedTypeData.icon : Brain },
                    { label: "Role", value: form.watch("targetRole") || "General", icon: Target },
                    { label: "Company", value: selectedCompany || "Any", icon: Building2 },
                    { label: "Difficulty", value: difficulties.find(d => d.value === selectedDifficulty)?.label || "Intermediate", icon: BarChart3 },
                    { label: "Questions", value: `${form.watch("questionCount")} questions`, icon: Clock },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </div>
                      <span className="text-sm font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>

                {selectedCompany && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex gap-3">
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      AI will generate <strong>{selectedCompany}</strong>-style questions focusing on their known interview patterns and culture.
                    </p>
                  </div>
                )}

                {resumes && resumes.length > 0 && form.watch("resumeId") && (
                  <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4 flex gap-3">
                    <FileText className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Questions will be personalized based on your uploaded resume.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between bg-muted/20">
                <Button variant="outline" onClick={prevStep}>Back</Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={createInterview.isPending}
                  data-testid="button-start"
                >
                  {createInterview.isPending ? (
                    <><span className="animate-spin mr-2">⏳</span> Preparing...</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" /> Start Interview</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

        </form>
      </Form>
    </div>
  );
}
