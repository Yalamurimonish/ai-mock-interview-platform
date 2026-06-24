import { useRef, useState, useCallback, useEffect } from "react";

export interface UseSpeechReturn {
  isListening: boolean;
  isSupported: boolean;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetError: () => void;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ??
    (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition ??
    null
  );
}

export function useSpeech(onFinalTranscript: (text: string) => void): UseSpeechReturn {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isListeningRef = useRef(false);

  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Keep callback ref up to date
  useEffect(() => { onFinalRef.current = onFinalTranscript; }, [onFinalTranscript]);

  const createRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return null;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          const trimmed = text.trim();
          if (trimmed) onFinalRef.current(trimmed + " ");
        } else {
          interim += text;
        }
      }
      setInterimTranscript(interim);
    };

    rec.onerror = (e: { error: string }) => {
      // "no-speech" is common (silence timeout) — auto-restart if still listening
      if (e.error === "no-speech" && isListeningRef.current) {
        restartTimerRef.current = setTimeout(() => {
          try { recognitionRef.current?.start(); } catch {}
        }, 200);
        return;
      }
      if (e.error === "aborted") return; // intentional stop
      const messages: Record<string, string> = {
        "not-allowed": "Microphone access denied — enable it in browser settings.",
        "audio-capture": "No microphone found.",
        "network": "Network error during speech recognition.",
      };
      setError(messages[e.error] ?? `Speech error: ${e.error}`);
      setIsListening(false);
      isListeningRef.current = false;
    };

    rec.onend = () => {
      setInterimTranscript("");
      // Auto-restart if we haven't intentionally stopped
      if (isListeningRef.current) {
        restartTimerRef.current = setTimeout(() => {
          try { recognitionRef.current?.start(); } catch {}
        }, 100);
      } else {
        setIsListening(false);
      }
    };

    return rec;
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;
    setError(null);
    isListeningRef.current = true;

    if (!recognitionRef.current) {
      recognitionRef.current = createRecognition();
    }
    try {
      recognitionRef.current?.start();
    } catch {
      // Already started — ignore
    }
    setIsListening(true);
  }, [isSupported, createRecognition]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const resetError = useCallback(() => setError(null), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try { recognitionRef.current?.abort(); } catch {}
    };
  }, []);

  return {
    isListening,
    isSupported,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetError,
  };
}
