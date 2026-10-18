import { useRouter } from 'expo-router'
import {
  ArrowLeft,
  ArrowRight,
  ChartLineUp,
  CurrencyCircleDollar,
  Notebook,
  Sparkle,
  SquaresFour,
  Target,
} from '../icons.js'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Logo from '../components/layout/Logo.jsx'
import Button from '../components/ui/Button.jsx'
import { useOnboarding } from '../lib/onboarding.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

function ContextVisual() {
  const { c, fonts, radius, text } = useTheme()
  const rows = [
    { icon: Notebook, label: 'Notes', value: '47', tone: c.primaryFg },
    { icon: CurrencyCircleDollar, label: 'Money', value: '₱2,225', tone: c.primaryFg },
    { icon: ChartLineUp, label: 'Learning', value: '4.5h', tone: c.accentText },
    { icon: Target, label: 'Goals', value: '6', tone: c.primaryFg },
  ]
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {rows.map(({ icon: Icon, label, value, tone }) => (
        <View
          key={label}
          style={{
            flexGrow: 1,
            flexBasis: '47%',
            gap: 6,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
            backgroundColor: c.card,
            padding: 14,
          }}
        >
          <Icon size={18} weight="bold" color={tone} />
          <Text
            style={{
              fontFamily: fonts.monoSemiBold,
              fontSize: text.title,
              color: c.foreground,
              fontVariant: ['tabular-nums'],
            }}
          >
            {value}
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: text.micro,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: c.mutedForeground,
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function AskVisual() {
  const { c, fonts, radius, text } = useTheme()
  const bars = [
    { label: 'Food & Dining', width: '72%', tone: c.primary },
    { label: 'Shopping', width: '48%', tone: c.accent },
    { label: 'Transport', width: '26%', tone: c.primaryFg },
  ]
  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: 'flex-end' }}>
        <View
          style={{
            maxWidth: '90%',
            borderRadius: radius.lg,
            borderBottomRightRadius: radius.sm,
            backgroundColor: c.primary,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontFamily: fonts.sans, fontSize: text.label, color: c.onPrimary }}>
            How much did I spend on food this month?
          </Text>
        </View>
      </View>
      <View
        style={{
          gap: 12,
          borderRadius: radius.lg,
          borderBottomLeftRadius: radius.sm,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          backgroundColor: c.card,
          padding: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Sparkle size={15} weight="duotone" color={c.primaryFg} />
          <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: text.caption, color: c.foreground }}>
            Zen-I
          </Text>
        </View>
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
          ₱705 across 11 transactions — 17% under budget.
        </Text>
        <View style={{ gap: 10 }}>
          {bars.map((bar) => (
            <View key={bar.label} style={{ gap: 4 }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
                {bar.label}
              </Text>
              <View style={{ height: 6, borderRadius: 999, backgroundColor: c.muted }}>
                <View
                  style={{
                    height: '100%',
                    width: bar.width,
                    borderRadius: 999,
                    backgroundColor: bar.tone,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

function GoalsVisual() {
  const { c, fonts, radius, text } = useTheme()
  const goals = [
    { label: 'Monthly budget', pct: 77, tone: c.primary },
    { label: 'Learning goal', pct: 75, tone: c.primaryFg },
    { label: 'Savings target', pct: 42, tone: c.accent },
  ]
  return (
    <View
      style={{
        gap: 16,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.border,
        backgroundColor: c.card,
        padding: 18,
      }}
    >
      {goals.map((goal) => (
        <View key={goal.label} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.foreground }}>
              {goal.label}
            </Text>
            <Text
              style={{
                fontFamily: fonts.mono,
                fontSize: text.caption,
                color: c.mutedForeground,
                fontVariant: ['tabular-nums'],
              }}
            >
              {goal.pct}%
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: 999, backgroundColor: c.muted }}>
            <View
              style={{
                height: '100%',
                width: `${goal.pct}%`,
                borderRadius: 999,
                backgroundColor: goal.tone,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  )
}

const STEPS = [
  {
    icon: SquaresFour,
    title: 'Everything in one place',
    body: 'Notes, spending, plans and learning progress in a single place — not scattered across five apps.',
    Visual: ContextVisual,
  },
  {
    icon: Sparkle,
    title: 'Ask about your own data',
    body: 'Not a generic chatbot. Ask about your money, notes and schedule, and get answers backed by your records.',
    Visual: AskVisual,
  },
  {
    icon: Target,
    title: 'Track goals, not just chats',
    body: 'Set budgets, study targets and weekly plans — Zen-I watches the numbers and flags what needs attention.',
    Visual: GoalsVisual,
  },
]

export default function Onboarding() {
  const { c, fonts, radius, text } = useTheme()
  const insets = useSafeAreaInsets()
  const { complete } = useOnboarding()
  const router = useRouter()
  const [index, setIndex] = useState(0)

  const step = STEPS[index]
  const isLast = index === STEPS.length - 1
  const Icon = step.icon
  const Visual = step.Visual

  const finish = async () => {
    await complete()
    router.replace('/')
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingBottom: 10,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Logo />
        <Pressable accessibilityRole="button" onPress={finish} hitSlop={8}>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.label, color: c.mutedForeground }}>
            Skip
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 10 }}>
          <View
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: c.primarySoft,
            }}
          >
            <Icon size={22} weight="duotone" color={c.primaryFg} />
          </View>
          <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: text.title, color: c.foreground }}>
            {step.title}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: text.body, lineHeight: 21, color: c.mutedForeground }}>
            {step.body}
          </Text>
        </View>

        <Visual />
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 12),
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Button
            variant="secondary"
            icon={ArrowLeft}
            disabled={index === 0}
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
            accessibilityLabel="Back"
          >
            Back
          </Button>

          <View
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            accessible
            accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}
          >
            {STEPS.map((item, i) => (
              <View
                key={item.title}
                style={{
                  height: 6,
                  width: i === index ? 22 : 6,
                  borderRadius: 999,
                  backgroundColor: i === index ? c.primary : c.muted,
                }}
              />
            ))}
          </View>

          <Button
            variant="primary"
            icon={isLast ? undefined : ArrowRight}
            onPress={() => (isLast ? finish() : setIndex((i) => i + 1))}
          >
            {isLast ? 'Get started' : 'Next'}
          </Button>
        </View>

        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground, textAlign: 'center' }}>
          Sample data until the backend phase
        </Text>
      </View>
    </View>
  )
}
