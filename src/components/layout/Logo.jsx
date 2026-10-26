import { Text, View } from 'react-native'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function Logo({ showWordmark = true, size = 36 }) {
  const { c, fonts } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 116 116"
        accessibilityLabel="Zen-I Assistant"
      >
        <Rect width={116} height={116} rx={28} fill="#0B1220" />
        <G transform="translate(8.7 8.7) scale(0.85)">
          <Path
            d="M25 71H45M25 71.5H45"
            stroke="#0B1220"
          />
          <Path
            d="M75 36H95"
            stroke="#0B1220"
          />
          <Rect x={82} y={61} width={7} height={6} rx={3} fill="#0B1220" />
          <Circle cx={81} cy={57} r={4} fill="#F59E0B" />
          <Rect x={79} y={63} width={4} height={10} rx={2} fill="white" />
          <Path
            d="M79.7432 29C81.6936 29 83.4571 30.1607 84.2299 31.9528C85.0026 33.7448 84.637 35.8249 83.2993 37.2451L46.5802 76.2192H83.1134C85.8123 76.2192 88 78.4086 88 81.1096C88 83.8106 85.8123 86 83.1134 86H35.2568C33.3064 86 31.5429 84.8393 30.7701 83.0472C29.9974 81.2551 30.3636 79.1751 31.7015 77.7549L68.4198 38.7808H31.8866C29.1877 38.7808 27 36.5914 27 33.8904C27 31.1897 29.1877 29 31.8866 29H79.7432Z"
            fill="#E6EDFA"
          />
          <Path d="M66 39H86M66 40H86" stroke="#0B1220" />
          <Path d="M31 76H51M31 75H51" stroke="#0B1220" />
          <Rect x={26} y={29} width={59} height={10} rx={5} fill="#1E40AF" />
          <Rect x={78} y={59} width={6} height={5} rx={2.5} fill="#0B1220" />
        </G>
      </Svg>
      {showWordmark ? (
        <View>
          <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: 14, color: c.foreground }}>
            Zen-I
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: c.mutedForeground }}>
            Assistant
          </Text>
        </View>
      ) : null}
    </View>
  )
}
