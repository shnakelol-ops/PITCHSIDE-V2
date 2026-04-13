"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
}

export type UseStatsVoiceRecorderResult = {
  isRecording: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  /** Returns a Blob when supported, or null if nothing recorded. */
  stopRecording: () => Promise<Blob | null>;
};

/**
 * Minimal MediaRecorder wrapper — no persistence; caller owns blob lifecycle.
 */
export function useStatsVoiceRecorder(): UseStatsVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not available");
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const rec = new MediaRecorder(stream, options);
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.start(100);
      recorderRef.current = rec;
      setIsRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start recording");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    const rec = recorderRef.current;
    const stream = streamRef.current;
    recorderRef.current = null;
    streamRef.current = null;
    setIsRecording(false);

    if (!rec || rec.state === "inactive") {
      stream?.getTracks().forEach((t) => t.stop());
      return null;
    }

    return new Promise((resolve) => {
      rec.onstop = () => {
        stream?.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || "audio/webm";
        const blob =
          chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type }) : null;
        chunksRef.current = [];
        resolve(blob);
      };
      rec.stop();
    });
  }, []);

  useEffect(() => {
    return () => {
      const rec = recorderRef.current;
      recorderRef.current = null;
      const stream = streamRef.current;
      streamRef.current = null;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
      stream?.getTracks().forEach((t) => t.stop());
      chunksRef.current = [];
    };
  }, []);

  return { isRecording, error, startRecording, stopRecording };
}
