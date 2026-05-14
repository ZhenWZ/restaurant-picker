import { useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export default function StarRating({ value, onChange, readonly = false, size = "md" }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? "cursor-default" : "cursor-pointer"} p-0.5 transition-transform`}
          whileTap={!readonly ? { scale: 0.85 } : undefined}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            className={`${sizeMap[size]} transition-all duration-150 ${
              star <= displayValue
                ? "star-active fill-current"
                : "text-muted-foreground/30"
            }`}
          />
        </motion.button>
      ))}
    </div>
  );
}
