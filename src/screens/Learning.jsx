import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { BookOpen, PencilSimple, Play, Sparkle, Trash } from '../icons.js'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import FadeSwap from '../components/ui/FadeSwap.jsx'
import Loading from '../components/ui/Loading.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import RowMenuButton from '../components/ui/RowMenuButton.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'
import GenerateCourse from '../components/assistant/GenerateCourse.jsx'
import CourseForm from '../components/forms/CourseForm.jsx'
import SessionForm from '../components/forms/SessionForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { LEARNING_GOAL_HOURS } from '../data/constants.js'
import { formatElapsed, useFocus } from '../data/focus.jsx'
import { useData } from '../data/store.jsx'
import { confirmDelete, reportError } from '../lib/alerts.js'
import { formatClock12 } from '../lib/format.js'
import { continueTarget, courseProgress, coursesTree } from '../lib/learning.js'
import { useRowActions } from '../lib/rowActions.jsx'
import {
  currentStreak,
  formatDateShort,
  recentSessions,
  todayStudyBlocks,
  weekHours,
  weekStack,
} from '../lib/analytics.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

function FocusTimer({ session, title, onFinish, onCancel }) {
  const { c, fonts, text } = useTheme()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsed = Math.max(0, now - session.startedAt)

  return (
    <View style={{ gap: 12 }}>
      <Text
        accessible
        numberOfLines={1}
        accessibilityLabel={`Focus timer at ${formatElapsed(elapsed)}`}
        style={{
          fontFamily: fonts.mono,
          fontSize: text.display,
          color: c.foreground,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatElapsed(elapsed)}
      </Text>
      <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="primary" onPress={onFinish} style={{ flex: 1 }}>
          Finish &amp; log
        </Button>
        <Button variant="ghost" onPress={onCancel}>
          Discard
        </Button>
      </View>
    </View>
  )
}

export default function Learning() {
  const { c, fonts, text } = useTheme()
  const router = useRouter()
  const { data, loading, error, reload, deleteCourse, deleteSession } = useData()
  const { active, session, start, stop, cancel } = useFocus()
  const [activity, setActivity] = useState('week')
  const [courseOpen, setCourseOpen] = useState(false)
  const [courseRecord, setCourseRecord] = useState(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [sessionRecord, setSessionRecord] = useState(null)
  const [sessionDefaults, setSessionDefaults] = useState(null)
  const [genOpen, setGenOpen] = useState(false)
  const { open, sheet } = useRowActions()

  const openNewCourse = () => {
    setCourseRecord(null)
    setCourseOpen(true)
  }

  const openEditCourse = (course) => {
    setCourseRecord(course)
    setCourseOpen(true)
  }

  const openLog = (defaults = null) => {
    setSessionRecord(null)
    setSessionDefaults(defaults)
    setSessionOpen(true)
  }

  const courseActions = (course) =>
    open({
      title: course.name,
      subtitle: 'Course',
      actions: [
        {
          key: 'study',
          label: 'Start focus',
          icon: Play,
          onPress: () => start({ courseId: course.id, title: course.name }),
        },
        { key: 'edit', label: 'Edit', icon: PencilSimple, onPress: () => openEditCourse(course) },
        {
          key: 'delete',
          label: 'Delete',
          icon: Trash,
          destructive: true,
          onPress: () =>
            confirmDelete(course.name, () => deleteCourse(course.id).catch(reportError)),
        },
      ],
    })

  const addCourseMenu = () =>
    open({
      title: 'Add a course',
      subtitle: 'Build it yourself or generate a starting point.',
      actions: [
        { key: 'new', label: 'New course', icon: PencilSimple, onPress: openNewCourse },
        { key: 'generate', label: 'Generate with AI', icon: Sparkle, onPress: () => setGenOpen(true) },
      ],
    })

  const sessionActions = (id) => {
    const record = data.sessions.find((item) => item.id === id)
    if (!record) return
    open({
      title: record.takeaway || `${Number(record.hours)}h session`,
      subtitle: formatDateShort(record.studied_on),
      actions: [
        {
          key: 'edit',
          label: 'Edit',
          icon: PencilSimple,
          onPress: () => {
            setSessionRecord(record)
            setSessionDefaults(null)
            setSessionOpen(true)
          },
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: Trash,
          destructive: true,
          onPress: () => confirmDelete(`${Number(record.hours)}h session`, () => deleteSession(id).catch(reportError)),
        },
      ],
    })
  }

  const finishFocus = () => {
    const result = stop()
    if (result) openLog({ hours: result.hours, courseId: result.courseId })
  }

  if (loading) {
    return (
      <Screen title="Learning" subtitle="Courses, lessons and study hours" left="back" tabbed={false}>
        <Loading label="Loading learning" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title="Learning" subtitle="Courses, lessons and study hours" left="back" tabbed={false}>
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    )
  }

  const week = weekStack(data.sessions)
  const hours = weekHours(data.sessions)
  const streak = currentStreak(data.sessions)
  const maxHours = Math.max(...week.map((day) => day.hours), 1)
  const trees = coursesTree(data)
  const target = continueTarget(data)
  const targetProgress = target ? courseProgress(target.course.id, data) : null
  const blocks = todayStudyBlocks(data.planner)
  const recent = recentSessions(data.sessions, 5)
  const activityKey = `${activity}:${data.sessions.map((row) => `${row.id}:${row.hours}`).join('|')}`
  const coursesKey = trees.map((tree) => tree.id).join('|')
  const courseName = (id) => data.courses.find((course) => course.id === id)?.name
  const focusTitle = session?.title || courseName(session?.courseId) || 'Focus session'

  return (
    <Screen title="Learning" subtitle="Courses, lessons and study hours" left="back" tabbed={false}>
      <Section title="Up next">
        <Card padded>
          {active && session ? (
            <FocusTimer
              key={session.startedAt}
              session={session}
              title={focusTitle}
              onFinish={finishFocus}
              onCancel={cancel}
            />
          ) : target ? (
            <View style={{ gap: 12 }}>
              <View style={{ gap: 3 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}
                >
                  {target.course.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}
                >
                  {target.module.title} · {target.lesson.title}
                </Text>
              </View>
              <ProgressBar label="Course progress" value={targetProgress?.pct ?? 0} percentOnly />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  variant="primary"
                  icon={Play}
                  onPress={() => router.push(`/lesson/${target.lesson.id}`)}
                  style={{ flex: 1 }}
                >
                  Continue
                </Button>
                <Button
                  variant="secondary"
                  icon={Play}
                  accessibilityLabel={`Start focus on ${target.course.name}`}
                  onPress={() => start({ courseId: target.course.id, title: target.course.name })}
                >
                  Focus
                </Button>
              </View>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={{ gap: 3 }}>
                <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.heading, color: c.foreground }}>
                  Start a focus session
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 19, color: c.mutedForeground }}>
                  Log time as you study, even without a course.
                </Text>
              </View>
              <Button variant="primary" icon={Play} onPress={() => start()}>
                Start focus
              </Button>
            </View>
          )}
        </Card>
      </Section>

      <Section
        title="My courses"
        action={
          <Button size="sm" variant="ghost" onPress={addCourseMenu}>
            Add
          </Button>
        }
      >
        <FadeSwap swapKey={coursesKey}>
          <Card padded={!trees.length}>
            {trees.length ? (
              trees.map((tree, index) => (
                <Pressable
                  key={tree.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${tree.name}, ${tree.detail}`}
                  onPress={() => router.push(`/course/${tree.id}`)}
                  style={({ pressed }) => ({
                    gap: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: c.line,
                    backgroundColor: pressed ? c.overline : 'transparent',
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}
                    >
                      {tree.name}
                    </Text>
                    <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                      {tree.detail}
                    </Text>
                    <RowMenuButton
                      compact
                      accessibilityLabel={`${tree.name}, more options`}
                      onPress={() => courseActions(tree.course)}
                    />
                  </View>
                  <ProgressBar label="Progress" value={tree.pct} percentOnly />
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}
                  >
                    {tree.next
                      ? `Next · ${tree.next.title}`
                      : tree.total
                        ? 'All lessons complete'
                        : 'No lessons yet'}
                  </Text>
                </Pressable>
              ))
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                description="Build a course out of modules and lessons, then work through it. Track every lesson as you finish it."
                action={
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button size="sm" variant="primary" onPress={openNewCourse}>
                      New course
                    </Button>
                    <Button size="sm" variant="secondary" icon={Sparkle} onPress={() => setGenOpen(true)}>
                      Generate
                    </Button>
                  </View>
                }
              />
            )}
          </Card>
        </FadeSwap>
      </Section>

      <Section title="Today's study">
        <Card padded={!blocks.length}>
          {blocks.length ? (
            blocks.map((block, index) => (
              <View
                key={block.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: c.line,
                }}
              >
                <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                  {block.start_time ? formatClock12(block.start_time) : '—'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}
                >
                  {block.title}
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Play}
                  accessibilityLabel={`Start focus on ${block.title}`}
                  onPress={() => start({ title: block.title })}
                />
              </View>
            ))
          ) : (
            <EmptyState
              title="Nothing scheduled today"
              description="Study blocks from your planner appear here, ready to start."
            />
          )}
        </Card>
      </Section>

      <Section
        title="Activity"
        action={
          activity === 'week' ? (
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}
            >
              {streak} day streak · {hours}h of {LEARNING_GOAL_HOURS}h
            </Text>
          ) : (
            <Button size="sm" variant="ghost" onPress={() => openLog()}>
              Log
            </Button>
          )
        }
      >
        <SegmentedControl
          accessibilityLabel="Learning activity"
          value={activity}
          onChange={setActivity}
          options={[
            { key: 'week', label: 'This week' },
            { key: 'sessions', label: 'Sessions', count: data.sessions.length },
          ]}
        />
        <FadeSwap swapKey={activityKey}>
          {activity === 'week' ? (
            <Card padded>
              <View
                style={{ height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}
                accessible
                accessibilityLabel={`Study hours this week: ${week
                  .map((day) => `${day.day} ${day.hours} hours`)
                  .join(', ')}`}
              >
                {week.map((day) => (
                  <View key={day.day} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                    <Text
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: text.micro,
                        color: c.mutedForeground,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {day.hours || '–'}
                    </Text>
                    <View
                      style={{
                        width: '100%',
                        height: `${Math.round((day.hours / maxHours) * 100)}%`,
                        minHeight: day.hours > 0 ? 6 : 3,
                        borderRadius: 4,
                        backgroundColor: day.hours > 0 ? c.primary : c.muted,
                      }}
                    />
                    <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
                      {day.day}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : (
            <Card padded={!recent.length}>
              {recent.length ? (
                recent.map((record, index) => (
                  <Pressable
                    key={record.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${courseName(record.course_id) || 'Study'}, ${Number(record.hours)} hours on ${formatDateShort(record.studied_on)}`}
                    onPress={() => {
                      setSessionRecord(record)
                      setSessionDefaults(null)
                      setSessionOpen(true)
                    }}
                    style={({ pressed }) => ({
                      gap: 4,
                      paddingLeft: 16,
                      paddingRight: 8,
                      paddingVertical: 14,
                      borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                      borderTopColor: c.line,
                      backgroundColor: pressed ? c.overline : 'transparent',
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text
                        numberOfLines={1}
                        style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}
                      >
                        {courseName(record.course_id) || 'Study'}
                      </Text>
                      <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                        {Number(record.hours)}h · {formatDateShort(record.studied_on)}
                      </Text>
                      <RowMenuButton
                        compact
                        accessibilityLabel="Session, more options"
                        onPress={() => sessionActions(record.id)}
                      />
                    </View>
                    {record.takeaway ? (
                      <Text
                        numberOfLines={1}
                        style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}
                      >
                        {record.takeaway}
                      </Text>
                    ) : null}
                  </Pressable>
                ))
              ) : (
                <EmptyState
                  title="No sessions yet"
                  description="Use the focus timer or log a session to start your streak."
                  action={
                    <Button size="sm" variant="primary" onPress={() => openLog()}>
                      Log a session
                    </Button>
                  }
                />
              )}
            </Card>
          )}
        </FadeSwap>
      </Section>

      <CourseForm
        visible={courseOpen}
        record={courseRecord}
        onClose={() => {
          setCourseOpen(false)
          setCourseRecord(null)
        }}
      />
      <SessionForm
        visible={sessionOpen}
        record={sessionRecord}
        defaults={sessionDefaults}
        onClose={() => {
          setSessionOpen(false)
          setSessionRecord(null)
          setSessionDefaults(null)
        }}
      />
      <GenerateCourse visible={genOpen} onClose={() => setGenOpen(false)} />
      {sheet}
    </Screen>
  )
}
