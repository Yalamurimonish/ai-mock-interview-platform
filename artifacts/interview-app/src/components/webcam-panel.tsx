import { useRef, useEffect } from "react";
import { Video, VideoOff, Eye, EyeOff, AlertCircle, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface WebcamPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  permissionDenied: boolean;
  permissionRequested: boolean;
  faceDetected: boolean;
  eyeContact: boolean;
  hasFaceDetector: boolean;
  facePresentPct?: number;
  eyeContactPct?: number;
  lookAwayCount?: number;
  className?: string;
  compact?: boolean;
}

export function WebcamPanel({
  videoRef,
  isActive,
  permissionDenied,
  permissionRequested,
  faceDetected,
  eyeContact,
  hasFaceDetector,
  facePresentPct = 0,
  eyeContactPct = 0,
  lookAwayCount = 0,
  className,
  compact = false,
}: WebcamPanelProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Camera feed */}
      <div className="relative rounded-xl overflow-hidden bg-zinc-950 border border-border aspect-[4/3] w-full">
        {/* Live video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover",
            "[transform:scaleX(-1)]", // mirror effect
            !isActive && "hidden"
          )}
          data-testid="webcam-video"
        />

        {/* Permission denied overlay */}
        {permissionDenied && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-zinc-950">
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Camera access denied.
              <br />
              Enable it in browser settings.
            </p>
          </div>
        )}

        {/* Not yet requested overlay */}
        {!permissionRequested && !isActive && !permissionDenied && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950">
            <Camera className="w-8 h-8 text-muted-foreground opacity-40" />
            <p className="text-xs text-muted-foreground">Camera loading...</p>
          </div>
        )}

        {/* Requested but pending */}
        {permissionRequested && !isActive && !permissionDenied && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950">
            <Camera className="w-8 h-8 text-muted-foreground animate-pulse" />
            <p className="text-xs text-muted-foreground">Awaiting permission...</p>
          </div>
        )}

        {/* Overlays when active */}
        {isActive && (
          <>
            {/* Recording badge */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-semibold tracking-wide text-white uppercase">Live</span>
            </div>

            {/* Face/eye status badge */}
            {hasFaceDetector && (
              <div className="absolute top-2.5 right-2.5">
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 backdrop-blur-sm text-[10px] font-semibold tracking-wide uppercase",
                    faceDetected
                      ? "bg-emerald-500/80 text-white"
                      : "bg-red-500/80 text-white"
                  )}
                >
                  {faceDetected ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3" />
                  )}
                  {faceDetected ? (eyeContact ? "On camera" : "Off-center") : "Look at camera"}
                </div>
              </div>
            )}

            {/* Bottom gradient with no-face warning */}
            {hasFaceDetector && !faceDetected && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-red-900/80 to-transparent p-3 pt-6">
                <p className="text-xs text-white font-medium text-center">
                  Face not detected — look at the camera
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Live metrics (only show when detection is running and we have real data) */}
      {isActive && !compact && (
        <div className="grid grid-cols-3 gap-2">
          <MetricTile
            label="Face visible"
            value={hasFaceDetector ? `${facePresentPct}%` : "—"}
            color={facePresentPct >= 80 ? "green" : facePresentPct >= 60 ? "yellow" : "red"}
            active={hasFaceDetector}
          />
          <MetricTile
            label="Eye contact"
            value={hasFaceDetector ? `${eyeContactPct}%` : "—"}
            color={eyeContactPct >= 75 ? "green" : eyeContactPct >= 50 ? "yellow" : "red"}
            active={hasFaceDetector}
          />
          <MetricTile
            label="Look aways"
            value={hasFaceDetector ? String(lookAwayCount) : "—"}
            color={lookAwayCount === 0 ? "green" : lookAwayCount <= 3 ? "yellow" : "red"}
            active={hasFaceDetector}
          />
        </div>
      )}

      {/* No FaceDetector notice */}
      {isActive && hasFaceDetector === false && !compact && (
        <p className="text-[11px] text-muted-foreground text-center">
          Face tracking unavailable in this browser.
          Camera is recording.
        </p>
      )}
    </div>
  );
}

function MetricTile({
  label,
  value,
  color,
  active,
}: {
  label: string;
  value: string;
  color: "green" | "yellow" | "red";
  active: boolean;
}) {
  const colorMap = {
    green: "text-emerald-500",
    yellow: "text-yellow-500",
    red: "text-red-500",
  };

  return (
    <div className="bg-muted/50 rounded-lg p-2 text-center border border-border">
      <div className={cn("text-base font-bold tabular-nums", active ? colorMap[color] : "text-muted-foreground")}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</div>
    </div>
  );
}
