"use client";

/**
 * The cycle ring.
 *
 * `FRONTEND_SPEC.md` §4A specifies the encoding: one node per member arranged in a
 * circle, nodes before the current position filled, the current node filled and
 * ringed, nodes after unfilled. The same encoding is reused in miniature on a
 * circle card (§14A.1) and at full size on the circle detail (§14A.2), so the
 * shape means the same thing everywhere it appears.
 *
 * It takes either live figures or nothing. There is no fixture mode: when a circle
 * has not shipped there are no figures to pass, and §14A.4 forbids inventing any,
 * so the caller renders the diagram with the caption explaining why instead.
 */

import { motion } from "motion/react";
import type { Circle } from "@/lib/types";

/** Props for {@link CircleRing}. */
interface CircleRingProps {
  /** Live figures. Omit to render the shape alone. */
  readonly circle?: Circle;
  /** Diameter in pixels. 200 on the detail screen, 48 on a card. */
  readonly size?: number;
  /** Whether the nodes stagger in on enter. Off for the 48px card version. */
  readonly animate?: boolean;
}

/** Node count when there is no circle. A shape, not a headcount. */
const ILLUSTRATIVE_NODES = 12;

export function CircleRing({ circle, size = 320, animate = true }: CircleRingProps) {
  const total = circle?.cyclesTotal ?? ILLUSTRATIVE_NODES;
  const current = circle?.cycleIndex ?? 4;
  const radius = 46;
  const cx = 50;
  const cy = 50;
  // Node radius scales with the ring so the 48px card version stays legible.
  const nodeRadius = size > 80 ? 3.6 : 2.6;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="block h-auto"
      role={circle === undefined ? "img" : "img"}
      aria-label={
        circle === undefined
          ? "Diagram of a savings circle: members arranged in a ring, rotating through one pot per cycle."
          : `${circle.membersJoined} of ${circle.memberCount} members in ${circle.name}, cycle ${circle.cycleIndex} of ${circle.cyclesTotal}.`
      }
    >
      {circle !== undefined && <title>{circle.name}</title>}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="var(--border-default)"
        strokeWidth="0.6"
      />
      {Array.from({ length: total }, (_, i) => {
        const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
        const done = i < current;
        const isCurrent = i === current;
        return (
          <g key={i}>
            <motion.circle
              cx={cx + Math.cos(angle) * radius}
              cy={cy + Math.sin(angle) * radius}
              r={isCurrent ? nodeRadius * 1.35 : nodeRadius}
              initial={animate ? { opacity: 0, scale: 0.6 } : false}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: animate ? 0.2 + i * 0.06 : 0, ease: "easeOut" }}
              style={{ transformOrigin: `${cx + Math.cos(angle) * radius}px ${cy + Math.sin(angle) * radius}px` }}
              fill={
                done
                  ? "var(--success)"
                  : isCurrent
                    ? "var(--accent)"
                    : "var(--bg-elevated)"
              }
              stroke={isCurrent ? "var(--accent)" : "var(--border-default)"}
              strokeWidth={isCurrent ? 1.2 : 0.6}
              opacity={circle === undefined ? (done ? 0.4 : 1) : 1}
            />
            {isCurrent ? (
              <circle
                cx={cx + Math.cos(angle) * radius}
                cy={cy + Math.sin(angle) * radius}
                r={nodeRadius * 2.1}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="0.6"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
