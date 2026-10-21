import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  CalendarBlank,
  Check,
  CheckCircle,
  PencilSimple,
  Plus,
  Sparkle,
  Trash,
} from '../icons.js'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Loading from '../components/ui/Loading.jsx'
import MonthCalendar from '../components/ui/MonthCalendar.jsx'
import RowMenuButton from '../components/ui/RowMenuButton.jsx'
import PlanWithAi from '../components/assistant/PlanWithAi.jsx'
import PlanForm from '../components/forms/PlanForm.jsx'
import TaskForm from '../components/forms/TaskForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { useData } from '../data/store.jsx'
import { confirmDelete, reportError } from '../lib/alerts.js'
import { useRowActions } from '../lib/rowActions.jsx'
import { entriesOn, formatDateShort, todayISO, upcomingEntries } from '../lib/analytics.js'
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
    deleteTask,
    toggleTask,
  } = useData()
  const [selectedDate, setSelectedDate] = useState(todayISO())
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
    setPendingIds((prev) => [...prev, id])
    try {
      await run(id, done)
    } catch (cause) {
      reportError(cause)
    } finally {
      setPendingIds((prev) => prev.filter((value) => value !== id))
    }
  }

  const openForm = (date) => {
    setRecord(null)
    setDraftDate(date ?? selectedDate)
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
          key: 'delete',
          label: 'Delete',
          icon: Trash,
          destructive: true,
          onPress: () => confirmDelete(entry.title, () => deletePlanEntry(id).catch(reportError)),
        },
      ],
    })
  }

  const taskActions = (task) =>
    open({
      title: task.title,
      subtitle: [task.tag, task.due_date ? formatDateShort(task.due_date) : 'No due date']
        .filter(Boolean)
        .join(' · '),
      actions: [
        { key: 'edit', label: 'Edit', icon: PencilSimple, onPress: () => openEditTask(task) },
        {
          key: 'delete',
          label: 'Delete',
          icon: Trash,
          destructive: true,
          onPress: () => confirmDelete(task.title, () => deleteTask(task.id).catch(reportError)),
        },
      ],
    })

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
  const upcoming = upcomingEntries(data.planner, new Date(), 5)
  const { open: openTasks, done: doneTasks } = splitTasks(data.tasks)
  const selectedIsToday = selectedDate === today

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
        }}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={`${task.title}, ${checked ? 'completed' : 'not completed'}`}
          hitSlop={12}
          onPress={() => applyToggle(toggleTask, task.id, !task.done)}
          style={{ width: 24, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: checked ? c.primary : c.border,
              backgroundColor: checked ? c.primary : 'transparent',
            }}
          >
            {checked ? <Check size={13} weight="bold" color={c.onPrimary} /> : null}
          </View>
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
              fontFamily: fonts.sansMedium,
              fontSize: text.body,
              color: checked ? c.mutedForeground : c.foreground,
              textDecorationLine: checked ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.mono,
              fontSize: text.micro,
              color: due.overdue && !checked ? c.destructiveText : c.mutedForeground,
              fontVariant: ['tabular-nums'],
            }}
          >
            {[task.tag, due.label].filter(Boolean).join(' · ')}
          </Text>
        </Pressable>

        <RowMenuButton
          accessibilityLabel={`${task.title}, more options`}
          onPress={() => taskActions(task)}
        />
      </View>
    )
  }

  return (
    <Screen
      title="Plan"
      subtitle={monthLabel(selectedDate)}
      right={
        <Button size="sm" variant="secondary" onPress={() => openForm(selectedDate)}>
          New
        </Button>
      }
    >
      <Section
        title="Tasks"
        action={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {openTasks.length ? (
              <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                {openTasks.length} open
              </Text>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              icon={Plus}
              onPress={openNewTask}
              accessibilityLabel="Add task"
            >
              Add
            </Button>
          </View>
        }
      >
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
                onPress={() => setDoneOpen((value) => !value)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: pressed ? c.overline : 'transparent',
                })}
              >
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
                  {doneTasks.length} completed
                </Text>
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
                  {doneOpen ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
              {doneOpen ? doneTasks.map((task, index) => renderTask(task, index === 0)) : null}
            </View>
          ) : null}
        </Card>
      </Section>

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
            onSelectDate={setSelectedDate}
            entries={data.planner}
          />
        </Card>
      </Section>

      <Section
        title={selectedIsToday ? `Today · ${fullDateLabel(selectedDate)}` : fullDateLabel(selectedDate)}
        action={
          <Button
            size="sm"
            variant="ghost"
            icon={Plus}
            onPress={() => openForm(selectedDate)}
            accessibilityLabel={`Add entry on ${fullDateLabel(selectedDate)}`}
          >
            Add
          </Button>
        }
      >
        <Card padded={!dayEntries.length}>
          {dayEntries.length ? (
            dayEntries.map((entry, index) => {
              const checked = isPending(entry.id) ? !entry.done : entry.done
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
                }}
              >
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={`${entry.title}, ${checked ? 'completed' : 'not completed'}`}
                  hitSlop={12}
                  onPress={() => applyToggle(togglePlanEntry, entry.id, !entry.done)}
                  style={{ width: 24, height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      borderColor: checked ? c.primary : c.border,
                      backgroundColor: checked ? c.primary : 'transparent',
                    }}
                  >
                    {checked ? <Check size={13} weight="bold" color={c.onPrimary} /> : null}
                  </View>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.title}, edit entry`}
                  onPress={() => openEditEntry(entry)}
                  style={({ pressed }) => ({ flex: 1, minWidth: 0, gap: 2, opacity: pressed ? 0.7 : 1 })}
                >
                  <Text
                    numberOfLines={2}
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: text.body,
                      color: checked ? c.mutedForeground : c.foreground,
                      textDecorationLine: checked ? 'line-through' : 'none',
                    }}
                  >
                    {entry.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: text.micro,
                      color: c.mutedForeground,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {[entry.start_time ? formatClock12(entry.start_time) : 'Anytime', entry.tag]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
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
              title="Nothing planned"
              description={
                selectedIsToday
                  ? 'Add a time block for today, or pick another day on the calendar.'
                  : 'Add an entry for this day, or choose another date.'
              }
              action={
                <Button size="sm" variant="primary" onPress={() => openForm(selectedDate)}>
                  Add an entry
                </Button>
              }
            />
          )}
        </Card>
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
              description="Add an entry to a day this month, or plan something further out."
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
