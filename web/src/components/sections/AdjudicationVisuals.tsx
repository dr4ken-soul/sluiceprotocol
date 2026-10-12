'use client';

/**
 * The four coded SVG visuals for the adjudication section.
 *
 * §12.2 requires these to be code rather than sourced artwork: no stock
 * photography, and no screenshot of a product that does not exist. Stroke 1.5,
 * `currentColor`, accent on the active branch only, and every SVG carries
 * `role="img"` with an aria-label describing the flow.
 */

interface VisualProps {
  className?: string;
}

/** Tab 1: a question card with its verifier, deadline and machine-checkable badge. */
export function QuestionVisual({ className }: VisualProps) {
  return (
    <svg
      role="img"
      aria-label="A milestone question card showing the question, the named verifier, the deadline and a machine-checkable badge."
      viewBox="0 0 420 300"
      className={className ?? "h-full w-full"}
      fill="none"
    >
      <rect
        x="1"
        y="1"
        width="418"
        height="298"
        rx="12"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
        fill="var(--bg-primary)"
      />

      <text x="28" y="42" fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="10">
        LCC-01-T2
      </text>

      <text
        x="28"
        y="76"
        fill="var(--text-primary)"
        fontFamily="var(--font-body)"
        fontSize="13"
      >
        Did the fleet complete 480 contracted
      </text>
      <text
        x="28"
        y="96"
        fill="var(--text-primary)"
        fontFamily="var(--font-body)"
        fontSize="13"
      >
        deliveries in the quarter?
      </text>

      <path d="M28 122h364" stroke="var(--border-subtle)" strokeWidth="1.5" />

      <text x="28" y="150" fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="10">
        VERIFIER
      </text>
      <text x="28" y="170" fill="var(--text-secondary)" fontFamily="var(--font-body)" fontSize="12">
        Atlas Assurance Partners
      </text>

      <text x="240" y="150" fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="10">
        DEADLINE
      </text>
      <text x="240" y="170" fill="var(--text-secondary)" fontFamily="var(--font-mono)" fontSize="12">
        31 Mar 2027
      </text>

      <rect
        x="28"
        y="198"
        width="172"
        height="26"
        rx="13"
        stroke="var(--border-default)"
        strokeWidth="1.5"
        fill="var(--accent-glow)"
      />
      <circle cx="46" cy="211" r="4" fill="var(--accent)" />
      <text
        x="58"
        y="215"
        fill="var(--accent-text)"
        fontFamily="var(--font-mono)"
        fontSize="10"
      >
        MACHINE-CHECKABLE
      </text>

      <path d="M28 250h150" stroke="var(--border-subtle)" strokeWidth="1.5" />
      <path d="M28 258h90" stroke="var(--border-subtle)" strokeWidth="1.5" />
    </svg>
  );
}

/** Tab 2: an order panel with YES and NO in cents, a depth ladder and a live mid. */
export function MarketVisual({ className }: VisualProps) {
  return (
    <svg
      role="img"
      aria-label="A milestone order panel with YES at 74 cents and NO at 26 cents, a depth ladder and a live mid price."
      viewBox="0 0 420 300"
      className={className ?? "h-full w-full"}
      fill="none"
    >
      <rect
        x="1"
        y="1"
        width="418"
        height="298"
        rx="12"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
        fill="var(--bg-primary)"
      />

      {/* YES side, the active branch, so the accent sits here. */}
      <text x="28" y="44" fill="var(--accent-text)" fontFamily="var(--font-mono)" fontSize="11">
        YES
      </text>
      <text
        x="28"
        y="84"
        fill="var(--accent-text)"
        fontFamily="var(--font-display)"
        fontSize="38"
        fontWeight="800"
      >
        74¢
      </text>

      <path d="M210 30v130" stroke="var(--border-default)" strokeWidth="1.5" />

      <text x="238" y="44" fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="11">
        NO
      </text>
      <text
        x="238"
        y="84"
        fill="var(--text-muted)"
        fontFamily="var(--font-display)"
        fontSize="38"
        fontWeight="800"
      >
        26¢
      </text>

      {/* The mid-price bar, the same probability treatment as the hero card. */}
      <rect x="28" y="112" width="364" height="6" rx="3" fill="var(--bg-elevated)" />
      <rect x="28" y="112" width="269" height="6" rx="3" fill="var(--accent)" />

      <text x="28" y="146" fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="10">
        DEPTH LADDER
      </text>

      {[0, 1, 2, 3, 4].map((index) => {
        const width = 150 - index * 24;
        return (
          <g key={index}>
            <path
              d={`M28 ${172 + index * 22}h${width}`}
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeOpacity={0.75 - index * 0.13}
            />
            <text
              x={36 + width}
              y={176 + index * 22}
              fill="var(--text-muted)"
              fontFamily="var(--font-mono)"
              fontSize="9"
            >
              {76 - index * 4}¢
            </text>
          </g>
        );
      })}

      <circle cx="392" cy="272" r="3" fill="var(--success)" />
      <text x="300" y="276" fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="10">
        LIVE MID
      </text>
    </svg>
  );
}

