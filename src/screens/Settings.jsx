import { useState } from 'react'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { CaretRight, Database, Info, LockKey, SignOut, Sparkle, Trash } from '../icons.js'
import { Alert, Pressable, Switch, Text, View } from 'react-native'
import ChangePasswordForm from '../components/forms/ChangePasswordForm.jsx'
import DeleteDataForm from '../components/forms/DeleteDataForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx'
import ThemeToggle from '../components/ui/ThemeToggle.jsx'
import { useData } from '../data/store.jsx'
import { useAuth } from '../data/auth.jsx'
import { remainingToday, useAiPrefs } from '../data/aiPrefs.jsx'
import { usePrivacy } from '../data/privacy.jsx'
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
  const { user, signOut } = useAuth()
  const { reset } = useOnboarding()
  const { enabled: aiEnabled, setEnabled: setAiEnabled, usage } = useAiPrefs()
  const { hidden, setHidden } = usePrivacy()
  const router = useRouter()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dataDeleted, setDataDeleted] = useState(false)

  const remaining = remainingToday(usage)
  const cap = usage?.cap ?? 50
  const usageLabel =
    remaining === null
      ? 'No AI requests yet today'
      : `AI usage: ${Math.max(0, cap - remaining)}/${cap} today`

  const replay = async () => {
    Haptics.selectionAsync().catch(() => {})
    await reset()
    router.replace('/welcome')
  }

  const openPassword = () => {
    Haptics.selectionAsync().catch(() => {})
    setPasswordChanged(false)
    setPasswordOpen(true)
  }

  const openDelete = () => {
    Haptics.selectionAsync().catch(() => {})
    setDataDeleted(false)
    setDeleteOpen(true)
  }

  const confirmSignOut = () => {
    Haptics.selectionAsync().catch(() => {})
    Alert.alert('Sign out?', 'You will need to sign in again to see your records.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          signOut().catch(() => {})
        },
      },
    ])
  }

  return (
    <Screen title="Settings" subtitle="Account, appearance, intro and data" left="back">
      <Card>
        <CardHeader title="Account" subtitle="This device stays signed in" />
        <CardBody style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LockKey size={14} weight="bold" color={c.mutedForeground} />
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
              {user?.email ?? 'Signed in'}
            </Text>
          </View>
          <Text
            style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}
          >
            Every note, transaction, plan and project belongs to this account. Signing out hides
            them from this device.
          </Text>
          {passwordChanged ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.success }}
            >
              Password updated. Use it next time you sign in.
            </Text>
          ) : null}
        </CardBody>
        <Row label="Change password" onPress={openPassword} />
        <Row
          label="Sign out"
          onPress={confirmSignOut}
          right={<SignOut size={14} weight="bold" color={c.destructive} />}
        />
      </Card>

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
        <CardHeader title="Privacy" subtitle="Balances on screen" />
        <Row
          label="Hide balances"
          onPress={() => {
            Haptics.selectionAsync().catch(() => {})
            setHidden(!hidden)
          }}
          right={
            <Switch
              value={hidden}
              onValueChange={(next) => {
                Haptics.selectionAsync().catch(() => {})
                setHidden(next)
              }}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor={c.card}
            />
          }
        />
        <CardBody style={{ gap: 8 }}>
          <Text
            style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}
          >
            Masks account balances, the total in your accounts and debt amounts as ₱••••••. Spending,
            budgets and transaction amounts stay visible.
          </Text>
          <Text
            style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}
          >
            While it is on, hidden balances are also left out of the context Zen-I sends to Gemini.
            This setting is per device.
          </Text>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="AI features" subtitle="Optional · off by default" />
        <Row
          label="Gemini answers"
          onPress={() => {
            Haptics.selectionAsync().catch(() => {})
            setAiEnabled(!aiEnabled)
          }}
          right={
            <Switch
              value={aiEnabled}
              onValueChange={(next) => {
                Haptics.selectionAsync().catch(() => {})
                setAiEnabled(next)
              }}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor={c.card}
            />
          }
        />
        <CardBody style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkle size={14} weight="bold" color={c.mutedForeground} />
            <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
              {usageLabel}
            </Text>
          </View>
          <Text
            style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}
          >
            When on, Zen-I can send the numbers it needs — totals, budgets, study hours, plan
            entries — to Gemini to explain or advise. It stays off until you ask for it, and the
            on-device answer always works without it.
          </Text>
          <Text
            style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}
          >
            Never sent: note bodies (unless you tap Summarize on one), individual transactions,
            passwords, keys or account numbers. Free tier only, capped at {cap} requests a day.
          </Text>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Getting started" subtitle="Replay the walkthrough" />
        <Row label="Replay intro" onPress={replay} />
      </Card>

      <Card>
        <CardHeader
          title="Data"
          subtitle="Live from your account"
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
              Connected · v0.3
            </Text>
          </View>
          <View style={{ gap: 8 }}>
            <CountRow label="Notes" count={data.notes.length} />
            <CountRow label="Transactions" count={data.transactions.length} />
            <CountRow label="Accounts" count={data.accounts.length} />
            <CountRow label="Debts" count={data.debts.length} />
            <CountRow label="Budgets" count={data.budgets.length} />
            <CountRow label="Plan entries" count={data.planner.length} />
            <CountRow label="Courses" count={data.courses.length} />
            <CountRow label="Study sessions" count={data.sessions.length} />
            <CountRow label="Projects" count={data.projects.length} />
            <CountRow label="Penalties" count={data.penalties.length} />
          </View>
          <Text
            style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.mutedForeground }}
          >
            Records are stored in your private Supabase account and are only readable while signed
            in. Nothing is shared with anyone else.
          </Text>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Danger zone" subtitle="Permanent and account-wide" />
        <CardBody style={{ gap: 8 }}>
          {dataDeleted ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.success }}
            >
              All records deleted. Your account is empty again.
            </Text>
          ) : (
            <Text
              style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}
            >
              Removes every note, transaction, budget, account, debt, plan entry, course, lesson,
              study session and project in this account. Your sign-in and app settings stay.
            </Text>
          )}
        </CardBody>
        <Row
          label="Delete all data"
          onPress={openDelete}
          right={<Trash size={14} weight="bold" color={c.destructive} />}
        />
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
            A personal assistant for notes, finances, planning and learning. Records are live and
            private to your account; answers are grounded in them.
          </Text>
        </CardBody>
      </Card>

      <ChangePasswordForm
        visible={passwordOpen}
        onClose={(changed) => {
          setPasswordOpen(false)
          if (changed === true) setPasswordChanged(true)
        }}
      />

      <DeleteDataForm
        visible={deleteOpen}
        onClose={(deleted) => {
          setDeleteOpen(false)
          if (deleted === true) setDataDeleted(true)
        }}
      />
    </Screen>
  )
}
