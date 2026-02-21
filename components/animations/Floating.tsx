// components/animations/Floating.tsx
// Infinite subtle floating animation for premium card feel.
// y: 0 → -6px → 0, 4s loop, easeInOut

'use client';

import { motion } from 'framer-motion';

interface FloatingProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Floating({ children, className, style }: FloatingProps) {
  return (
    <motion.div
      className={className}
      style={{ ...style, willChange: 'transform' }}
      animate={{ y: -6, scale: 1.01 }}
      transition={{
        duration: 3,
        ease: [0.45, 0, 0.55, 1],
        repeat: Infinity,
        repeatType: 'reverse',
      }}
    >
      {children}
    </motion.div>
  );
}
