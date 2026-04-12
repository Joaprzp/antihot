import { useState, useEffect } from "react";
import spinners from "unicode-animations";

type SpinnerName = keyof typeof spinners;

type SpinnerProps = {
  name?: SpinnerName;
  className?: string;
};

export function Spinner({ name = "braille", className }: SpinnerProps) {
  const [frame, setFrame] = useState(0);
  const s = spinners[name];

  useEffect(() => {
    const timer = setInterval(
      () => setFrame((f) => (f + 1) % s.frames.length),
      s.interval,
    );
    return () => clearInterval(timer);
  }, [name, s.frames.length, s.interval]);

  return <span className={className}>{s.frames[frame]}</span>;
}
