import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";

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
  const [currentDisplay, setCurrentDisplay] = useState<{ name: string; emoji?: string | null } | null>(null);
  const [stopped, setStopped] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isSpinning) {
      setStopped(false);
      setCurrentDisplay(null);

      const items = allRestaurants.length > 0
        ? allRestaurants
        : [{ id: 0, name: "?", emoji: "🎰" }];

      intervalRef.current = setInterval(() => {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        setCurrentDisplay(randomItem);
      }, 90);

      // Stop after delay
      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setStopped(true);
      }, delay);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isSpinning, delay, allRestaurants]);

  return (
    <div className="relative w-full h-44 sm:h-52 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card to-secondary/30 shadow-inner">
      {/* Top gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />
      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none" />

      {/* Center highlight line */}
      <div className="absolute top-1/2 left-2 right-2 -translate-y-1/2 h-16 rounded-xl border-2 border-[oklch(0.75_0.15_75/0.5)] bg-[oklch(0.75_0.15_75/0.05)] z-20 pointer-events-none" />

      <div className="flex flex-col items-center justify-center h-full">
        <AnimatePresence mode="wait">
          {!stopped && currentDisplay ? (
            <motion.div
              key={`spin-${currentDisplay.name}-${Math.random()}`}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ duration: 0.06 }}
              className="text-center px-3"
            >
              {currentDisplay.emoji && (
                <span className="text-3xl sm:text-4xl block mb-1">{currentDisplay.emoji}</span>
              )}
              <span className="text-sm sm:text-base font-medium text-foreground/70 line-clamp-1">
                {currentDisplay.name}
              </span>
            </motion.div>
          ) : result ? (
            <motion.div
              key={`result-${result.id}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="text-center px-3"
            >
              {result.emoji && (
                <motion.span
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
                  className="text-4xl sm:text-5xl block mb-2"
                >
                  {result.emoji}
                </motion.span>
              )}
              <p className="text-lg sm:text-xl font-bold text-foreground" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                {result.name}
              </p>
              {result.category && (
                <p className="text-xs text-muted-foreground mt-1">
                  {result.category}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <UtensilsCrossed className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground/60 mt-2">等待抽取</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function SlotMachine({ results, isSpinning, allRestaurants }: SlotMachineProps) {
  const delays = [1500, 2200, 3000]; // Staggered stop times

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-5">
      {[0, 1, 2].map((index) => (
        <SlotColumn
          key={index}
          result={results ? results[index] : null}
          isSpinning={isSpinning}
          delay={delays[index]}
          allRestaurants={allRestaurants}
        />
      ))}
    </div>
  );
}
