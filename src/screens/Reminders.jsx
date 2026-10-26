import { useState } from 'react'
import { Redirect } from 'expo-router'
import { Linking, Platform, Text, View } from 'react-native'
import Button from '../components/ui/Button.jsx'
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx'
import Chip from '../components/ui/Chip.jsx'
import Collapse from '../components/ui/Collapse.jsx'
import SwitchRow from '../components/ui/SwitchRow.jsx'
import Screen from '../components/layout/Screen.jsx'
import TimeField from '../components/ui/TimeField.jsx'
import { useReminders } from '../data/reminders.jsx'
import { useTheme } from '../theme/ThemeProvider.jsx'

const LEADS = [5, 10, 30]

const TEST_MESSAGES = {
  scheduled: 'Test reminder scheduled. It will appear in about 5 seconds.',
  denied: 'Allow notifications first, then try again.',
  unavailable: 'Notifications are not available on this platform.',
  error: 'Could not schedule the test reminder.',
}

export default function Reminders() {
  const { c, fonts, text } = useTheme()
  const {
    prefs,
    permission,
    enabled,
    setEnabled,
    updatePrefs,
    sendTest,
    syncing,
    syncError,
    lastSyncedAt,
  } = useReminders()
  const [toggling, setToggling] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testStatus, setTestStatus] = useState(null)

  if (Platform.OS === 'web') return <Redirect href="/settings" />

  const active = enabled && permission === 'granted'
  const blocked = permission === 'denied'
  const unavailable = permission === 'unavailable'

  const toggle = async (next) => {
    setToggling(true)
    setTestStatus(null)
    await setEnabled(next)
    setToggling(false)
  }

  const test = async () => {
    setTesting(true)
    setTestStatus(null)
    setTestStatus(await sendTest())
    setTesting(false)
  }

  const permissionCopy = blocked
    ? 'Notifications are blocked for Zen-I in system settings.'
    : unavailable
      ? 'Reminders are available in the mobile app.'
      : permission === 'granted'
        ? 'Notifications are allowed. Reminders stay on this device.'
        : 'Zen-I will ask for permission to show local reminders.'

  const scheduleCopy = !enabled
    ? 'Turn on reminders to build a schedule.'
    : syncing
      ? 'Updating the schedule…'
      : syncError
        ? syncError
        : lastSyncedAt
          ? 'Schedule is up to date.'
          : 'The schedule will update in a moment.'

  return (
    <Screen
      title="Reminders"
      subtitle="Gentle nudges, only on this device"
      left="back"
      tabbed={false}
    >
      <Card>
        <CardHeader title="Notifications" subtitle="Opt in when you are ready" />
        <SwitchRow
          label="Allow reminders"
          description={permissionCopy}
          value={enabled}
          onValueChange={toggle}
          disabled={unavailable || toggling}
        />
        <CardBody style={{ gap: 10, paddingTop: 4 }}>
          {blocked ? (
            <Button
              variant="secondary"
              onPress={() => Linking.openSettings().catch(() => {})}
            >
              Open system settings
            </Button>
          ) : null}
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: text.micro,
              lineHeight: 17,
              color: syncError ? c.destructiveText : c.mutedForeground,
            }}
          >
            {scheduleCopy}
          </Text>
        </CardBody>
      </Card>

      {active ? (
        <>
          <Card>
            <CardHeader title="Sleep" subtitle="A morning nudge to log last night" />
            <SwitchRow
              label="Morning check-in"
              description="A reminder to log how you slept."
              value={prefs.sleep.enabled}
              onValueChange={(value) =>
                updatePrefs((prev) => ({ ...prev, sleep: { ...prev.sleep, enabled: value } }))
              }
            />
            <Collapse open={prefs.sleep.enabled}>
              <CardBody style={{ paddingTop: 4 }}>
                <TimeField
                  label="Reminder time"
                  value={prefs.sleep.time}
                  onChange={(time) =>
                    updatePrefs((prev) => ({ ...prev, sleep: { ...prev.sleep, time } }))
                  }
                />
              </CardBody>
            </Collapse>
          </Card>

          <Card>
            <CardHeader title="Planner" subtitle="Agenda, events and tasks" />
            <SwitchRow
              label="Daily agenda"
              description="A short look at what is ahead today."
              value={prefs.planner.agenda.enabled}
              onValueChange={(value) =>
                updatePrefs((prev) => ({
                  ...prev,
                  planner: {
                    ...prev.planner,
                    agenda: { ...prev.planner.agenda, enabled: value },
                  },
                }))
              }
            />
            <Collapse open={prefs.planner.agenda.enabled}>
              <CardBody style={{ paddingTop: 4 }}>
                <TimeField
                  label="Agenda time"
                  value={prefs.planner.agenda.time}
                  onChange={(time) =>
                    updatePrefs((prev) => ({
                      ...prev,
                      planner: {
                        ...prev.planner,
                        agenda: { ...prev.planner.agenda, time },
                      },
                    }))
                  }
                />
              </CardBody>
            </Collapse>

            <SwitchRow
              label="Plan item reminders"
              description="Ahead of each scheduled plan item."
              value={prefs.planner.events.enabled}
              onValueChange={(value) =>
                updatePrefs((prev) => ({
                  ...prev,
                  planner: {
                    ...prev.planner,
                    events: { ...prev.planner.events, enabled: value },
                  },
                }))
              }
            />
            <Collapse open={prefs.planner.events.enabled}>
              <CardBody style={{ gap: 8, paddingTop: 4 }}>
                <Text
                  style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}
                >
                  Remind me
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {LEADS.map((lead) => (
                    <Chip
                      key={lead}
                      active={Number(prefs.planner.events.leadMinutes) === lead}
                      onPress={() =>
                        updatePrefs((prev) => ({
                          ...prev,
                          planner: {
                            ...prev.planner,
                            events: { ...prev.planner.events, leadMinutes: lead },
                          },
                        }))
                      }
                    >
                      {lead} min before
                    </Chip>
                  ))}
                </View>
              </CardBody>
            </Collapse>

            <SwitchRow
              label="Task deadlines"
              description="On the morning a task is due."
              value={prefs.planner.tasks.enabled}
              onValueChange={(value) =>
                updatePrefs((prev) => ({
                  ...prev,
                  planner: {
                    ...prev.planner,
                    tasks: { ...prev.planner.tasks, enabled: value },
                  },
                }))
              }
            />
            <Collapse open={prefs.planner.tasks.enabled}>
              <CardBody style={{ paddingTop: 4 }}>
                <TimeField
                  label="Task reminder time"
                  value={prefs.planner.tasks.time}
                  onChange={(time) =>
                    updatePrefs((prev) => ({
                      ...prev,
                      planner: {
                        ...prev.planner,
                        tasks: { ...prev.planner.tasks, time },
                      },
                    }))
                  }
                />
              </CardBody>
            </Collapse>
          </Card>

          <Card>
            <CardHeader title="Learning" subtitle="Keep a study streak moving" />
            <SwitchRow
              label="Study check-in"
              description="A gentle prompt to log a focused session."
              value={prefs.learning.enabled}
              onValueChange={(value) =>
                updatePrefs((prev) => ({
                  ...prev,
                  learning: { ...prev.learning, enabled: value },
                }))
              }
            />
            <Collapse open={prefs.learning.enabled}>
              <CardBody style={{ paddingTop: 4 }}>
                <TimeField
                  label="Reminder time"
                  value={prefs.learning.time}
                  onChange={(time) =>
                    updatePrefs((prev) => ({
                      ...prev,
                      learning: { ...prev.learning, time },
                    }))
                  }
                />
              </CardBody>
            </Collapse>
          </Card>

          <Card>
            <CardHeader title="Projects" subtitle="Before a deadline slips" />
            <SwitchRow
              label="Deadline reminders"
              description="The day before at 9:00 AM, and before the due time."
              value={prefs.projects.enabled}
              onValueChange={(value) =>
                updatePrefs((prev) => ({
                  ...prev,
                  projects: { ...prev.projects, enabled: value },
                }))
              }
            />
          </Card>

          <Card>
            <CardHeader title="Money" subtitle="Due dates and budget limits" />
            <SwitchRow
              label="Debt due dates"
              description="On the morning a debt is due."
              value={prefs.money.debts.enabled}
              onValueChange={(value) =>
                updatePrefs((prev) => ({
                  ...prev,
                  money: {
                    ...prev.money,
                    debts: { ...prev.money.debts, enabled: value },
                  },
                }))
              }
            />
            <Collapse open={prefs.money.debts.enabled}>
              <CardBody style={{ paddingTop: 4 }}>
                <TimeField
                  label="Debt reminder time"
                  value={prefs.money.debts.time}
                  onChange={(time) =>
                    updatePrefs((prev) => ({
                      ...prev,
                      money: {
                        ...prev.money,
                        debts: { ...prev.money.debts, time },
                      },
                    }))
                  }
                />
              </CardBody>
            </Collapse>

            <SwitchRow
              label="Budget alerts"
              description="After spending crosses 80% or 100% of a budget."
              value={prefs.money.budgets.enabled}
              onValueChange={(value) =>
                updatePrefs((prev) => ({
                  ...prev,
                  money: {
                    ...prev.money,
                    budgets: { ...prev.money.budgets, enabled: value },
                  },
                }))
              }
            />
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader title="Privacy" subtitle="What appears on the lock screen" />
        <CardBody>
          <Text
            style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.mutedForeground }}
          >
            Reminder text stays general. It never shows task names, project names, debt details,
            budget categories or amounts.
          </Text>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Try it" subtitle="A local notification in five seconds" />
        <CardBody style={{ gap: 10 }}>
          <Button
            variant="secondary"
            onPress={test}
            disabled={!active || testing}
            loading={testing}
          >
            Send test reminder
          </Button>
          {testStatus ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{
                fontFamily: fonts.sans,
                fontSize: text.micro,
                lineHeight: 17,
                color: testStatus === 'scheduled' ? c.success : c.destructiveText,
              }}
            >
              {TEST_MESSAGES[testStatus]}
            </Text>
          ) : (
            <Text
              style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}
            >
              Keep the app in the background after sending to see how it arrives.
            </Text>
          )}
        </CardBody>
      </Card>
    </Screen>
  )
}
