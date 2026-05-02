import React, { useMemo } from 'react';
import { Text } from 'ink';
import { COLORS, NO_COLOR } from './colors.js';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t));
}

interface GradientTextProps {
  children: string;
  colors: string[];
  bold?: boolean;
}

export const GradientText = React.memo(function GradientText({ children, colors, bold }: GradientTextProps) {
  // NO_COLOR: skip the per-character coloring and emit a single plain Text.
  // The character-by-character rendering would still produce correct output
  // visually, but each <Text/> element with empty color still ships ANSI
  // resets that some screen readers narrate noisily.
  if (NO_COLOR) {
    return <Text bold={bold}>{children}</Text>;
  }
  if (colors.length < 2) {
    return <Text color={colors[0]} bold={bold}>{children}</Text>;
  }

  const coloredChars = useMemo(() => {
    const chars = [...children];
    const maxIdx = Math.max(chars.length - 1, 1);

    return chars.map((char, i) => {
      const t = i / maxIdx;
      const segment = t * (colors.length - 1);
      const lower = Math.floor(segment);
      const upper = Math.min(lower + 1, colors.length - 1);
      const frac = segment - lower;
      const color = interpolateColor(colors[lower]!, colors[upper]!, frac);
      return { char, color, key: `${i}-${color}` };
    });
  }, [children, colors]);

  return (
    <>
      {coloredChars.map(({ char, color, key }) => (
        <Text key={key} color={color} bold={bold}>{char}</Text>
      ))}
    </>
  );
});

// DS-003: derive every gradient stop from the COLORS palette so a token edit
// fans out to all gradients. Keeping the export as a plain object preserves
// import sites that read GRADIENTS.gold etc.
export const GRADIENTS = {
  gold:    [COLORS.gold,    COLORS.goldOrange, COLORS.goldDeep],
  sunset:  [COLORS.brand,   COLORS.gold,       COLORS.brand],
  ocean:   [COLORS.info,    COLORS.blue,       COLORS.purple],
  emerald: [COLORS.success, COLORS.teal,       COLORS.info],
  fire:    [COLORS.error,   COLORS.warning,    COLORS.gold],
  version: [COLORS.error,   COLORS.muted,      COLORS.teal],
  pro:     [COLORS.brand,   COLORS.gold,       COLORS.brand],
  darkGold:[COLORS.goldDeep, COLORS.goldDark,  COLORS.goldDeepest],
};
