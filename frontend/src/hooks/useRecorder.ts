import { useCallback, useRef, useState } from "react";

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "stopped"
  | "error";

export interface RecorderError {
  code:
    | "unsupported"
    | "permission-denied"
    | "not-allowed"
    | "generic"
    | "empty";
  message: string;
}

export type MicSignalState = "checking" | "detected" | "none";

export interface MicTrackInfo {
  kind: string;
  readyState: MediaStreamTrackState;
  enabled: boolean;
  muted: boolean;
  label: string;
  deviceId?: string;
  sampleRate?: number;
  channelCount?: number;
}

export interface UploadDiagnostics {
  mimeType: string;
  blobSize: number;
  durationSeconds: number;
  track: MicTrackInfo | null;
  signalDetected: boolean;
  audioContextState: string | null;
  dataAvailableEvents: number;
}

const CHUNK_FLUSH_MS = 250;
const SIGNAL_SAMPLE_MS = 150;
const SIGNAL_NONE_AFTER_MS = 2500;
const RMS_THRESHOLD = 0.0001;
const PEAK_THRESHOLD = 0.0003;

function detectMimeType(): string {
  const candidates = [
    "audio/webm",
    "audio/webm;codecs=opus",
    "audio/ogg",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
  ];
  if (typeof MediaRecorder !== "undefined") {
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
  }
  return "audio/webm";
}

function normalizeContainerType(recorderType: string): string {
  const raw = recorderType.toLowerCase();
  if (raw.includes("webm")) return "audio/webm";
  if (raw.includes("ogg")) return "audio/ogg";
  if (raw.includes("m4a") || raw.includes("mp4")) return "audio/mp4";
  if (raw.includes("mpeg") || raw.includes("mp3")) return "audio/mpeg";
  if (raw.includes("wav")) return "audio/wav";
  return "audio/webm";
}

function getAudioContextClass(): typeof AudioContext | undefined {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

function readSignal(analyser: AnalyserNode): { rms: number; peak: number } {
  const f32 = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(f32);
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < f32.length; i++) {
    const v = f32[i];
    const abs = Math.abs(v);
    if (abs > peak) peak = abs;
    sum += v * v;
  }
  return { rms: Math.sqrt(sum / f32.length), peak };
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      void undefined;
    }
  });
}

