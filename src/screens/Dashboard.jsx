import { useRouter } from 'expo-router'
import { CalendarBlank, Check, Fire, Notebook, Wallet } from 'phosphor-react-native'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import TrendAreaChart, { ChartLegend } from '../components/charts/TrendAreaChart.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx'
import QuickAsk from '../components/ui/QuickAsk.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import ThemeToggle from '../components/ui/ThemeToggle.jsx'
import {
  kpis,
  monthlyBudget,
  monthlySpend,
  spendingTrend,
  todayPlan,
  user,
} from '../data/mock.js'
import { greeting, money } from '../lib/format.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

const TODAY = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
})

function AvatarButton() {
  const { c, fonts } = useTheme()
  const router = useRouter()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      onPress={() => router.push('/settings')}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: c.primarySoft,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: 14, color: c.primaryFg }}>
        {user.initials}
      </Text>
    </Pressable>
  )
}

function Today() {
  const { c, fonts, text } = useTheme()
  const [tasks, setTasks] = useState(todayPlan)
  const open = tasks.filter((task) => !task.done)
  const done = tasks.length - open.length

  return (
    <Card>
      <CardHeader title="Today" subtitle={`${done} of ${tasks.length} done`} />
      <CardBody style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, gap: 0 }}>
        {tasks.map((task, index) => (
          <Pressable
            key={task.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.done }}
            onPress={() =>
              setTasks((prev) =>
                prev.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item)),
              )
            }
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
              borderTopColor: c.line,
              backgroundColor: pressed ? c.overline : 'transparent',
            })}
          >
            <View
              style={{
                width: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                borderWidth: 1,
                borderColor: task.done ? c.primary : c.border,
                backgroundColor: task.done ? c.primary : 'transparent',
              }}
            >
              {task.done ? <Check size={13} weight="bold" color={c.onPrimary} /> : null}
            </View>
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontFamily: fonts.sansMedium,
                fontSize: text.body,
                color: task.done ? c.mutedForeground : c.foreground,
                textDecorationLine: task.done ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </Text>
            <Text
              style={{
                fontFamily: fonts.mono,
                fontSize: text.micro,
                color: c.mutedForeground,
                fontVariant: ['tabular-nums'],
              }}
            >
              {task.time}
            </Text>
          </Pressable>
        ))}
      </CardBody>
    </Card>
  )
}

function GlanceRow({ icon: Icon, label, value, to }) {
  const { c, fonts, text } = useTheme()
  const router = useRouter()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(to)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? c.overline : 'transparent',
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          backgroundColor: c.muted,
        }}
      >
        <Icon size={17} color={c.foreground} />
      </View>
      <Text style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: text.caption,
          color: c.mutedForeground,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </Pressable>
  )
}

export default function Dashboard() {
  const { c, fonts, radius, text } = useTheme()
  const [range, setRange] = useState(12)
  const trend = useMemo(() => spendingTrend.slice(-range), [range])
  const remaining = monthlyBudget - monthlySpend

  return (
    <Screen
      title={`${greeting()}, ${user.name}`}
      subtitle={TODAY}
      right={
        <>
          <ThemeToggle />
          <AvatarButton />
        </>
      }
    >
      <QuickAsk />

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <StatCard label="Net balance" value={money(kpis.netBalance)} delta={kpis.netBalanceDelta} />
        <StatCard
          label="Spent this month"
          value={money(monthlySpend, 0)}
          delta={kpis.monthlySpendDelta}
          deltaIsGood={false}
          hint={`${money(remaining, 0)} left of ${money(monthlyBudget, 0)}`}
        />
      </View>

      <Section
        title="Spending vs income"
        action={
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[6, 12].map((months) => {
              const active = range === months
              return (
                <Pressable
                  key={months}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setRange(months)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: radius.pill,
                    backgroundColor: active ? c.primary : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: text.caption,
                      color: active ? c.onPrimary : c.mutedForeground,
                    }}
                  >
                    {months}M
                  </Text>
                </Pressable>
              )
            })}
          </View>
        }
      >
        <Card padded>
          <View style={{ gap: 12 }}>
            <ChartLegend />
            <TrendAreaChart data={trend} />
          </View>
        </Card>
      </Section>

      <Today />

      <Section title="At a glance">
        <Card>
          <GlanceRow icon={Notebook} label="Notes" value={`${kpis.notesTotal}`} to="/notes" />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: 62 }} />
          <GlanceRow icon={Wallet} label="Budget left" value={money(remaining, 0)} to="/finances" />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: 62 }} />
          <GlanceRow
            icon={Fire}
            label="Learning streak"
            value={`${kpis.learningStreak} days`}
            to="/learning"
          />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: 62 }} />
          <GlanceRow icon={CalendarBlank} label="Planner" value="Week 42" to="/planner" />
        </Card>
      </Section>
    </Screen>
  )
}
