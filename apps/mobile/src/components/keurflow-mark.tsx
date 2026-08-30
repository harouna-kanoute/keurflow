import { useId } from "react";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

// Direct port of apps/web/src/components/keurflow-mark.tsx — same shapes,
// same gradient, so the two apps use the exact same mark rather than a
// mobile-specific reinterpretation.
//
// The gradient id must be unique per instance: on react-native-web, <Defs>
// render into the real DOM, and a hardcoded id collides the moment two
// marks are mounted at once (e.g. the nav drawer's + the current screen's),
// silently breaking the fill on whichever instance loses the collision.
export function KeurFlowMark({ size = 40 }: { size?: number }) {
  const gradientId = `keurflow-mark-bg-${useId()}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        <LinearGradient id={gradientId} x1="0.15" y1="0" x2="0.85" y2="1">
          <Stop offset="0%" stopColor="#5C35E0" />
          <Stop offset="100%" stopColor="#1D2E86" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={512} height={512} rx={108} ry={108} fill={`url(#${gradientId})`} />
      <Rect x={170} y={120} width={56} height={272} fill="#FFFFFF" />
      <Path d="M226,256 L366,120" stroke="#FFFFFF" strokeWidth={56} strokeLinecap="square" fill="none" />
      <Path d="M226,256 L366,392" stroke="#FFFFFF" strokeWidth={56} strokeLinecap="square" fill="none" />
      <Circle cx={400} cy={304} r={26} fill="#16BEC7" />
    </Svg>
  );
}
