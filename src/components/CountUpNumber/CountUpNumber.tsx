// CountUpNumber — Animated number display with scroll-triggered count-up
// Renders a large, animated number that counts from 0 to the target value
// when it enters the viewport, with configurable suffix/prefix and styling
import { useCountUp } from '../../hooks/useCountUp';

interface CountUpNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  delay?: number;
  className?: string;
  textClassName?: string;
  labelClassName?: string;
  label?: string;
  startOnMount?: boolean;
}

export default function CountUpNumber({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  duration = 1800,
  delay = 0,
  className = '',
  textClassName = 'text-lg font-bold tabular-nums',
  labelClassName = 'text-[10px] text-slate-500 mt-0.5',
  label,
  startOnMount = false,
}: CountUpNumberProps) {
  const { count, ref, hasStarted } = useCountUp({
    end: value,
    duration,
    delay,
    decimals,
    startOnMount,
  });

  return (
    <div ref={ref} className={className}>
      <span
        className={`${textClassName} inline-block transition-transform duration-300 ${
          hasStarted ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {prefix}{count.toLocaleString()}{suffix}
      </span>
      {label && <div className={labelClassName}>{label}</div>}
    </div>
  );
}
