import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { useAppTheme, useThemeKeyboardShortcut, type AppTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const themeOptions: { value: AppTheme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function ThemeIcon({ className }: { className?: string }) {
  const { theme, resolvedTheme } = useAppTheme();
  const active = theme === "system" ? resolvedTheme : theme;

  if (active === "dark") {
    return <Moon className={cn("h-4 w-4", className)} />;
  }
  return <Sun className={cn("h-4 w-4", className)} />;
}

type ThemeToggleProps = {
  className?: string;
  showShortcut?: boolean;
};

export function ThemeToggle({ className, showShortcut = true }: ThemeToggleProps) {
  const { theme, setTheme } = useAppTheme();
  const [mounted, setMounted] = useState(false);
  useThemeKeyboardShortcut(showShortcut);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("shrink-0", className)}
              aria-label="Toggle theme"
            >
              {mounted ? <ThemeIcon /> : <Sun className="h-4 w-4 opacity-0" aria-hidden />}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        {showShortcut && (
          <TooltipContent side="bottom" className="flex items-center gap-2">
            Theme
            <Kbd>Ctrl</Kbd>
            <span className="text-muted-foreground">+</span>
            <Kbd>Shift</Kbd>
            <span className="text-muted-foreground">+</span>
            <Kbd>L</Kbd>
          </TooltipContent>
        )}
      </Tooltip>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as AppTheme)}
        >
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
