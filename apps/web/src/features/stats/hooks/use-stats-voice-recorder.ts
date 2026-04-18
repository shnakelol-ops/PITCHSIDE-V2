"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Select a concrete, browser-supported recording MIME type.
 *
 * Order is deliberate:
 *   1. audio/webm;codecs=opus — best quality on Chrome/Firefox desktop.
 *   2. audio/webm            — fallback webm container.
 *   3. audio/mp4             — Safari/iOS path (MediaRecorder in Safari 14.1+).
 *
 * Returns "" when none are supported so the caller can surface a clear error
 * instead of letting MediaRecorder throw "NotSupportedError" deep in the stack.
 */
function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

/**
 * Strip any `;codecs=...` suffix from a MIME type. The container-only form
 * is what we label the Blob with — decoupling the codec hint from the type
 * avoids a real-world Chromium <audio> quirk where
 * `audio/webm;codecs=opus`-labelled blobs sometimes fail with
 * MEDIA_ERR_SRC_NOT_SUPPORTED (error 4) even when plain `audio/webm` plays.
 */
function containerMimeOnly(type: string): string {
  const i = type.indexOf(";");
  return (i >= 0 ? type.slice(0, i) : type).trim();
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
 *
 * Invariants:
 *  - MediaRecorder is constructed with an explicitly-supported mimeType.
 *  - The emitted Blob is labelled with the container-only MIME (e.g.
 *    "audio/webm"), NOT the codec-qualified form. This makes the resulting
 *    ObjectURL reliably playable via `<audio>` on Chrome/Android.
 *  - Empty recordings resolve to `null` so the caller never creates a moment
 *    or a dead play button for a zero-byte clip.
 */
export function useStatsVoiceRecorder(): UseStatsVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  /** The MIME we CHOSE for this session (not what the recorder reports). */
  const selectedMimeRef = useRef<string>("");

  const startRecording = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not available");
      return;
    }
    const mimeType = pickRecorderMimeType();
    if (!mimeType) {
      setError("This browser can't record audio");
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
      selectedMimeRef.current = mimeType;
      const rec = new MediaRecorder(stream, { mimeType });
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.start(100);
      recorderRef.current = rec;
      if (typeof console !== "undefined") {
        console.log("[voice] recording with mimeType:", mimeType);
      }
      setIsRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start recording");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      selectedMimeRef.current = "";
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
        const chunks = chunksRef.current;
        chunksRef.current = [];

        if (chunks.length === 0) {
          if (typeof console !== "undefined") {
            console.warn("[voice] no chunks captured — empty clip");
          }
          resolve(null);
          return;
        }

        // Prefer the MIME we selected; fall back to whatever MediaRecorder
        // reports. Use the container-only form so `<audio>` reliably decodes.
        const sourceType = selectedMimeRef.current || rec.mimeType || "audio/webm";
        const type = containerMimeOnly(sourceType) || "audio/webm";
        const blob = new Blob(chunks, { type });

        if (typeof console !== "undefined") {
          console.log("[voice] blob type:", blob.type);
          console.log("[voice] blob size:", blob.size);
        }

        if (blob.size === 0) {
          if (typeof console !== "undefined") {
            console.warn("[voice] zero-byte blob — rejecting");
          }
          resolve(null);
          return;
        }

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
      selectedMimeRef.current = "";
    };
  }, []);

  return { isRecording, error, startRecording, stopRecording };
}
