import { useListInterviews } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, Clock, CheckCircle2, PlayCircle } from "lucide-react";

export default function InterviewList() {
  const { data: allInterviews, isLoading } = useListInterviews();
  
  const pending = allInterviews?.filter(i => i.status === 'pending' || i.status === 'in_progress') || [];
  const completed = allInterviews?.filter(i => i.status === 'completed') || [];

  const renderInterviewList = (interviews: typeof allInterviews) => {
    if (!interviews || interviews.length === 0) {
      return (
        <div className="py-12 text-center border rounded-lg bg-muted/20">
          <div className="text-muted-foreground mb-4">No interviews found.</div>
          <Button asChild>
            <Link href="/interviews/new">Create One</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {interviews.map((interview) => (
          <Card key={interview.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base line-clamp-1">{interview.title}</CardTitle>
                <span className="text-xs px-2 py-1 bg-secondary rounded-full font-medium capitalize">
                  {interview.type.replace('_', ' ')}
                </span>
              </div>
              <CardDescription>
                {format(new Date(interview.createdAt), 'MMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Difficulty</span>
                  <span className="capitalize">{interview.difficulty}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Questions</span>
                  <span>{interview.answeredCount || 0} / {interview.questionCount}</span>
                </div>
              </div>
              
              {interview.status === 'completed' && interview.overallScore !== null && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">Score</div>
                  <div className="text-2xl font-bold text-primary">{interview.overallScore}/100</div>
                </div>
              )}
            </CardContent>
            <div className="p-4 pt-0 mt-auto">
              <Button variant={interview.status === 'completed' ? "secondary" : "default"} className="w-full" asChild>
                <Link href={interview.status === 'completed' ? `/interviews/${interview.id}/analysis` : `/interviews/${interview.id}`}>
                  {interview.status === 'completed' ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> View Analysis</>
                  ) : interview.status === 'in_progress' ? (
                    <><PlayCircle className="w-4 h-4 mr-2" /> Resume</>
                  ) : (
                    <><PlayCircle className="w-4 h-4 mr-2" /> Start</>
                  )}
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interviews</h1>
          <p className="text-muted-foreground">History and progress of your mock interviews</p>
        </div>
        <Button asChild>
          <Link href="/interviews/new">New Interview</Link>
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All ({allInterviews?.length || 0})</TabsTrigger>
          <TabsTrigger value="active">Active ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <TabsContent value="all" className="m-0">
              {renderInterviewList(allInterviews)}
            </TabsContent>
            <TabsContent value="active" className="m-0">
              {renderInterviewList(pending)}
            </TabsContent>
            <TabsContent value="completed" className="m-0">
              {renderInterviewList(completed)}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
