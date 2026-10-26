import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  CalendarBlank,
  CheckCircle,
  PencilSimple,
  Plus,
  Sparkle,
  Trash,
  WarningCircle,
} from '../icons.js'
import Button from '../components/ui/Button.jsx'
import CheckBox from '../components/ui/CheckBox.jsx'
import Collapse from '../components/ui/Collapse.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import FadeSwap from '../components/ui/FadeSwap.jsx'
import Loading from '../components/ui/Loading.jsx'
import MissedBadge from '../components/ui/MissedBadge.jsx'
import MonthCalendar from '../components/ui/MonthCalendar.jsx'
import PriorityBadge from '../components/ui/PriorityBadge.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import RowMenuButton from '../components/ui/RowMenuButton.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'
import PlanWithAi from '../components/assistant/PlanWithAi.jsx'
import PlanForm from '../components/forms/PlanForm.jsx'
import TaskForm from '../components/forms/TaskForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { useData } from '../data/store.jsx'
import { confirmDelete, reportError } from '../lib/alerts.js'
import { useRowActions } from '../lib/rowActions.jsx'
import { entriesOn, formatDateShort, isPlanEntryMissed, todayISO } from '../lib/analytics.js'
import { formatClock12 } from '../lib/format.js'
import { splitTasks, taskDueMeta } from '../lib/tasks.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

