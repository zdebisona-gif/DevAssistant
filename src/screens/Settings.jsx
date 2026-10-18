import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { CaretRight, Database, Info } from '../icons.js'
import { Pressable, Text, View } from 'react-native'
import Screen from '../components/layout/Screen.jsx'
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx'
import ThemeToggle from '../components/ui/ThemeToggle.jsx'
import { useData } from '../data/store.jsx'
import { useOnboarding } from '../lib/onboarding.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

function Row({ label, value, onPress, right }) {
  const { c, fonts, text } = useTheme()
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
      <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}>
        {label}
      </Text>
      {value ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
          {value}
        </Text>
      ) : null}
      {right ?? <CaretRight size={14} weight="bold" color={c.mutedForeground} />}
    </Pressable>
  )
}

function CountRow({ label, count }) {
  const { c, fonts, text } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: text.caption,
          color: c.foreground,
          fontVariant: ['tabular-nums'],
        }}
      >
        {count}
      </Text>
    </View>
  )
}

export default function Settings() {
  const { c, fonts, text } = useTheme()
  const { data, reload } = useData()
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
          value={undefined}
          onPress={undefined}
          right={<ThemeToggle />}
        />
      </Card>

      <Card>
        <CardHeader title="Getting started" subtitle="Replay the walkthrough" />
        <Row label="Replay intro" onPress={replay} />
      </Card>

      <Card>
        <CardHeader
          title="Data"
          subtitle="Live from your Supabase project"
          action={
            <Pressable accessibilityRole="button" onPress={() => reload()} hitSlop={8}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
                Refresh
              </Text>
            </Pressable>
          }
        />
        <CardBody style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Database size={14} weight="bold" color={c.mutedForeground} />
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
              Connected · v0.2
            </Text>
          </View>
          <View style={{ gap: 8 }}>
            <CountRow label="Notes" count={data.notes.length} />
            <CountRow label="Transactions" count={data.transactions.length} />
            <CountRow label="Budgets" count={data.budgets.length} />
            <CountRow label="Plan entries" count={data.planner.length} />
            <CountRow label="Courses" count={data.courses.length} />
            <CountRow label="Study sessions" count={data.sessions.length} />
          </View>
          <Text
            style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.mutedForeground }}
          >
            Records are stored in your Supabase project. Nothing is shared with anyone else.
          </Text>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="About" subtitle="Zen-I Assistant" />
        <CardBody>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Info size={14} weight="bold" color={c.mutedForeground} />
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
              Build 1.0.0
            </Text>
          </View>
          <Text
            style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}
          >
            A personal assistant for notes, finances, planning and learning. Records are live; sign-in
            and record-grounded answers arrive in later phases.
          </Text>
        </CardBody>
      </Card>
    </Screen>
  )
}
