import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import { Video, BrainCircuit, Target, BarChart3, ChevronRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <header className="px-6 h-16 flex items-center border-b justify-between">
        <div className="flex items-center gap-2 font-bold tracking-tight text-lg">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground">
            <Video className="w-5 h-5" />
          </div>
          CoachAI
        </div>
        <nav className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
            Login
          </Link>
          <Button asChild size="sm">
            <Link href="/register">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="py-24 md:py-32 px-6 flex flex-col items-center text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm mb-8 font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            AI-Powered Mock Interviews
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-balance">
            Sharpen your interview skills.<br />
            <span className="text-primary">Land the job.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl text-balance">
            Practice with an AI coach that asks tough questions, analyzes your answers, and gives you actionable feedback to improve. Stop gambling with your career.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button size="lg" asChild className="h-14 px-8 text-base">
              <Link href="/register">
                Start Practicing Free <ChevronRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-14 px-8 text-base bg-transparent">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </section>

        <section className="py-24 bg-muted/30 border-y">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Adaptive Questioning</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our AI adapts to your resume and target role, asking the exact technical and behavioral questions you'll face in real interviews.
                </p>
              </div>
              <div className="flex flex-col">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Instant Feedback</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get detailed analysis on every answer immediately. We highlight your strengths and tell you exactly what you missed.
                </p>
              </div>
              <div className="flex flex-col">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Track Progress</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Watch your confidence and scores grow over time. Visual analytics show you which skills are interview-ready and which need work.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-muted-foreground text-sm border-t">
        <p>CoachAI Mock Interview Platform. Built for the modern job seeker.</p>
      </footer>
    </div>
  );
}
