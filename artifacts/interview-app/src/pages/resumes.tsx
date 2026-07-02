import { useListResumes, useUploadResume, useDeleteResume, getListResumesQueryKey } from "@workspace/api-client-react";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Plus, Trash2, CheckCircle2, Upload,
  FileType, X, File, ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_SIZE_MB = 5;

function getFileExt(filename: string) {
  return filename.split(".").pop()?.toUpperCase() || "FILE";
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): string | null {
  const valid = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!valid) return "Only PDF, DOC, and DOCX files are supported.";
  if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File must be under ${MAX_SIZE_MB}MB.`;
  return null;
}

export default function Resumes() {
  const { data: resumes, isLoading } = useListResumes();
  const uploadResume = useUploadResume();
  const deleteResume = useDeleteResume();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<"file" | "text">("file");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeName, setResumeName] = useState("");
  const [content, setContent] = useState("");

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({ title: "Invalid file", description: error, variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    setResumeName(file.name.replace(/\.[^.]+$/, ""));
    setStep("text");
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  const resetForm = () => {
    setIsUploading(false);
    setStep("file");
    setSelectedFile(null);
    setResumeName("");
    setContent("");
  };

  const handleUpload = () => {
    if (!resumeName.trim()) {
      toast({ title: "Enter a resume name", variant: "destructive" });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Paste your resume text",
        description: "Copy the text from your PDF/DOC and paste it here.",
        variant: "destructive",
      });
      return;
    }

    const ext = selectedFile ? selectedFile.name.split(".").pop() : "pdf";
    const fullFilename = `${resumeName}.${ext}`;

    uploadResume.mutate(
      { data: { filename: fullFilename, content } },
      {
        onSuccess: () => {
          toast({ title: "Resume saved!", description: "Your resume has been uploaded successfully." });
          resetForm();
          queryClient.invalidateQueries({ queryKey: getListResumesQueryKey() });
        },
        onError: () => {
          toast({
            title: "Upload failed",
            description: "There was an error saving your resume.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteResume.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Resume deleted" });
          queryClient.invalidateQueries({ queryKey: getListResumesQueryKey() });
        },
      },
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumes</h1>
          <p className="text-muted-foreground">Upload your resume for context-aware AI interviews</p>
        </div>

        {!isUploading && (
          <Button onClick={() => setIsUploading(true)}>
            <Plus className="mr-2 w-4 h-4" /> Add Resume
          </Button>
        )}
      </div>

      {isUploading && (
        <Card className="border-primary/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload Resume</CardTitle>
                <CardDescription>
                  {step === "file" ? "Select your resume file (PDF, DOC, DOCX)" : "Now paste your resume text content"}
                </CardDescription>
              </div>

              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <div
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
                  step === "file" ? "bg-primary text-white" : "bg-green-500 text-white"
                }`}
              >
                {step === "file" ? "1" : <CheckCircle2 className="w-3 h-3" />} Select File
              </div>

              <ArrowRight className="w-3 h-3 text-muted-foreground" />

              <div
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
                  step === "text" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                2 Paste Text
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {step === "file" && (
              <>
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={onInputChange}
                    className="hidden"
                  />

                  <div
                    className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                      isDragging ? "bg-primary text-white" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Upload className="w-8 h-8" />
                  </div>

                  <h3 className="font-semibold text-lg mb-1">
                    {isDragging ? "Drop it here!" : "Drag & drop your resume"}
                  </h3>

                  <p className="text-muted-foreground text-sm mb-4">or click to browse files</p>

                  <div className="flex justify-center gap-2">
                    {["PDF", "DOC", "DOCX"].map((ext) => (
                      <Badge key={ext} variant="outline" className="font-mono">
                        .{ext.toLowerCase()}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">Max {MAX_SIZE_MB}MB</p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or skip file, just paste text</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => setStep("text")}>
                  <FileText className="w-4 h-4 mr-2" /> Paste Resume Text Directly
                </Button>
              </>
            )}

            {step === "text" && (
              <>
                {selectedFile && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <File className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {getFileExt(selectedFile.name)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedFile(null);
                        setStep("file");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                    📋 How to paste your resume text:
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Open your PDF or DOC file</li>
                    <li>Press Ctrl+A to select all text</li>
                    <li>Press Ctrl+C to copy</li>
                    <li>Paste below with Ctrl+V</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <Label>Resume Name</Label>
                  <Input
                    placeholder="e.g. Frontend Engineer 2025"
                    value={resumeName}
                    onChange={(e) => setResumeName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Resume Text Content <span className="text-red-500">*</span>
                  </Label>

                  <Textarea
                    placeholder="Paste your resume text here (Ctrl+V)..."
                    className="min-h-[220px] font-mono text-sm"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    autoFocus
                  />

                  {content && (
                    <p className="text-xs text-muted-foreground">
                      {content.length} characters · ~{content.trim().split(/\s+/).length} words
                    </p>
                  )}
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep("file")}>
                    ← Back
                  </Button>

                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={resetForm}>
                      Cancel
                    </Button>

                    <Button
                      onClick={handleUpload}
                      disabled={uploadResume.isPending || !resumeName.trim() || !content.trim()}
                    >
                      {uploadResume.isPending ? (
                        "Saving..."
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Save Resume
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </>
        ) : resumes?.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed rounded-2xl bg-muted/10">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground/50" />
            </div>

            <h3 className="text-lg font-semibold mb-1">No resumes yet</h3>

            <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
              Upload your resume to get personalized AI interview questions and ATS score.
            </p>

            <Button onClick={() => setIsUploading(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload Resume
            </Button>
          </div>
        ) : (
          resumes?.map((resume) => {
            const resumeData = resume as any;

            return (
              <Card
                key={resume.id}
                className={`hover:shadow-md transition-all ${resume.isActive ? "border-primary shadow-sm" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{resume.filename}</CardTitle>
                        <CardDescription className="text-xs">
                          {format(new Date(resume.uploadedAt), "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                    </div>

                    {resume.isActive && (
                      <Badge className="bg-primary/10 text-primary border-0 flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <Badge variant="outline" className="font-mono text-xs">
                    <FileType className="w-3 h-3 mr-1" />
                    {getFileExt(resume.filename)}
                  </Badge>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {resume.parsedSkills ? `${resume.parsedSkills.split(",").length} skills detected` : "No skills parsed yet"}
                    </span>

                    {resumeData.resumeScore && (
                      <span className="font-semibold text-primary">
                        Score: {resumeData.resumeScore}/100
                      </span>
                    )}
                  </div>

                  {resumeData.missingSkills && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-orange-500">Missing: </span>
                      {resumeData.missingSkills}
                    </p>
                  )}

                  {resumeData.improvementSuggestions && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      <span className="font-medium">Tips: </span>
                      {resumeData.improvementSuggestions}
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(resume.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}