/** Tab 3: the resolution timeline, including the default path when nothing reports. */
export function ResolutionVisual({ className }: VisualProps) {
  return (
    <svg
      role="img"
      aria-label="A resolution timeline running from deadline to verifier report to resolution, with a second branch showing the default no path when no report arrives."
      viewBox="0 0 420 300"
      className={className ?? "h-full w-full"}
      fill="none"
    >
      <rect
        x="1"
        y="1"
        width="418"
        height="298"
        rx="12"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
        fill="var(--bg-primary)"
      />

      {/*
        The spine, and the three nodes on it.

        Labels sit ABOVE the line, not below. They used to sit below at a fixed
        x - 34, which was wrong twice over: the offset assumed every label was the
        same width, so "Grace ends" sat under the node but "Resolution" sat far to
        its left, and both branches leave this node heading downward, so a label
        underneath it was always going to land on a curve. Above the spine is the
        one region of the diagram nothing is drawn in.
      */}
      <path d="M40 80h330" stroke="var(--border-subtle)" strokeWidth="1.5" />

      {[
        { x: 60, label: "Deadline", accent: false },
        { x: 190, label: "Grace ends", accent: false },
        { x: 320, label: "Resolution", accent: true },
      ].map((node) => (
        <g key={node.label}>
          <circle
            cx={node.x}
            cy="80"
            r="5"
            fill={node.accent ? "var(--accent)" : "var(--bg-elevated)"}
            stroke={node.accent ? "var(--accent)" : "var(--border-default)"}
            strokeWidth="1.5"
          />
          <text
            x={node.x}
            y="62"
            textAnchor="middle"
            fill="var(--text-muted)"
            fontFamily="var(--font-mono)"
            fontSize="9"
          >
            {node.label}
          </text>
        </g>
      ))}

      {/*
        The reported branch. The accent sits on this path only, and it flows.

        `strokeDasharray` is set so there is something for the dash offset to move
        along. Without a dash pattern an offset animation is invisible, because the
        stroke is solid and re-positioning an invisible gap changes nothing.
      */}
      <path
        d="M190 80c0 44 40 44 90 44h60"
        className="sluice-flow"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        strokeLinecap="round"
      />
      <text
        x="340"
        y="104"
        textAnchor="middle"
        fill="var(--accent-text)"
        fontFamily="var(--font-mono)"
        fontSize="10"
      >
        YES, RELEASES
      </text>

      {/*
        The default branch, which is what silence produces. Dashed and slow, and it
        travels the same direction, so the diagram reads as one timeline with two
        endings rather than as two unrelated shapes.
      */}
      <path
        d="M190 80c0 74 40 112 90 112h110"
        className="sluice-flow sluice-flow--slow"
        stroke="var(--text-muted)"
        strokeWidth="1.5"
        strokeDasharray="3 7"
        strokeLinecap="round"
      />
      <text
        x="286"
        y="214"
        textAnchor="middle"
        fill="var(--text-muted)"
        fontFamily="var(--font-mono)"
        fontSize="10"
      >
        SILENCE, NO, REDEEMS
      </text>

      <rect
        x="28"
        y="246"
        width="364"
        height="30"
        rx="8"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
        fill="var(--bg-surface)"
      />
      <text
        x="44"
        y="265"
        fill="var(--text-secondary)"
        fontFamily="var(--font-body)"
        fontSize="11"
      >
        Silence is not ambiguity.
      </text>
    </svg>
  );
}

/** Tab 4: the settlement split, yes to release, no to redemption. */
export function SettlementVisual({ className }: VisualProps) {
  return (
    <svg
      role="img"
      aria-label="A settlement split diagram. A yes outcome routes to the release schedule and a no outcome routes to the redemption vault for pro rata claims."
      viewBox="0 0 420 300"
      className={className ?? "h-full w-full"}
      fill="none"
    >
      <rect
        x="1"
        y="1"
        width="418"
        height="298"
        rx="12"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
        fill="var(--bg-primary)"
      />

      <rect
        x="150"
        y="30"
        width="120"
        height="42"
        rx="8"
        stroke="var(--border-default)"
        strokeWidth="1.5"
        fill="var(--bg-surface)"
      />
      <text
        x="210"
        y="55"
        textAnchor="middle"
        fill="var(--text-primary)"
        fontFamily="var(--font-mono)"
        fontSize="11"
      >
        MILESTONE
      </text>

      <path d="M210 72v42" stroke="var(--border-subtle)" strokeWidth="1.5" />
      <path d="M210 114h-110M210 114h110" stroke="var(--border-subtle)" strokeWidth="1.5" />

      {/* Yes branch. The accent is on this path only, per the asset brief. */}
      <path d="M100 114v34" stroke="var(--accent)" strokeWidth="1.5" />
      <rect
        x="30"
        y="148"
        width="140"
        height="56"
        rx="8"
        stroke="var(--accent)"
        strokeWidth="1.5"
        fill="var(--accent-glow)"
      />
      <text x="100" y="174" textAnchor="middle" fill="var(--accent-text)" fontFamily="var(--font-mono)" fontSize="10">
        YES
      </text>
      <text x="100" y="192" textAnchor="middle" fill="var(--text-secondary)" fontFamily="var(--font-body)" fontSize="11">
        Tranche releases
      </text>

      {/* No branch. */}
      <path d="M320 114v34" stroke="var(--text-muted)" strokeWidth="1.5" />
      <rect
        x="250"
        y="148"
        width="140"
        height="56"
        rx="8"
        stroke="var(--border-default)"
        strokeWidth="1.5"
        fill="var(--bg-surface)"
      />
      <text x="320" y="174" textAnchor="middle" fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="10">
        NO
      </text>
      <text x="320" y="192" textAnchor="middle" fill="var(--text-secondary)" fontFamily="var(--font-body)" fontSize="11">
        Holders claim
      </text>

      <path d="M30 228h360" stroke="var(--border-subtle)" strokeWidth="1.5" />
      <text x="30" y="256" fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="10">
        PRO RATA, AGAINST WHAT IS HELD
      </text>
      <text x="30" y="276" fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="10">
        NO NEGOTIATION, NO RECOVERY
      </text>
    </svg>
  );
}
