import { useAppReducedMotion } from "@/appearance/reduced-motion";

const SIZE = 12;
const CENTER = SIZE / 2;
const RADIUS = 5;
const STROKE_WIDTH = 1.75;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Matches the context meter's ring track.
const TRACK_OPACITY = 0.3;
const EASE = "0.4 0 0.2 1";

/**
 * A small ring whose arc fills clockwise from the top, then runs back empty. Reduced motion
 * shows a still quarter arc.
 */
export function DesktopProgressRing({ color }: { color?: string }) {
  const reducedMotion = useAppReducedMotion();
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        opacity={TRACK_OPACITY}
      />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={reducedMotion ? CIRCUMFERENCE * 0.75 : CIRCUMFERENCE}
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
      >
        {reducedMotion ? null : (
          <animate
            attributeName="stroke-dashoffset"
            values={`${CIRCUMFERENCE};0;${CIRCUMFERENCE}`}
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines={`${EASE};${EASE}`}
            dur="3.2s"
            repeatCount="indefinite"
          />
        )}
      </circle>
    </svg>
  );
}
