import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { PencilSimple, Trash } from '../icons.js'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Loading from '../components/ui/Loading.jsx'
import RowMenuButton from '../components/ui/RowMenuButton.jsx'
import PlanForm from '../components/forms/PlanForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { useData } from '../data/store.jsx'
import { confirmDelete } from '../lib/alerts.js'
import { useRowActions } from '../lib/rowActions.jsx'
import {
  formatDateShort,
  plannerWeek,
  todayISO,
  upcomingEntries,
  weekRangeLabel,
} from '../lib/analytics.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

export default function Planner() {
  const { c, fonts, radius, text } = useTheme()
  const { data, loading, error, reload, deletePlanEntry } = useData()
  const [formOpen, setFormOpen] = useState(false)
  const [draftDate, setDraftDate] = useState(null)
  const [record, setRecord] = useState(null)
  const { open, sheet } = useRowActions()

  const openForm = (date) => {
    setRecord(null)
    setDraftDate(date ?? null)
    setFormOpen(true)
  }

  const openEditEntry = (entry) => {
    setRecord(entry)
    setDraftDate(null)
    setFormOpen(true)
  }

  const entryActions = (id) => {
    const entry = data.planner.find((item) => item.id === id)
    if (!entry) return
    open({
      title: entry.title,
      subtitle: `${formatDateShort(entry.entry_date)}${
        entry.start_time ? ` · ${String(entry.start_time).slice(0, 5)}` : ''
      }`,
      actions: [
        { key: 'edit', label: 'Edit', icon: PencilSimple, onPress: () => openEditEntry(entry) },
        {
          key: 'delete',
          label: 'Delete',
          icon: Trash,
          destructive: true,
          onPress: () => confirmDelete(entry.title, () => deletePlanEntry(id).catch(() => {})),
        },
      ],
    })
  }

  if (loading) {
    return (
      <Screen title="Plan" subtitle="This week">
        <Loading label="Loading your week" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title="Plan" subtitle="This week">
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    )
  }

  const days = plannerWeek(data.planner)
  const upcoming = upcomingEntries(data.planner)
  const today = todayISO()

  return (
    <Screen
      title="Plan"
      subtitle={weekRangeLabel()}
      right={
        <Button size="sm" variant="secondary" onPress={() => openForm()}>
          New
        </Button>
      }
    >
      <Section title="This week">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingRight: 4 }}
        >
          {days.map((day) => {
            const isToday = day.date === today
            return (
              <Pressable
                key={day.date}
                accessibilityRole="button"
                accessibilityLabel={`Add to ${day.day} ${day.dayNum}`}
                onPress={() => openForm(day.date)}
                style={{
                  width: 132,
                  gap: 8,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: isToday ? c.primary : c.border,
                  backgroundColor: isToday ? c.primarySoft : c.card,
                  padding: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.caption, color: c.foreground }}>
                    {day.day}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: text.micro,
                      color: isToday ? c.primaryFg : c.mutedForeground,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {day.dayNum}
                  </Text>
                </View>

                {day.events.length ? (
                  <View style={{ gap: 8 }}>
                    {day.events.map((event) => (
                      <Pressable
                        key={event.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${event.title}, tap for options`}
                        onPress={() => entryActions(event.id)}
                        style={{ gap: 1 }}
                      >
                        <Text
                          style={{
                            fontFamily: fonts.mono,
                            fontSize: 10,
                            color: c.mutedForeground,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {event.time}
                        </Text>
                        <Text
                          numberOfLines={2}
                          style={{
                            fontFamily: fonts.sansMedium,
                            fontSize: text.caption,
                            color: event.done ? c.mutedForeground : c.foreground,
                            textDecorationLine: event.done ? 'line-through' : 'none',
                          }}
                        >
                          {event.title}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
                    Free day
                  </Text>
                )}
              </Pressable>
            )
          })}
        </ScrollView>
      </Section>

      <Section title="Upcoming">
        <Card padded={!upcoming.length}>
          {upcoming.length ? (
            upcoming.map((entry, index) => (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                accessibilityLabel={entry.title}
                onPress={() => openEditEntry(entry)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingLeft: 16,
                  paddingRight: 8,
                  paddingVertical: 14,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: c.line,
                  backgroundColor: pressed ? c.overline : 'transparent',
                })}
              >
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}
                >
                  {entry.title}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: text.micro,
                    color: c.mutedForeground,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatDateShort(entry.entry_date)}
                </Text>
                <RowMenuButton
                  accessibilityLabel={`${entry.title}, more options`}
                  onPress={() => entryActions(entry.id)}
                />
              </Pressable>
            ))
          ) : (
            <EmptyState
              title="Nothing coming up"
              description="Add an entry to a day this week, or plan something further out."
              action={
                <Button size="sm" variant="primary" onPress={() => openForm()}>
                  Add an entry
                </Button>
              }
            />
          )}
        </Card>
      </Section>

      <PlanForm
        visible={formOpen}
        date={draftDate}
        record={record}
        onClose={() => {
          setFormOpen(false)
          setDraftDate(null)
          setRecord(null)
        }}
      />
      {sheet}
    </Screen>
  )
}