export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [mimeType, setMimeType] = useState(detectMimeType());
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState<RecorderError | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [signal, setSignal] = useState<MicSignalState>("checking");
  const [trackInfo, setTrackInfo] = useState<MicTrackInfo | null>(null);
  const [audioContextState, setAudioContextState] =
    useState<AudioContextState | null>(null);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(
    null
  );
  const [dataAvailableEvents, setDataAvailableEvents] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const chunkCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const signalTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const signalDetectedRef = useRef(false);
  const signalStartMsRef = useRef(0);
  const totalMsRef = useRef(0);
  const segStartRef = useRef(0);
  const diagRef = useRef<UploadDiagnostics | null>(null);
  const micInfoRef = useRef<{ track: MicTrackInfo; label: string } | null>(
    null
  );

  const stopSignalMonitor = useCallback(() => {
    if (signalTimerRef.current) {
      window.clearInterval(signalTimerRef.current);
      signalTimerRef.current = null;
    }
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseCapture = useCallback(() => {
    stopSignalMonitor();
    stopDurationTimer();
    if (analyserRef.current) {
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    stopTracks(streamRef.current);
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }, [stopSignalMonitor, stopDurationTimer]);

  const start = useCallback(async () => {
    setError(null);
    setBlob(null);
    setDurationSeconds(0);
    setDataAvailableEvents(0);
    setSignal("checking");
    setTrackInfo(null);
    setSelectedMicrophone(null);
    diagRef.current = null;
    signalDetectedRef.current = false;
    chunksRef.current = [];
    chunkCountRef.current = 0;
    totalMsRef.current = 0;

    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      typeof navigator.mediaDevices === "undefined"
    ) {
      setStatus("error");
      setError({
        code: "unsupported",
        message:
          "Microphone capture is unavailable in this browser. Use Chrome, Edge, or Firefox over HTTPS or localhost.",
      });
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setStatus("error");
      setError({
        code: "unsupported",
        message:
          "Browser does not support recording. Please use a recent version of Chrome, Edge, or Firefox.",
      });
      return;
    }

    setStatus("requesting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      setStatus("error");
      if (err instanceof DOMException) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setError({
            code: "permission-denied",
            message:
              "Microphone permission denied. Please allow access to the microphone in your browser settings.",
          });
        } else if (err.name === "NotFoundError") {
          setError({
            code: "not-allowed",
            message: "No microphone was found on this device.",
          });
        } else {
          setError({
            code: "generic",
            message: "Unable to access the microphone: " + err.message,
          });
        }
      } else {
        setError({
          code: "generic",
          message: "Unable to access the microphone.",
        });
      }
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
      stopTracks(stream);
      setStatus("error");
      setError({
        code: "generic",
        message: "The microphone stream did not include an audio track.",
      });
      return;
    }

    const track = audioTracks[0];
    const settings = track.getSettings();
    const info: MicTrackInfo = {
      kind: track.kind,
      readyState: track.readyState,
      enabled: track.enabled,
      muted: track.muted,
      label: track.label,
      deviceId: settings.deviceId,
      sampleRate: settings.sampleRate,
      channelCount: settings.channelCount,
    };
    setTrackInfo(info);
    const micLabel =
      track.label && track.label.trim() !== ""
        ? track.label
        : info.deviceId
          ? "Input device " + info.deviceId
          : "Default input device";
    setSelectedMicrophone(micLabel);
    micInfoRef.current = { track: info, label: micLabel };
    if (info.deviceId) {
      console.log("[MIC] selected input deviceId:", info.deviceId);
    }

    streamRef.current = stream;

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: detectMimeType() });
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        releaseCapture();
        setStatus("error");
        setError({
          code: "unsupported",
          message: "MediaRecorder could not be initialized with this browser.",
        });
        return;
      }
    }

    const rawMime = recorder.mimeType || "audio/webm";
    const normalizedMime = normalizeContainerType(rawMime);
    setMimeType(normalizedMime);

    const AudioCtxClass = getAudioContextClass();
    let ctx: AudioContext | null = null;
    if (AudioCtxClass) {
      ctx = new AudioCtxClass();
      audioContextRef.current = ctx;
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
          void undefined;
        }
      }
      setAudioContextState(ctx.state);
      ctx.onstatechange = () => setAudioContextState(ctx!.state);
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;
    }

    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
        chunkCountRef.current += 1;
        setDataAvailableEvents(chunkCountRef.current);
      }
    };
    recorder.onstop = () => {
      totalMsRef.current += Date.now() - segStartRef.current;
      const finalDurationMs = totalMsRef.current;
      const ctxState = audioContextRef.current
        ? audioContextRef.current.state
        : null;
      const detected = signalDetectedRef.current;
      const chunks = chunkCountRef.current;
      const mic = micInfoRef.current;

      releaseCapture();
      setDurationSeconds(finalDurationMs / 1000);

      const combined = new Blob(chunksRef.current, {
        type: normalizedMime,
      });

      if (combined.size > 0 && chunks > 0) {
        diagRef.current = {
          mimeType: normalizedMime,
          blobSize: combined.size,
          durationSeconds: finalDurationMs / 1000,
          track: mic ? mic.track : null,
          signalDetected: detected,
          audioContextState: ctxState,
          dataAvailableEvents: chunks,
        };
        setBlob(combined);
        setStatus("stopped");
      } else {
        setBlob(null);
        setStatus("stopped");
        setError({
          code: "empty",
          message: "Audio recording captured no data. Please try recording again.",
        });
      }
    };
    recorder.onerror = () => {
      releaseCapture();
      setStatus("error");
      setError({
        code: "generic",
        message: "An error occurred while recording audio.",
      });
    };

    segStartRef.current = Date.now();
    recorder.start(CHUNK_FLUSH_MS);
    setStatus("recording");

    timerRef.current = window.setInterval(() => {
      setDurationSeconds(
        (totalMsRef.current + (Date.now() - segStartRef.current)) / 1000
      );
    }, 250);

    signalStartMsRef.current = Date.now();
    signalTimerRef.current = window.setInterval(() => {
      const a = analyserRef.current;
      if (!a) return;
      const { rms, peak } = readSignal(a);
      if (rms > RMS_THRESHOLD || peak > PEAK_THRESHOLD) {
        if (!signalDetectedRef.current) {
          signalDetectedRef.current = true;
          setSignal("detected");
        }
      } else if (
        !signalDetectedRef.current &&
        Date.now() - signalStartMsRef.current > SIGNAL_NONE_AFTER_MS
      ) {
        setSignal("none");
      }
    }, SIGNAL_SAMPLE_MS);
  }, [releaseCapture]);

  const pause = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r && r.state === "recording") {
      r.pause();
      totalMsRef.current += Date.now() - segStartRef.current;
      segStartRef.current = Date.now();
      setDurationSeconds(totalMsRef.current / 1000);
      stopDurationTimer();
      setStatus("paused");
    }
  }, [stopDurationTimer]);

  const resume = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r && r.state === "paused") {
      r.resume();
      segStartRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        setDurationSeconds(
          (totalMsRef.current + (Date.now() - segStartRef.current)) / 1000
        );
      }, 250);
      setStatus("recording");
    }
  }, []);

  const stop = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r && r.state !== "inactive") {
      r.stop();
    } else {
      releaseCapture();
      setStatus("stopped");
    }
  }, [releaseCapture]);

  const reset = useCallback(() => {
    setStatus("idle");
    setDurationSeconds(0);
    setError(null);
    setBlob(null);
    setSignal("checking");
    setTrackInfo(null);
    setSelectedMicrophone(null);
    setAudioContextState(null);
    setDataAvailableEvents(0);
    diagRef.current = null;
  }, []);

  const getUploadDiagnostics = useCallback(() => diagRef.current, []);

  return {
    status,
    mimeType,
    durationSeconds,
    error,
    blob,
    signal,
    trackInfo,
    audioContextState,
    selectedMicrophone,
    dataAvailableEvents,
    isSupported:
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices !== "undefined" &&
      typeof MediaRecorder !== "undefined",
    start,
    pause,
    resume,
    stop,
    reset,
    getUploadDiagnostics,
  };
}