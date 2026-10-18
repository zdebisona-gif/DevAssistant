import { Text, View } from 'react-native'
import Svg, { Path, Rect } from 'react-native-svg'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function Logo({ showWordmark = true, size = 36 }) {
  const { c, fonts } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        accessibilityLabel="Zen-I Assistant"
      >
        <Rect width={64} height={64} rx={14} fill={c.primary} />
        <Path
          d="M17 17h30L17 40h30"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Rect x={22} y={47} width={25} height={5} rx={2.5} fill="#D97706" />
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
