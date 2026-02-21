// components/animations/FadeIn.tsx
// Staggered fade-in for hero section elements.
// Parent uses staggerChildren; each child staggers by 0.12s.

'use client';

import { motion, Variants } from 'framer-motion';

// Container — orchestrates child stagger
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

// Individual item — opacity + subtle translateY
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

interface FadeInContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface FadeInItemProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function FadeInContainer({ children, className, style }: FadeInContainerProps) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function FadeInItem({ children, className, style }: FadeInItemProps) {
  return (
    <motion.div className={className} style={style} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
