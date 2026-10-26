import { useState } from 'react'
import Constants from 'expo-constants'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { Database, Info, LockKey, SignOut, Sparkle, Trash } from '../icons.js'
import { Alert, Platform, Pressable, Text, View } from 'react-native'
import AccountForm from '../components/forms/AccountForm.jsx'
import ChangePasswordForm from '../components/forms/ChangePasswordForm.jsx'
import DeleteDataForm from '../components/forms/DeleteDataForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx'
import Collapse from '../components/ui/Collapse.jsx'
import SettingsRow from '../components/ui/SettingsRow.jsx'
import SwitchRow from '../components/ui/SwitchRow.jsx'
import ThemeToggle from '../components/ui/ThemeToggle.jsx'
import { useData } from '../data/store.jsx'
import { useAuth } from '../data/auth.jsx'
import { remainingToday, useAiPrefs } from '../data/aiPrefs.jsx'
import { usePrivacy } from '../data/privacy.jsx'
import { useReminders } from '../data/reminders.jsx'
import { useOnboarding } from '../lib/onboarding.js'
import { reportError } from '../lib/alerts.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0'

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
  const { data, loading, error, reload } = useData()
  const { user, signOut } = useAuth()
  const { reset } = useOnboarding()
  const { enabled: aiEnabled, setEnabled: setAiEnabled, usage } = useAiPrefs()
  const { hidden, setHidden, accountsHidden, setAccountsHidden } = usePrivacy()
  const { enabled: remindersEnabled, permission: reminderPermission } = useReminders()
  const router = useRouter()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dataDeleted, setDataDeleted] = useState(false)
  const [countsOpen, setCountsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountRecord, setAccountRecord] = useState(null)

  const remaining = remainingToday(usage)
  const cap = usage?.cap ?? 50
  const usageLabel =
    remaining === null
      ? 'No AI requests yet today'
      : `AI usage: ${Math.max(0, cap - remaining)}/${cap} today`
  const reminderLabel =
    reminderPermission === 'denied'
      ? 'Blocked'
      : reminderPermission === 'unavailable'
        ? 'Unavailable'
        : remindersEnabled
          ? 'On'
          : 'Off'

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

  const openNewAccount = () => {
    Haptics.selectionAsync().catch(() => {})
    setAccountRecord(null)
    setAccountOpen(true)
  }

  const openEditAccount = (account) => {
    Haptics.selectionAsync().catch(() => {})
    setAccountRecord(account)
    setAccountOpen(true)
  }

  const confirmSignOut = () => {
    Haptics.selectionAsync().catch(() => {})
    Alert.alert('Sign out?', 'You will need to sign in again to see your records.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          signOut().catch(reportError)
        },
      },
    ])
  }

  return (
    <Screen title="Settings" subtitle="Account, money, appearance and data" left="back" tabbed={false}>
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
        <SettingsRow label="Change password" onPress={openPassword} />
        <SettingsRow
          label="Sign out"
          onPress={confirmSignOut}
          destructive
          right={<SignOut size={14} weight="bold" color={c.destructiveText} />}
        />
      </Card>

      <Card>
        <CardHeader title="Appearance" subtitle="Light or dark" />
        <SettingsRow label="Theme" right={<ThemeToggle />} />
      </Card>

      <Card>
        <CardHeader
          title="Money accounts"
          subtitle="Bank, e-wallet and cash"
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add money account"
              onPress={openNewAccount}
              hitSlop={4}
              style={({ pressed }) => ({
                minHeight: 48,
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
                Add
              </Text>
            </Pressable>
          }
        />
        {data.accounts.length ? (
          data.accounts.map((account) => (
            <SettingsRow
              key={account.id}
              label={account.name}
              onPress={() => openEditAccount(account)}
            />
          ))
        ) : (
          <CardBody>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: text.micro,
                lineHeight: 17,
                color: c.mutedForeground,
              }}
            >
              Add GCash, BDO or cash to tag spending and track balances. Card colors are set
              per account.
            </Text>
          </CardBody>
        )}
      </Card>

      {Platform.OS !== 'web' ? (
        <Card>
          <CardHeader title="Reminders" subtitle="Local notifications on this device" />
          <SettingsRow
            label="Reminders"
            value={reminderLabel}
            onPress={() => router.push('/reminders')}
          />
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Privacy" subtitle="Balances on screen" />
        <SwitchRow
          label="Hide balances"
          description="Masks account balances, the accounts total and debt amounts."
          value={hidden}
          onValueChange={setHidden}
        />
        <SwitchRow
          label="Hide account balances only"
          description="Masks account cards and the accounts total. Ignored while Hide balances is on."
          value={accountsHidden}
          onValueChange={setAccountsHidden}
          disabled={hidden}
        />
        <CardBody>
          <Text
            style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}
          >
            Both settings are per device. Hidden balances are left out of the context sent to Gemini.
          </Text>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="AI features" subtitle="Optional · off by default" />
        <SwitchRow
          label="Gemini answers"
          description="Sends only the numbers needed for an explanation or answer."
          value={aiEnabled}
          onValueChange={setAiEnabled}
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
        <SettingsRow label="Replay intro" onPress={replay} />
      </Card>

      <Card>
        <CardHeader
          title="Data"
          subtitle={loading ? 'Syncing…' : error ? 'Couldn’t refresh' : 'Live from your account'}
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh records"
              onPress={() => reload()}
              hitSlop={4}
              style={({ pressed }) => ({
                minHeight: 48,
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
                Refresh
              </Text>
            </Pressable>
          }
        />
        <CardBody style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Database size={14} weight="bold" color={error ? c.destructiveText : c.mutedForeground} />
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: text.caption,
                color: error ? c.destructiveText : c.mutedForeground,
              }}
            >
              {loading ? 'Syncing records…' : error ? 'Couldn’t reach your account' : 'Connected · live'}
            </Text>
          </View>
          {error ? (
            <Text
              style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}
            >
              Records shown are from the last successful sync. Use Refresh to try again.
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Record counts"
            accessibilityState={{ expanded: countsOpen }}
            onPress={() => setCountsOpen((value) => !value)}
            style={({ pressed }) => ({
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
              Record counts
            </Text>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
              {countsOpen ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
          <Collapse open={countsOpen}>
            <View style={{ gap: 8, paddingTop: 8 }}>
              <CountRow label="Notes" count={data.notes.length} />
              <CountRow label="Transactions" count={data.transactions.length} />
              <CountRow label="Accounts" count={data.accounts.length} />
              <CountRow label="Debts" count={data.debts.length} />
              <CountRow label="Budgets" count={data.budgets.length} />
              <CountRow label="Plan entries" count={data.planner.length} />
              <CountRow label="Tasks" count={data.tasks.length} />
              <CountRow label="Sleep logs" count={data.sleepLogs.length} />
              <CountRow label="Sleep score events" count={data.sleepCreditEvents.length} />
              <CountRow label="Courses" count={data.courses.length} />
              <CountRow label="Study sessions" count={data.sessions.length} />
              <CountRow label="Projects" count={data.projects.length} />
              <CountRow label="Penalties" count={data.penalties.length} />
            </View>
          </Collapse>
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
              Removes every note, transaction, budget, account, debt, plan entry, task, sleep
              log, sleep credit history, course, lesson, study session and project in this
              account. Your sign-in and app settings stay.
            </Text>
          )}
        </CardBody>
        <SettingsRow
          label="Delete all data"
          onPress={openDelete}
          destructive
          right={<Trash size={14} weight="bold" color={c.destructiveText} />}
        />
      </Card>

      <Card>
        <CardHeader title="About" subtitle="Zen-I Assistant" />
        <CardBody>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Info size={14} weight="bold" color={c.mutedForeground} />
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
              Build {APP_VERSION}
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

      <AccountForm
        visible={accountOpen}
        record={accountRecord}
        onClose={() => setAccountOpen(false)}
      />

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