function fullDateLabel(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function monthLabel(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export default function Planner() {
  const { c, fonts, radius, text } = useTheme()
  const {
    data,
    loading,
    error,
    reload,
    deletePlanEntry,
    togglePlanEntry,
    updatePlanEntry,
    deleteTask,
    toggleTask,
    updateTask,
  } = useData()
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [tab, setTab] = useState('day')
  const [formOpen, setFormOpen] = useState(false)
  const [draftDate, setDraftDate] = useState(null)
  const [record, setRecord] = useState(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [taskRecord, setTaskRecord] = useState(null)
  const [taskFormKey, setTaskFormKey] = useState(0)
  const [doneOpen, setDoneOpen] = useState(false)
  const [pendingIds, setPendingIds] = useState([])
  const { open, sheet } = useRowActions()

  const isPending = (id) => pendingIds.includes(id)

  const applyToggle = async (run, id, done) => {
    if (isPending(id)) return
    Haptics.selectionAsync().catch(() => {})
    setPendingIds((prev) => [...prev, id])
    try {
      await run(id, done)
    } catch (cause) {
      reportError(cause)
    } finally {
      setPendingIds((prev) => prev.filter((value) => value !== id))
    }
  }

  const togglePriority = async (row, update) => {
    Haptics.selectionAsync().catch(() => {})
    try {
      await update(row.id, { priority: !row.priority })
    } catch (cause) {
      reportError(cause)
    }
  }

  const openForm = (date) => {
    const target = date ?? selectedDate
    if (target < todayISO()) return
    setRecord(null)
    setDraftDate(target)
    setFormOpen(true)
  }

  const openEditEntry = (entry) => {
    setRecord(entry)
    setDraftDate(null)
    setFormOpen(true)
  }

  const openNewTask = () => {
    setTaskRecord(null)
    setTaskFormKey((key) => key + 1)
    setTaskOpen(true)
  }

  const openEditTask = (task) => {
    setTaskRecord(task)
    setTaskFormKey((key) => key + 1)
    setTaskOpen(true)
  }

  const entryActions = (id) => {
    const entry = data.planner.find((item) => item.id === id)
    if (!entry) return
    open({
      title: entry.title,
      subtitle: `${formatDateShort(entry.entry_date)}${
        entry.start_time ? ` · ${formatClock12(entry.start_time)}` : ''
      }`,
      actions: [
        { key: 'edit', label: 'Edit', icon: PencilSimple, onPress: () => openEditEntry(entry) },
        {
          key: 'priority',
          label: entry.priority ? 'Remove priority' : 'Mark as priority',
          icon: WarningCircle,
          onPress: () => togglePriority(entry, updatePlanEntry),
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: Trash,
          destructive: true,
          onPress: () => confirmDelete(entry.title, () => deletePlanEntry(id).catch(reportError)),
        },
      ],
    })
  }

  const taskActions = (task) => {
    const due = taskDueMeta(task)
    return open({
      title: task.title,
      subtitle: [task.priority ? 'Priority' : null, task.tag, due.label]
        .filter(Boolean)
        .join(' · '),
      actions: [
        { key: 'edit', label: 'Edit', icon: PencilSimple, onPress: () => openEditTask(task) },
        {
          key: 'priority',
          label: task.priority ? 'Remove priority' : 'Mark as priority',
          icon: WarningCircle,
          onPress: () => togglePriority(task, updateTask),
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: Trash,
          destructive: true,
          onPress: () => confirmDelete(task.title, () => deleteTask(task.id).catch(reportError)),
        },
      ],
    })
  }

  if (loading) {
    return (
      <Screen title="Plan" subtitle="Calendar and tasks">
        <Loading label="Loading your plan" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title="Plan" subtitle="Calendar and tasks">
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    )
  }

  const today = todayISO()
  const dayEntries = entriesOn(data.planner, selectedDate)
  const { open: openTasks, done: doneTasks } = splitTasks(data.tasks)
  const selectedIsToday = selectedDate === today
  const selectedIsPast = selectedDate < today
  const tasksKey = [...openTasks, ...doneTasks]
    .map(
      (task) =>
        `${task.id}:${task.done}:${task.priority}:${task.due_date || ''}:${task.due_time || ''}`,
    )
    .join('|')
  const dayKey = dayEntries
    .map((entry) => `${entry.id}:${entry.done}:${entry.priority}`)
    .join('|')
  const planKey = `${tab}:${selectedDate}:${tab === 'tasks' ? tasksKey : dayKey}`

  const renderTask = (task, first) => {
    const due = taskDueMeta(task)
    const checked = isPending(task.id) ? !task.done : task.done
    return (
      <View
        key={task.id}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingLeft: 16,
          paddingRight: 8,
          paddingVertical: 10,
          borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: c.line,
          backgroundColor: task.priority && !checked ? c.accentSoft : 'transparent',
        }}
      >
        {task.priority && !checked ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              backgroundColor: c.accent,
            }}
          />
        ) : null}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked, disabled: isPending(task.id) }}
          accessibilityLabel={`${task.title}, ${checked ? 'completed' : 'not completed'}${
            task.priority ? ', priority' : ''
          }`}
          disabled={isPending(task.id)}
          hitSlop={8}
          onPress={() => applyToggle(toggleTask, task.id, !task.done)}
          style={{
            width: 32,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isPending(task.id) ? 0.6 : 1,
          }}
        >
          <CheckBox checked={checked} borderRadius={radius.sm} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${task.title}, edit task`}
          onPress={() => openEditTask(task)}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, gap: 2, opacity: pressed ? 0.7 : 1 })}
        >
          <Text
            numberOfLines={2}
            style={{
              fontFamily:
                task.priority && !checked ? fonts.sansSemiBold : fonts.sansMedium,
              fontSize: text.body,
              color: checked ? c.mutedForeground : c.foreground,
              textDecorationLine: checked ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {task.priority && !checked ? <PriorityBadge /> : null}
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                fontFamily: fonts.mono,
                fontSize: text.micro,
                color: due.overdue && !checked ? c.destructiveText : c.mutedForeground,
                fontVariant: ['tabular-nums'],
              }}
            >
              {[task.tag, due.label].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </Pressable>

        <RowMenuButton
          accessibilityLabel={`${task.title}, more options`}
          onPress={() => taskActions(task)}
        />
      </View>
    )
  }

  return (
    <Screen title="Plan" subtitle={monthLabel(selectedDate)}>
      <Reveal distance={6}>
        <Section
          title="Calendar"
          action={
            <Button size="sm" variant="ghost" icon={Sparkle} onPress={() => setAiOpen(true)}>
              Plan with AI
            </Button>
          }
        >
          <Card style={{ padding: 12 }}>
            <MonthCalendar
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date)
                setTab('day')
              }}
              entries={data.planner}
            />
          </Card>
        </Section>
      </Reveal>

      <Reveal delay={40}>
        <Section
          title="Plan items"
          action={
            <Button
              size="sm"
              variant="ghost"
              icon={Plus}
              onPress={tab === 'tasks' ? openNewTask : () => openForm(selectedDate)}
              disabled={tab === 'day' && selectedIsPast}
              accessibilityLabel={
                tab === 'tasks'
                  ? 'Add task'
                  : selectedIsPast
                    ? 'Past days cannot be planned'
                    : `Add entry on ${fullDateLabel(selectedDate)}`
              }
            >
              {tab === 'tasks' ? 'Add task' : 'Add entry'}
            </Button>
          }
        >
        <SegmentedControl
          accessibilityLabel="Tasks and day plan"
          value={tab}
          onChange={setTab}
          options={[
            { key: 'tasks', label: 'Tasks', count: openTasks.length },
            { key: 'day', label: 'Day plan', count: dayEntries.length },
          ]}
        />

        <FadeSwap swapKey={planKey}>
          {tab === 'tasks' ? (
            <Card padded={!openTasks.length && !doneTasks.length}>
              {openTasks.length ? (
                openTasks.map((task, index) => renderTask(task, index === 0))
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title={doneTasks.length ? 'All caught up' : 'No tasks yet'}
                  description={
                    doneTasks.length
                      ? 'Add something new, or reopen a completed task below.'
                      : 'Keep everyday items here — they stay separate from your calendar.'
                  }
                  action={
                    <Button size="sm" variant="primary" onPress={openNewTask}>
                      Add a task
                    </Button>
                  }
                />
              )}

              {doneTasks.length ? (
                <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${doneTasks.length} completed tasks`}
                    accessibilityState={{ expanded: doneOpen }}
                    onPress={() => setDoneOpen((value) => !value)}
                    style={({ pressed }) => ({
                      minHeight: 48,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      backgroundColor: pressed ? c.overline : 'transparent',
                    })}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.sansMedium,
                        fontSize: text.caption,
                        color: c.mutedForeground,
                      }}
                    >
                      {doneTasks.length} completed
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.sansMedium,
                        fontSize: text.caption,
                        color: c.primaryFg,
                      }}
                    >
                      {doneOpen ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                  <Collapse open={doneOpen}>
                    <View>{doneTasks.map((task, index) => renderTask(task, index === 0))}</View>
                  </Collapse>
                </View>
              ) : null}
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  fontFamily: fonts.mono,
                  fontSize: text.micro,
                  color: c.mutedForeground,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {selectedIsToday
                  ? `Today · ${fullDateLabel(selectedDate)}`
                  : fullDateLabel(selectedDate)}
              </Text>

              <Card padded={!dayEntries.length}>
                {dayEntries.length ? (
                  dayEntries.map((entry, index) => {
                    const checked = isPending(entry.id) ? !entry.done : entry.done
                    const missed = !checked && isPlanEntryMissed(entry)
                    return (
                      <View
                        key={entry.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          paddingLeft: 16,
                          paddingRight: 8,
                          paddingVertical: 10,
                          borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                          borderTopColor: c.line,
                          backgroundColor: missed
                            ? c.destructiveSoft
                            : entry.priority && !checked
                              ? c.accentSoft
                              : 'transparent',
                        }}
                      >
                        {missed || (entry.priority && !checked) ? (
                          <View
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: 3,
                              backgroundColor: missed ? c.destructive : c.accent,
                            }}
                          />
                        ) : null}
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked, disabled: isPending(entry.id) }}
                          accessibilityLabel={`${entry.title}, ${checked ? 'completed' : 'not completed'}${
                            entry.priority ? ', priority' : ''
                          }${missed ? ', missed' : ''}`}
                          disabled={isPending(entry.id)}
                          hitSlop={8}
                          onPress={() => applyToggle(togglePlanEntry, entry.id, !entry.done)}
                          style={{
                            width: 32,
                            height: 48,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isPending(entry.id) ? 0.6 : 1,
                          }}
                        >
                          <CheckBox checked={checked} borderRadius={radius.sm} />
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${entry.title}, edit entry`}
                          onPress={() => openEditEntry(entry)}
                          style={({ pressed }) => ({
                            flex: 1,
                            minWidth: 0,
                            gap: 2,
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Text
                            numberOfLines={2}
                            style={{
                              fontFamily:
                                entry.priority && !checked ? fonts.sansSemiBold : fonts.sansMedium,
                              fontSize: text.body,
                              color: checked ? c.mutedForeground : c.foreground,
                              textDecorationLine: checked ? 'line-through' : 'none',
                            }}
                          >
                            {entry.title}
                          </Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 6,
                            }}
                          >
                            {missed ? <MissedBadge /> : null}
                            {entry.priority && !checked ? <PriorityBadge /> : null}
                            <Text
                              numberOfLines={1}
                              style={{
                                flexShrink: 1,
                                fontFamily: fonts.mono,
                                fontSize: text.micro,
                                color: missed ? c.destructiveText : c.mutedForeground,
                                fontVariant: ['tabular-nums'],
                              }}
                            >
                              {[
                                entry.start_time ? formatClock12(entry.start_time) : 'Anytime',
                                entry.tag,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          </View>
                        </Pressable>

                        <RowMenuButton
                          accessibilityLabel={`${entry.title}, more options`}
                          onPress={() => entryActions(entry.id)}
                        />
                      </View>
                    )
                  })
                ) : (
                  <EmptyState
                    icon={CalendarBlank}
                    title={selectedIsPast ? 'Past day' : 'Nothing planned'}
                    description={
                      selectedIsPast
                        ? 'Past days are view only. Pick today or a later date to plan.'
                        : selectedIsToday
                          ? 'Add a time block for today.'
                          : 'Add an entry for this day.'
                    }
                    action={
                      selectedIsPast ? undefined : (
                        <Button size="sm" variant="primary" onPress={() => openForm(selectedDate)}>
                          Add an entry
                        </Button>
                      )
                    }
                  />
                )}
              </Card>
            </View>
          )}
        </FadeSwap>
        </Section>
      </Reveal>

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
      <TaskForm
        key={taskFormKey}
        visible={taskOpen}
        record={taskRecord}
        onClose={() => {
          setTaskOpen(false)
          setTaskRecord(null)
        }}
      />
      <PlanWithAi visible={aiOpen} defaultScope="general" onClose={() => setAiOpen(false)} />
      {sheet}
    </Screen>
  )
}
