import { useRef, useState, useCallback, useEffect } from "react";

export interface VideoMetrics {
  facePresentPct: number;
  eyeContactPct: number;
  lookAwayCount: number;
  totalLookAwayMs: number;
  durationMs: number;
}

const DETECTION_INTERVAL_MS = 700;
const LOOK_AWAY_THRESHOLD_MS = 1500;

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<{ detect: (src: HTMLVideoElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>> } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [eyeContact, setEyeContact] = useState(false);
  const [hasFaceDetector, setHasFaceDetector] = useState(false);

  const metricsRef = useRef({
    startTime: 0,
    facePresentFrames: 0,
    eyeContactFrames: 0,
    totalFrames: 0,
    lookAwayCount: 0,
    totalLookAwayMs: 0,
    lastFaceSeenAt: Date.now(),
    inLookAway: false,
    lookAwayStartedAt: 0,
  });

  const getMetrics = useCallback((): VideoMetrics => {
    const m = metricsRef.current;
    const durationMs = m.startTime ? Date.now() - m.startTime : 0;
    return {
      facePresentPct: m.totalFrames > 0 ? Math.round((m.facePresentFrames / m.totalFrames) * 100) : 0,
      eyeContactPct: m.totalFrames > 0 ? Math.round((m.eyeContactFrames / m.totalFrames) * 100) : 0,
      lookAwayCount: m.lookAwayCount,
      totalLookAwayMs: m.totalLookAwayMs,
      durationMs,
    };
  }, []);

  const start = useCallback(async () => {
    setPermissionRequested(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }

      // Try to initialise FaceDetector (Chrome 70+)
      const FaceDetectorCtor = (window as Window & { FaceDetector?: new (opts?: object) => { detect: (src: HTMLVideoElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>> } }).FaceDetector;
      if (FaceDetectorCtor) {
        try {
          detectorRef.current = new FaceDetectorCtor({ maxDetectedFaces: 1, fastMode: true });
          setHasFaceDetector(true);
        } catch {
          detectorRef.current = null;
        }
      }

      const now = Date.now();
      metricsRef.current = {
        startTime: now,
        facePresentFrames: 0,
        eyeContactFrames: 0,
        totalFrames: 0,
        lookAwayCount: 0,
        totalLookAwayMs: 0,
        lastFaceSeenAt: now,
        inLookAway: false,
        lookAwayStartedAt: 0,
      };

      setIsActive(true);
      setPermissionDenied(false);
    } catch (err) {
      const name = (err as DOMException).name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPermissionDenied(true);
      }
    }
  }, []);

  // Face detection loop — runs while isActive
  useEffect(() => {
    if (!isActive) return;

    const detect = async () => {
      const video = videoRef.current;
      const m = metricsRef.current;

      if (!video || video.readyState < 2 || video.paused) return;

      m.totalFrames++;

      let detected = false;
      let centered = false;

      if (detectorRef.current) {
        try {
          const faces = await detectorRef.current.detect(video);
          if (faces.length > 0) {
            detected = true;
            const box = faces[0].boundingBox;
            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;
            const faceArea = (box.width * box.height) / (vw * vh);
            const centerX = box.x + box.width / 2;
            centered = centerX > vw * 0.2 && centerX < vw * 0.8 && faceArea > 0.03;
          }
        } catch {
          // Detector failed — treat as active
          detected = true;
          centered = true;
        }
      } else {
        // No FaceDetector API — assume camera presence counts
        detected = true;
        centered = true;
      }

      if (detected) {
        m.facePresentFrames++;
        if (centered) m.eyeContactFrames++;

        if (m.inLookAway) {
          m.totalLookAwayMs += Date.now() - m.lookAwayStartedAt;
          m.inLookAway = false;
        }
        m.lastFaceSeenAt = Date.now();
      } else {
        const away = Date.now() - m.lastFaceSeenAt;
        if (away > LOOK_AWAY_THRESHOLD_MS && !m.inLookAway) {
          m.inLookAway = true;
          m.lookAwayStartedAt = m.lastFaceSeenAt + LOOK_AWAY_THRESHOLD_MS;
          m.lookAwayCount++;
        }
      }

      setFaceDetected(detected);
      setEyeContact(centered);
    };

    intervalRef.current = setInterval(() => { void detect(); }, DETECTION_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
    setFaceDetected(false);
    setEyeContact(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return {
    videoRef,
    isActive,
    permissionDenied,
    permissionRequested,
    faceDetected,
    eyeContact,
    hasFaceDetector,
    getMetrics,
    start,
    stop,
  };
}
