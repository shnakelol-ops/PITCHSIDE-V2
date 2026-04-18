"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Candidate audio MIME types, in priority order.
 *
 * The picker walks this list and returns the FIRST value the current browser
 * reports as `MediaRecorder.isTypeSupported(...) === true`. The same value is
 * then used for BOTH the MediaRecorder construction AND the final Blob label —
 * no label-stripping, no sniffing. If none match we return null and the caller
 * surfaces a clear "recording not supported" error.
 */
export const CANDIDATE_AUDIO_TYPES: readonly string[] = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/aac",
  "audio/ogg;codecs=opus",
];

/**
 * Returns the first CANDIDATE_AUDIO_TYPES entry this browser truly supports
 * for MediaRecorder, or null when none do. Safe during SSR (returns null).
 */
export function pickSupportedAudioMimeType(): string | null {
  if (typeof window === "undefined") return null;
  if (typeof window.MediaRecorder === "undefined") return null;
  for (const t of CANDIDATE_AUDIO_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      /* isTypeSupported threw on this engine for this string — skip */
    }
  }
  return null;
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
 *  - MediaRecorder is constructed with the EXACT MIME returned by the picker.
 *  - The emitted Blob is labelled with the SAME exact MIME — never `""`,
 *    never container-stripped. This keeps record + playback aligned.
 *  - Empty recordings resolve to `null` so the caller never creates a moment
 *    or a dead play button for a zero-byte clip.
 */
export function useStatsVoiceRecorder(): UseStatsVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  /** The MIME we CHOSE for this session — used verbatim on the Blob. */
  const selectedMimeRef = useRef<string>("");

  const startRecording = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not available");
      return;
    }
    const mimeType = pickSupportedAudioMimeType();
    if (!mimeType) {
      setError("Recording not supported in this browser");
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
        console.log("[voice] selected mimeType:", mimeType);
        console.log("[voice] recorder mimeType:", rec.mimeType);
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

        // Use the picker's selected MIME verbatim. Never fall back to `""`.
        // If for some reason the ref was cleared, use the recorder's reported
        // type, then lastly a container default — but this path should never
        // fire in practice because startRecording guards on the picker.
        const type =
          selectedMimeRef.current || rec.mimeType || "audio/webm";
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
