"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { findActiveIndex } from "@/lib/transcript";
import { isInteractiveTarget, isTypingTarget } from "@/lib/utils";
import type { Segment } from "@/lib/types";

export interface PlayerApi {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  rate: number;
  activeIndex: number;
  ready: boolean;
  error: string | null;
  toggle(): void;
  play(): void;
  pause(): void;
  seek(t: number, opts?: { play?: boolean }): void;
  skip(delta: number): void;
  setRate(r: number): void;
  playRange(start: number, end: number): void;
}

const PlayerContext = createContext<PlayerApi | null>(null);

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

interface PlayerProviderProps {
  src: string;
  duration: number;
  segments: Segment[];
  children: ReactNode;
}

export function PlayerProvider({ src, duration: durationProp, segments, children }: PlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationProp);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRateState] = useState(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingSeek = useRef<{ t: number; play: boolean } | null>(null);
  const rangeEnd = useRef<number | null>(null);
  const durationRef = useRef(durationProp);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!readyRef.current) {
      durationRef.current = durationProp;
      setDuration(durationProp);
    }
  }, [durationProp]);

  const play = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.play().catch(() => {
      /* interrupted or blocked; state follows play/pause events */
    });
  }, []);

  const pause = useCallback(() => {
    rangeEnd.current = null;
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) play();
    else pause();
  }, [play, pause]);

  const seek = useCallback(
    (t: number, opts?: { play?: boolean }) => {
      const a = audioRef.current;
      if (!a) return;
      const clamped = Math.min(Math.max(0, t), durationRef.current || t);
      if (rangeEnd.current !== null && clamped >= rangeEnd.current) rangeEnd.current = null;
      if (!readyRef.current) {
        pendingSeek.current = { t: clamped, play: !!opts?.play };
        setCurrentTime(clamped);
        return;
      }
      a.currentTime = clamped;
      setCurrentTime(clamped);
      if (opts?.play) play();
    },
    [play],
  );

  const skip = useCallback(
    (delta: number) => {
      const a = audioRef.current;
      if (!a) return;
      const base = pendingSeek.current ? pendingSeek.current.t : a.currentTime;
      seek(base + delta);
    },
    [seek],
  );

  const setRate = useCallback((r: number) => {
    setRateState(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }, []);

  const playRange = useCallback(
    (start: number, end: number) => {
      seek(start, { play: true });
      rangeEnd.current = end;
    },
    [seek],
  );

  // Audio element events
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const checkRange = () => {
      if (rangeEnd.current !== null && a.currentTime >= rangeEnd.current) {
        rangeEnd.current = null;
        a.pause();
      }
    };
    const onMeta = () => {
      readyRef.current = true;
      if (Number.isFinite(a.duration) && a.duration > 0) {
        durationRef.current = a.duration;
        setDuration(a.duration);
      }
      setReady(true);
      setError(null);
      const p = pendingSeek.current;
      if (p) {
        pendingSeek.current = null;
        a.currentTime = Math.min(p.t, durationRef.current);
        setCurrentTime(a.currentTime);
        if (p.play) a.play().catch(() => {});
      }
    };
    const onTime = () => {
      setCurrentTime(a.currentTime);
      checkRange();
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      setCurrentTime(a.currentTime);
    };
    const onEnded = () => {
      setIsPlaying(false);
      rangeEnd.current = null;
    };
    const onError = () => setError("Audio couldn't be loaded.");

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("seeked", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    if (a.readyState >= 1) onMeta();
    if (a.error) onError();
    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("seeked", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, []);

  // Frame-rate updates while playing
  useEffect(() => {
    if (!isPlaying) return;
    const a = audioRef.current;
    if (!a) return;
    let raf = 0;
    const tick = () => {
      if (rangeEnd.current !== null && a.currentTime >= rangeEnd.current) {
        rangeEnd.current = null;
        a.pause();
        return;
      }
      setCurrentTime(a.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      switch (e.key) {
        case " ": {
          if (e.repeat) return;
          if (isInteractiveTarget(e.target)) return;
          if (e.target instanceof HTMLElement && e.target.closest('[role="log"]')) return;
          e.preventDefault();
          toggle();
          break;
        }
        case "j":
        case "J":
          skip(-10);
          break;
        case "l":
        case "L":
          skip(10);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, skip]);

  const activeIndex = useMemo(() => findActiveIndex(segments, currentTime), [segments, currentTime]);

  const value = useMemo<PlayerApi>(
    () => ({
      currentTime,
      duration,
      isPlaying,
      rate,
      activeIndex,
      ready,
      error,
      toggle,
      play,
      pause,
      seek,
      skip,
      setRate,
      playRange,
    }),
    [currentTime, duration, isPlaying, rate, activeIndex, ready, error, toggle, play, pause, seek, skip, setRate, playRange],
  );

  return (
    <PlayerContext.Provider value={value}>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      {children}
    </PlayerContext.Provider>
  );
}
