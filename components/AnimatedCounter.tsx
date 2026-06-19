"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

type Props = {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
};

export default function AnimatedCounter({
  value,
  decimals = 1,
  suffix = "",
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 25, stiffness: 150 });
  const rounded = useTransform(spring, (v) => v.toFixed(decimals));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return (
    <span className={className}>
      <motion.span ref={ref}>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
