import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface SlotResult {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  emoji?: string | null;
}

interface SlotMachineProps {
  results: SlotResult[] | null;
  isSpinning: boolean;
  allRestaurants: { id: number; name: string; emoji?: string | null }[];
}

type SlotDisplayItem = {
  id?: number;
  name: string;
  emoji?: string | null;
};

const SLOT_COLUMN_DELAYS = [1500, 2300, 3200] as const;
const SLOT_REVEAL_DELAY_MS = 180;
const SLOT_BASE_TICK_MS = 70;
const SLOT_MAX_TICK_MS = 220;

export const SLOT_MACHINE_COMPLETE_DELAY_MS =
  Math.max(...SLOT_COLUMN_DELAYS) + SLOT_REVEAL_DELAY_MS + 120;

function SlotColumn({
  result,
  isSpinning,
  delay,
  allRestaurants,
}: {
  result: SlotResult | null;
  isSpinning: boolean;
  delay: number;
  allRestaurants: { id: number; name: string; emoji?: string | null }[];
}) {
  const shouldReduceMotion = useReducedMotion();
  const [displayItem, setDisplayItem] = useState<SlotDisplayItem | null>(null);
  const [stopped, setStopped] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const tickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultRef = useRef<SlotResult | null>(result);
  const spinSessionRef = useRef(0);
  const tickRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (tickTimeoutRef.current) {
      clearTimeout(tickTimeoutRef.current);
      tickTimeoutRef.current = null;
    }
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
  }, []);

  const getRandomItem = useCallback((): SlotDisplayItem => {
    const items =
      allRestaurants.length > 0
        ? allRestaurants
        : [{ id: 0, name: "?", emoji: "🎰" }];
    return items[Math.floor(Math.random() * items.length)];
  }, [allRestaurants]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    spinSessionRef.current += 1;
    const sessionId = spinSessionRef.current;
    clearTimers();

    if (!isSpinning) {
      setStopped(true);
      if (!resultRef.current) {
        setDisplayItem(null);
        setShowResult(false);
      }
      return clearTimers;
    }

    setStopped(false);
    setShowResult(false);
    tickRef.current = 0;
    setDisplayItem(getRandomItem());

    const startTime = Date.now();
    const spinDuration = shouldReduceMotion ? Math.min(delay, 420) : delay;

    const tick = () => {
      if (spinSessionRef.current !== sessionId) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      const finalResult = resultRef.current;

      if (progress >= 1 && finalResult) {
        tickTimeoutRef.current = null;
        setDisplayItem(finalResult);
        setStopped(true);
        revealTimeoutRef.current = setTimeout(
          () => {
            if (spinSessionRef.current === sessionId && resultRef.current) {
              setShowResult(true);
            }
          },
          shouldReduceMotion ? 0 : SLOT_REVEAL_DELAY_MS
        );
        return;
      }

      const currentInterval = shouldReduceMotion
        ? SLOT_REVEAL_DELAY_MS
        : SLOT_BASE_TICK_MS +
          (SLOT_MAX_TICK_MS - SLOT_BASE_TICK_MS) * Math.pow(progress, 2);

      tickRef.current += 1;
      setDisplayItem(getRandomItem());
      tickTimeoutRef.current = setTimeout(tick, currentInterval);
    };

    tickTimeoutRef.current = setTimeout(
      tick,
      shouldReduceMotion ? 120 : SLOT_BASE_TICK_MS
    );

    return clearTimers;
  }, [clearTimers, delay, getRandomItem, isSpinning, shouldReduceMotion]);

  const activeItem = showResult && result ? result : displayItem;
  const rollingKey =
    stopped && activeItem
      ? `hold-${activeItem.id ?? activeItem.name}`
      : `spin-${tickRef.current}`;

  return (
    <div className="relative h-36 w-full overflow-hidden rounded-xl border border-[oklch(0.69_0.16_155/0.55)] bg-[oklch(0.93_0.025_145)] shadow-[inset_0_0_0_1px_oklch(1_0_0/0.78),inset_0_0_26px_oklch(0.61_0.18_158/0.3),0_0_22px_oklch(0.6_0.16_158/0.25)] sm:h-52 sm:rounded-2xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-white/90 via-white/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-[oklch(0.82_0.04_150/0.75)] via-white/25 to-transparent" />
      <div className="pointer-events-none absolute inset-x-1 top-2 bottom-2 z-20 rounded-lg border border-white/75 shadow-[inset_0_0_18px_oklch(0.35_0.1_160/0.18)] sm:inset-x-2 sm:top-3 sm:bottom-3 sm:rounded-xl" />
      <div className="pointer-events-none absolute inset-y-4 left-0 w-px bg-white/80" />
      <div className="pointer-events-none absolute inset-y-4 right-0 w-px bg-[oklch(0.35_0.08_160/0.24)]" />

      <div className="relative z-30 flex h-full w-full flex-col items-center justify-center px-1.5 py-4 text-center sm:px-3">
        <AnimatePresence mode="wait">
          {showResult && result ? (
            <motion.div
              key={`result-${result.id}`}
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { scale: 0.86, opacity: 0, y: 10 }
              }
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0.12 : 0.48,
                ease: [0.23, 1, 0.32, 1],
              }}
              className="flex min-w-0 flex-col items-center"
            >
              <motion.span
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { scale: 0.7, rotate: -7 }
                }
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0.12 : 0.5,
                  ease: [0.23, 1, 0.32, 1],
                }}
                className="mb-2 block text-[2rem] leading-none drop-shadow-[0_4px_10px_oklch(0.25_0.06_150/0.18)] sm:mb-3 sm:text-5xl"
              >
                {result.emoji || "🍽️"}
              </motion.span>
              <motion.p
                initial={
                  shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 5 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.08,
                  duration: 0.22,
                }}
                className="line-clamp-2 max-w-full text-[0.72rem] font-extrabold leading-tight text-[oklch(0.2_0.045_155)] [overflow-wrap:anywhere] sm:text-base"
              >
                {result.name}
              </motion.p>
            </motion.div>
          ) : activeItem ? (
            <motion.div
              key={rollingKey}
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { y: -34, opacity: 0, scale: 0.9 }
              }
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { y: 34, opacity: 0, scale: 0.92 }
              }
              transition={{
                duration: shouldReduceMotion ? 0.08 : 0.09,
                ease: "easeOut",
              }}
              className="flex min-w-0 flex-col items-center"
            >
              <span className="mb-2 block text-[1.9rem] leading-none opacity-95 drop-shadow-[0_3px_8px_oklch(0.25_0.06_150/0.14)] sm:text-[2.75rem]">
                {activeItem.emoji || "🍽️"}
              </span>
              <span className="line-clamp-2 max-w-full text-[0.66rem] font-semibold leading-tight text-[oklch(0.26_0.045_155/0.78)] [overflow-wrap:anywhere] sm:text-sm">
                {activeItem.name}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center"
            >
              <span className="mb-2 block text-[1.9rem] leading-none opacity-30 sm:text-[2.75rem]">
                🎰
              </span>
              <span className="text-xs font-semibold tracking-[0.18em] text-[oklch(0.3_0.04_155/0.35)]">
                · · ·
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function SlotMachine({
  results,
  isSpinning,
  allRestaurants,
}: SlotMachineProps) {
  return (
    <div
      data-testid="slot-machine"
      className="relative overflow-visible rounded-[1.35rem] bg-[oklch(0.2_0.075_165)] p-2.5 shadow-[0_18px_34px_oklch(0.16_0.05_150/0.25),inset_0_1px_0_oklch(1_0_0/0.18),inset_0_-12px_26px_oklch(0.08_0.045_165/0.32)] sm:rounded-[1.6rem] sm:p-4"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute -inset-x-2 -top-4 h-10 rounded-full bg-[oklch(0.72_0.18_155/0.18)] blur-xl" />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,oklch(1_0_0/0.16),transparent_32%,oklch(0.04_0.02_160/0.22)_100%)]" />
      <div className="pointer-events-none absolute inset-x-4 top-2 h-px bg-white/20 sm:inset-x-6" />
      <div className="pointer-events-none absolute inset-x-5 bottom-2 h-px bg-black/25 sm:inset-x-8" />
      <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 grid-cols-2 gap-1 sm:grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <span
            key={index}
            className="h-1 w-1 rounded-full bg-[oklch(0.82_0.04_155/0.35)] shadow-[0_0_5px_oklch(0.72_0.18_155/0.28)]"
          />
        ))}
      </div>

      <div className="relative grid grid-cols-3 gap-2 sm:gap-4">
        {[0, 1, 2].map(index => (
          <SlotColumn
            key={index}
            result={results ? results[index] : null}
            isSpinning={isSpinning}
            delay={SLOT_COLUMN_DELAYS[index]}
            allRestaurants={allRestaurants}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute -bottom-2 left-9 h-3 w-8 rounded-b-md bg-[oklch(0.16_0.055_165)] shadow-md sm:left-14" />
      <div className="pointer-events-none absolute -bottom-2 right-9 h-3 w-8 rounded-b-md bg-[oklch(0.16_0.055_165)] shadow-md sm:right-14" />
    </div>
  );
}
