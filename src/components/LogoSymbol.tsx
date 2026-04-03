import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface LogoSymbolProps {
  size?: number;
  opacity?: number;
}

export function LogoSymbol({ size = 80, opacity = 1 }: LogoSymbolProps) {
  return (
    <View style={{ width: size, height: size, opacity }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#3b82f6" />
            <Stop offset="0.5" stopColor="#0ea5c9" />
            <Stop offset="1" stopColor="#1a9e5c" />
          </LinearGradient>
        </Defs>

        {/* Herz-Umriss */}
        <Path
          d="M50 85 C50 85 15 62 15 38 C15 26 24 18 35 18 C41 18 47 21 50 26 C53 21 59 18 65 18 C76 18 85 26 85 38 C85 62 50 85 50 85 Z"
          fill="none"
          stroke="url(#grad)"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Inneres Herz (kleiner, versetzt) */}
        <Path
          d="M50 75 C50 75 22 56 22 38 C22 30 28 24 36 24 C41 24 46 27 50 32 C54 27 59 24 64 24 C72 24 78 30 78 38 C78 56 50 75 50 75 Z"
          fill="none"
          stroke="url(#grad)"
          strokeWidth="2"
          strokeLinejoin="round"
          opacity={0.5}
        />

        {/* Leiterbahn 1 — kurz */}
        <Path
          d="M34 52 L34 42 L42 42"
          fill="none"
          stroke="url(#grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Leiterbahn 2 — mittel */}
        <Path
          d="M34 58 L34 36 L50 36"
          fill="none"
          stroke="url(#grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Leiterbahn 3 — lang */}
        <Path
          d="M34 64 L34 30 L58 30"
          fill="none"
          stroke="url(#grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Endpunkte (Circles) */}
        <Circle cx="42" cy="42" r="2.5" fill="url(#grad)" />
        <Circle cx="50" cy="36" r="2.5" fill="url(#grad)" />
        <Circle cx="58" cy="30" r="2.5" fill="url(#grad)" />
      </Svg>
    </View>
  );
}