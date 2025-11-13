import { useState, RefObject } from "react";

export interface ConfettiParticle {
  id: number;
  left: number;
  top: number;
  tx: number;
}

export interface UseConfettiReturn {
  confetti: ConfettiParticle[];
  trigger: (buttonRef: RefObject<HTMLButtonElement | null>) => void;
}

export function useConfetti(): UseConfettiReturn {
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);

  const trigger = (buttonRef: RefObject<HTMLButtonElement | null>) => {
    if (!buttonRef.current) return;

    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    const buttonCenterX = rect.left + rect.width / 2;
    const buttonCenterY = rect.top + rect.height / 2;

    const newConfetti: ConfettiParticle[] = [];
    const confettiCount = 30;

    for (let i = 0; i < confettiCount; i++) {
      const angle = (Math.PI * 2 * i) / confettiCount;
      const spread = 150 + Math.random() * 100;
      const tx = Math.cos(angle) * spread;

      newConfetti.push({
        id: Date.now() + i,
        left: buttonCenterX,
        top: buttonCenterY,
        tx: tx,
      });
    }

    setConfetti(newConfetti);

    // Clear confetti after animation
    setTimeout(() => {
      setConfetti([]);
    }, 1500);
  };

  return {
    confetti,
    trigger,
  };
}
