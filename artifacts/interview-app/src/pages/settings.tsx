import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppTheme } from "@/hooks/use-theme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Moon, Sun, Monitor, Bell, Mail, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AppTheme } from "@/hooks/use-theme";

const themeOptions: {
  value: AppTheme;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Bright backgrounds for well-lit spaces.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easier on the eyes in low light.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Matches your device appearance settings.",
    icon: Monitor,
  },
];

export default function Settings() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useAppTheme();
  const { reduceMotion, followsSystem, setReduceMotion } = useReducedMotion();
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
  };

  const activePreview =
    theme === "system"
      ? `Following system (${systemTheme ?? resolvedTheme ?? "…"})`
      : `Using ${theme} mode`;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your app preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how CoachAI looks on your device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label>Theme</Label>
              <p className="text-xs text-muted-foreground capitalize">{activePreview}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themeOptions.map(({ value, label, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`flex flex-col items-center text-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    theme === value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                  onClick={() => setTheme(value)}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground leading-snug">{description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 shrink-0 text-primary" />
            <span>Quick cycle:</span>
            <Kbd>Ctrl</Kbd>
            <span>+</span>
            <Kbd>Shift</Kbd>
            <span>+</span>
            <Kbd>L</Kbd>
            <span className="text-xs">(light → dark → system)</span>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t">
            <div className="space-y-1">
              <Label className="text-base font-medium">Reduce motion</Label>
              <p className="text-sm text-muted-foreground">
                {followsSystem
                  ? "Currently following your system accessibility setting."
                  : reduceMotion
                    ? "Animations and transitions are minimized."
                    : "Full motion and transitions are enabled."}
              </p>
            </div>
            <Switch
              checked={reduceMotion}
              onCheckedChange={(checked) => setReduceMotion(checked)}
              aria-label="Reduce motion"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose what you want to be notified about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-start gap-4">
              <div className="mt-1 bg-primary/10 p-2 rounded text-primary">
                <Bell className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <Label className="text-base font-medium">Weekly Practice Reminders</Label>
                <p className="text-sm text-muted-foreground">Receive reminders to complete your weekly interview goal.</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-start gap-4">
              <div className="mt-1 bg-primary/10 p-2 rounded text-primary">
                <Mail className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <Label className="text-base font-medium">Product Updates</Label>
                <p className="text-sm text-muted-foreground">Get emails about new features and interview question banks.</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
        <div className="px-6 py-4 bg-muted/20 border-t flex justify-end">
          <Button onClick={handleSave}>Save Preferences</Button>
        </div>
      </Card>
    </div>
  );
}
