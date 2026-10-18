import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { budgets, kpis, monthlyBudget, monthlySpend, transactions } from '../data/mock.js'
import { money } from '../lib/format.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

export default function Finances() {
  const { c, fonts, text } = useTheme()
  const [expanded, setExpanded] = useState(false)

  const income = transactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)
  const net = income - monthlySpend
  const list = expanded ? transactions : transactions.slice(0, 5)

  return (
    <Screen title="Money" subtitle="October · all accounts">
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <StatCard
          label="Spent this month"
          value={money(monthlySpend, 0)}
          delta={kpis.monthlySpendDelta}
          deltaIsGood={false}
          hint={`${money(monthlyBudget - monthlySpend, 0)} left of ${money(monthlyBudget, 0)}`}
        />
        <StatCard
          label="Net this month"
          value={money(net, 0)}
          delta={4.6}
          hint={`${money(income, 0)} in · ${money(monthlySpend, 0)} out`}
        />
      </View>

      <Section title="Budget">
        <Card padded>
          <View style={{ gap: 14 }}>
            {budgets.map((budget) => (
              <ProgressBar
                key={budget.category}
                label={budget.category}
                value={budget.spent}
                limit={budget.limit}
              />
            ))}
          </View>
        </Card>
      </Section>

      <Section
        title="Transactions"
        action={
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded((value) => !value)}
            hitSlop={8}
          >
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
              {expanded ? 'Show less' : `All ${transactions.length}`}
            </Text>
          </Pressable>
        }
      >
        <Card>
          {list.map((tx, index) => {
            const positive = tx.amount > 0
            return (
              <View
                key={tx.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: c.line,
                }}
              >
                <View style={{ minWidth: 0, flex: 1, gap: 2 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}
                  >
                    {tx.merchant}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}
                  >
                    {tx.category} · {tx.date}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: fonts.monoMedium,
                    fontSize: text.body,
                    color: positive ? c.success : c.foreground,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {positive ? '+' : '−'}
                  {money(tx.amount, 2)}
                </Text>
              </View>
            )
          })}
        </Card>
      </Section>
    </Screen>
  )
}
