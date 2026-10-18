import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { CaretRight, Database, Info } from 'phosphor-react-native'
import { Pressable, Text, View } from 'react-native'
import Screen from '../components/layout/Screen.jsx'
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx'
import ThemeToggle from '../components/ui/ThemeToggle.jsx'
import { useOnboarding } from '../lib/onboarding.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

function Row({ label, value, onPress, right }) {
  const { c, fonts } = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? c.overline : 'transparent',
      })}
    >
      <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: c.foreground }}>
        {label}
      </Text>
      {value ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: c.mutedForeground }}>
          {value}
        </Text>
      ) : null}
      {right ?? <CaretRight size={14} weight="bold" color={c.mutedForeground} />}
    </Pressable>
  )
}

export default function Settings() {
  const { c, fonts, mode } = useTheme()
  const { reset } = useOnboarding()
  const router = useRouter()

  const replay = async () => {
    Haptics.selectionAsync().catch(() => {})
    await reset()
    router.replace('/welcome')
  }

  return (
    <Screen title="Settings" subtitle="Appearance, intro and data" left="back">
      <Card>
        <CardHeader title="Appearance" subtitle="Light or dark" />
        <Row
          label="Theme"
          value={mode === 'light' ? 'Light' : 'Dark'}
          onPress={undefined}
          right={<ThemeToggle />}
        />
      </Card>

      <Card>
        <CardHeader title="Getting started" subtitle="Replay the walkthrough" />
        <Row label="Replay intro" onPress={replay} />
      </Card>

      <Card>
        <CardHeader title="Data" subtitle="Where these numbers come from" />
        <CardBody>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Database size={14} weight="bold" color={c.mutedForeground} />
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: c.mutedForeground }}>
              Preview data · v0.1
            </Text>
          </View>
          <Text
            style={{ fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: c.mutedForeground }}
          >
            Every figure in the app is sample data generated locally. Nothing is uploaded and
            nothing leaves your device.
          </Text>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="About" subtitle="Zen-I Assistant" />
        <CardBody>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Info size={14} weight="bold" color={c.mutedForeground} />
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: c.mutedForeground }}>
              Local preview build · 1.0.0
            </Text>
          </View>
          <Text
            style={{ fontFamily: fonts.sans, fontSize: 11, lineHeight: 17, color: c.mutedForeground }}
          >
            A personal assistant for notes, finances, planning and learning. The backend phase
            connects real records and turns the previews into live data.
          </Text>
        </CardBody>
      </Card>
    </Screen>
  )
}
