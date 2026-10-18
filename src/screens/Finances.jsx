import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Loading from '../components/ui/Loading.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import BudgetForm from '../components/forms/BudgetForm.jsx'
import TxForm from '../components/forms/TxForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { useData } from '../data/store.jsx'
import { recordActions } from '../lib/alerts.js'
import {
  budgetProgress,
  formatDateShort,
  percentChange,
  totalsForMonth,
  totalsForPrevMonth,
} from '../lib/analytics.js'
import { money } from '../lib/format.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

export default function Finances() {
  const { c, fonts, text } = useTheme()
  const { data, loading, error, reload, deleteTransaction, deleteBudget } = useData()
  const [expanded, setExpanded] = useState(false)
  const [txOpen, setTxOpen] = useState(false)
  const [txRecord, setTxRecord] = useState(null)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [budgetRecord, setBudgetRecord] = useState(null)

  const openNewTx = () => {
    setTxRecord(null)
    setTxOpen(true)
  }

  const openNewBudget = () => {
    setBudgetRecord(null)
    setBudgetOpen(true)
  }

  const txActions = (tx) =>
    recordActions({
      title: tx.merchant,
      onEdit: () => {
        setTxRecord(tx)
        setTxOpen(true)
      },
      onDelete: () => deleteTransaction(tx.id).catch(() => {}),
    })

  const budgetActions = (row) =>
    recordActions({
      title: row.category,
      onEdit: () => {
        setBudgetRecord({ id: row.id, category: row.category, limit_amount: row.limit })
        setBudgetOpen(true)
      },
      onDelete: () => deleteBudget(row.id).catch(() => {}),
    })

  if (loading) {
    return (
      <Screen title="Money" subtitle="This month">
        <Loading label="Loading finances" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title="Money" subtitle="This month">
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    )
  }

  const { transactions, budgets } = data
  const { income, spend } = totalsForMonth(transactions)
  const spendDelta = percentChange(spend, totalsForPrevMonth(transactions).spend)
  const budgetRows = budgetProgress(budgets, transactions)
  const budgetTotal = budgetRows.reduce((sum, row) => sum + row.limit, 0)
  const remaining = budgetTotal - spend
  const list = expanded ? transactions : transactions.slice(0, 5)
  const net = income - spend

  return (
    <Screen title="Money" subtitle="This month · all accounts">
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <StatCard
          label="Spent this month"
          value={money(spend, 0)}
          delta={spendDelta}
          deltaIsGood={false}
          hint={budgetTotal > 0 ? `${money(remaining, 0)} left of ${money(budgetTotal, 0)}` : 'Set a budget below'}
        />
        <StatCard
          label="Net this month"
          value={net < 0 ? `−${money(net, 0)}` : money(net, 0)}
          hint={`${money(income, 0)} in · ${money(spend, 0)} out`}
        />
      </View>

      <Section
        title="Budget"
        action={
          <Button size="sm" variant="ghost" onPress={openNewBudget}>
            Add
          </Button>
        }
      >
        <Card padded={budgetRows.length > 0}>
          {budgetRows.length ? (
            <View style={{ gap: 14 }}>
              {budgetRows.map((budget) => (
                <Pressable
                  key={budget.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${budget.category} budget, long press to edit`}
                  onLongPress={() => budgetActions(budget)}
                >
                  <ProgressBar label={budget.category} value={budget.spent} limit={budget.limit} />
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No budgets yet"
              description="Add a monthly limit per category to see where you stand."
              action={
                <Button size="sm" variant="primary" onPress={openNewBudget}>
                  Add a budget
                </Button>
              }
            />
          )}
        </Card>
      </Section>

      <Section
        title="Transactions"
        action={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {transactions.length > 5 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpanded((value) => !value)}
                hitSlop={8}
              >
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
                  {expanded ? 'Show less' : `All ${transactions.length}`}
                </Text>
              </Pressable>
            ) : null}
            <Button size="sm" variant="ghost" onPress={openNewTx}>
              Add
            </Button>
          </View>
        }
      >
        <Card padded={!list.length}>
          {list.length ? (
            list.map((tx, index) => {
              const positive = Number(tx.amount) > 0
              return (
                <Pressable
                  key={tx.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${tx.merchant}, long press to edit`}
                  onLongPress={() => txActions(tx)}
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
                      {tx.category} · {formatDateShort(tx.occurred_on)}
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
                </Pressable>
              )
            })
          ) : (
            <EmptyState
              title="No transactions yet"
              description="Log income and spending to build your monthly picture."
              action={
                <Button size="sm" variant="primary" onPress={openNewTx}>
                  Add a transaction
                </Button>
              }
            />
          )}
        </Card>
      </Section>

      <TxForm
        visible={txOpen}
        record={txRecord}
        onClose={() => {
          setTxOpen(false)
          setTxRecord(null)
        }}
      />
      <BudgetForm
        visible={budgetOpen}
        record={budgetRecord}
        onClose={() => {
          setBudgetOpen(false)
          setBudgetRecord(null)
        }}
      />
    </Screen>
  )
}
