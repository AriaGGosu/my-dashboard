import { useState, useEffect, useRef } from "react";

const SCRAMBLE_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`01";

type ScrambleTextProps = {
  text: string;
  className?: string;
  speed?: number;
  repeat?: boolean;
};

export default function ScrambleText({ text, className = "", speed = 0.05, repeat = false }: ScrambleTextProps) {
  const [display, setDisplay] = useState(text);
  const revealedRef = useRef(0);
  const cycleRef = useRef(0);

  useEffect(() => {
    revealedRef.current = 0;
    cycleRef.current = 0;

    const tick = () => {
      const r = revealedRef.current;
      const scrambled = text
        .split("")
        .map((char, i) => {
          if (i < r) return char;
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        })
        .join("");
      setDisplay(scrambled);

      if (r < text.length) {
        revealedRef.current = r + 1;
      } else if (repeat) {
        revealedRef.current = 0;
        cycleRef.current += 1;
      } else {
        return true;
      }
      return false;
    };

    const id = setInterval(() => {
      if (tick()) clearInterval(id);
    }, speed * 1000);

    return () => clearInterval(id);
  }, [text, speed, repeat]);

  return <span className={className}>{display}</span>;
}
