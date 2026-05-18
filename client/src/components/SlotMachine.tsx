import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const slotNameClassName = "line-clamp-1 text-lg sm:text-xl font-bold text-foreground";

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
  const [displayItems, setDisplayItems] = useState<{ name: string; emoji?: string | null }[]>([]);
  const [stopped, setStopped] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinSessionRef = useRef(0);
  const tickRef = useRef(0);

  const getRandomItem = useCallback(() => {
    const items = allRestaurants.length > 0
      ? allRestaurants
      : [{ id: 0, name: "?", emoji: "🎰" }];
    return items[Math.floor(Math.random() * items.length)];
  }, [allRestaurants]);

  useEffect(() => {
    if (!isSpinning) return;

    spinSessionRef.current += 1;
    const sessionId = spinSessionRef.current;

    setStopped(false);
    setShowResult(false);
    tickRef.current = 0;

    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }

    // Generate initial display items (3 visible in the column)
    setDisplayItems([getRandomItem(), getRandomItem(), getRandomItem()]);

    // Start spinning - gradually slow down near the end
    const startTime = Date.now();
    const spinDuration = delay;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);

      if (progress >= 1) {
        setStopped(true);
        // Small delay before showing final result for dramatic effect
        revealTimeoutRef.current = setTimeout(() => {
          if (spinSessionRef.current === sessionId) {
            setShowResult(true);
          }
        }, 150);
        return;
      }

      // Easing: speed decreases as progress increases
      // Interval goes from 70ms to 200ms
      const baseInterval = 70;
      const maxInterval = 200;
      const currentInterval = baseInterval + (maxInterval - baseInterval) * Math.pow(progress, 2);

      setDisplayItems(prev => {
        const newItems = [...prev];
        newItems.shift();
        newItems.push(getRandomItem());
        return newItems;
      });

      tickRef.current++;
      spinTimeoutRef.current = setTimeout(tick, currentInterval);
    };

    spinTimeoutRef.current = setTimeout(tick, 70);

    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
    };
  }, [isSpinning, delay, getRandomItem]);

  useEffect(() => {
    if (isSpinning) return;

    setStopped(true);
    setShowResult(Boolean(result));
  }, [isSpinning, result]);

  // Current display item (middle of the 3)
  const currentItem = displayItems.length > 1 ? displayItems[1] : displayItems[0];
  const visibleResult = stopped && showResult ? result : null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card to-secondary/20 shadow-inner">
      {/* Slot window with expanded height to include emoji + name */}
      <div className="relative h-48 sm:h-56 flex flex-col items-center justify-center">
        {/* Top gradient overlay */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />
        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none" />

        {/* Center highlight frame - expanded to cover emoji + name area */}
        <div className="absolute inset-x-2 top-4 bottom-4 rounded-xl border-2 border-[oklch(0.75_0.15_75/0.4)] bg-[oklch(0.75_0.15_75/0.03)] z-20 pointer-events-none" />

        {/* Content */}
        <div className="relative z-5 flex flex-col items-center justify-center h-full w-full px-3">
          <AnimatePresence mode="wait">
            {visibleResult ? (
              <motion.div
                key={`result-${visibleResult.id}`}
                initial={{ scale: 0.85, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="text-center"
              >
                <motion.span
                  initial={{ scale: 0.6, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.05 }}
                  className="text-5xl sm:text-6xl block mb-3"
                >
                  {visibleResult.emoji || "🍽️"}
                </motion.span>
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  className={slotNameClassName}
                >
                  {visibleResult.name}
                </motion.p>
              </motion.div>
            ) : !stopped && currentItem ? (
              <motion.div
                key={`spin-${tickRef.current}`}
                initial={{ y: -40, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.08, ease: "easeOut" }}
                className="text-center"
              >
                <span className="text-4xl sm:text-5xl block mb-2">
                  {currentItem.emoji || "🍽️"}
                </span>
                <span className={slotNameClassName}>
                  {currentItem.name}
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <span className="text-4xl sm:text-5xl block mb-2 opacity-30">🎰</span>
                <span className="text-sm text-muted-foreground/40 font-medium">· · ·</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function SlotMachine({ results, isSpinning, allRestaurants }: SlotMachineProps) {
  const delays = [1500, 2300, 3200]; // Staggered stop times

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
