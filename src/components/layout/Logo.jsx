import { Image, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const logoSource = require('../../../assets/zeni-logo.svg')

export default function Logo({ showWordmark = true, size = 36 }) {
  const { c, fonts } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Image
        source={logoSource}
        style={{ width: size, height: size, borderRadius: size * 0.24 }}
        accessibilityLabel="Zen-I Assistant"
        resizeMode="contain"
      />
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
