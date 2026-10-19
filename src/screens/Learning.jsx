import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Loading from '../components/ui/Loading.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import CourseForm from '../components/forms/CourseForm.jsx'
import PlanForm from '../components/forms/PlanForm.jsx'
import SessionForm from '../components/forms/SessionForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { LEARNING_GOAL_HOURS } from '../data/constants.js'
import { formatElapsed, useFocus } from '../data/focus.jsx'
import { useData } from '../data/store.jsx'
import { Play } from '../icons.js'
import { recordActions } from '../lib/alerts.js'
import {
  courseRow,
  courseWeekHours,
  currentStreak,
  formatDateShort,
  recentSessions,
  todayStudyBlocks,
  weekHours,
  weekStack,
} from '../lib/analytics.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

export default function Learning() {
  const { c, fonts, text } = useTheme()
  const { data, loading, error, reload, deleteCourse, deleteSession } = useData()
  const { active, session, elapsedMs, start, stop, cancel } = useFocus()
  const [courseOpen, setCourseOpen] = useState(false)
  const [courseRecord, setCourseRecord] = useState(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [sessionRecord, setSessionRecord] = useState(null)
  const [sessionDefaults, setSessionDefaults] = useState(null)
  const [planOpen, setPlanOpen] = useState(false)

  const openNewCourse = () => {
    setCourseRecord(null)
    setCourseOpen(true)
  }

  const openLog = (defaults = null) => {
    setSessionRecord(null)
    setSessionDefaults(defaults)
    setSessionOpen(true)
  }

  const courseActions = (id) => {
    const course = data.courses.find((item) => item.id === id)
    if (!course) return
    recordActions({
      title: course.name,
      onEdit: () => {
        setCourseRecord(course)
        setCourseOpen(true)
      },
      onDelete: () => deleteCourse(id).catch(() => {}),
    })
  }

  const sessionActions = (id) => {
    const record = data.sessions.find((item) => item.id === id)
    if (!record) return
    recordActions({
      title: record.takeaway || `${Number(record.hours)}h session`,
      onEdit: () => {
        setSessionRecord(record)
        setSessionDefaults(null)
        setSessionOpen(true)
      },
      onDelete: () => deleteSession(id).catch(() => {}),
    })
  }

  const finishFocus = () => {
    const result = stop()
    if (result) openLog({ hours: result.hours, courseId: result.courseId })
  }

  if (loading) {
    return (
      <Screen title="Learning" subtitle="Courses, study hours and streaks" left="back">
        <Loading label="Loading learning" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title="Learning" subtitle="Courses, study hours and streaks" left="back">
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    )
  }

  const week = weekStack(data.sessions)
  const hours = weekHours(data.sessions)
  const streak = currentStreak(data.sessions)
  const maxHours = Math.max(...week.map((day) => day.hours), 1)
  const courses = data.courses.filter((course) => course.active !== false)
  const blocks = todayStudyBlocks(data.planner)
  const recent = recentSessions(data.sessions, 5)
  const courseName = (id) => data.courses.find((course) => course.id === id)?.name

  return (
    <Screen title="Learning" subtitle="Courses, study hours and streaks" left="back">
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <StatCard label="Current streak" value={`${streak} days`} hint="Log a session daily" />
        <StatCard label="This week" value={`${hours}h`} hint={`of ${LEARNING_GOAL_HOURS}h goal`} />
      </View>

      <Section title="Focus">
        <Card padded>
          {active ? (
            <View style={{ gap: 12 }}>
              <Text
                accessible
                accessibilityLabel={`Focus timer at ${formatElapsed(elapsedMs)}`}
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 34,
                  color: c.foreground,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatElapsed(elapsedMs)}
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
                {session?.title || courseName(session?.courseId) || 'Focus session'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button variant="primary" onPress={finishFocus} style={{ flex: 1 }}>
                  Finish &amp; log
                </Button>
                <Button variant="ghost" onPress={cancel}>
                  Discard
                </Button>
              </View>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: text.body, color: c.mutedForeground }}>
                Start the timer when you sit down; finish and the session logs itself.
              </Text>
              <Button variant="primary" icon={Play} onPress={() => start()}>
                Start focus
              </Button>
            </View>
          )}
        </Card>
      </Section>

      <Section
        title="Today's study"
        action={
          <Button size="sm" variant="ghost" onPress={() => setPlanOpen(true)}>
            Plan
          </Button>
        }
      >
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
                  {block.start_time ? String(block.start_time).slice(0, 5) : '—'}
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
              title="Nothing planned to study"
              description="Add a Study block to today and it shows up here ready to start."
              action={
                <Button size="sm" variant="primary" onPress={() => setPlanOpen(true)}>
                  Plan a study block
                </Button>
              }
            />
          )}
        </Card>
      </Section>

      <Section title="Study hours">
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
                    fontSize: 10,
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
                <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: c.mutedForeground }}>
                  {day.day}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </Section>

      <Section
        title="Active courses"
        action={
          <Button size="sm" variant="ghost" onPress={openNewCourse}>
            Add
          </Button>
        }
      >
        <Card padded={!courses.length}>
          {courses.length ? (
            courses.map((raw, index) => {
              const course = courseRow(raw)
              const logged = courseWeekHours(data.sessions, course.id)
              const target = Number(raw.weekly_target_hours) || 0
              const pct = target > 0 ? Math.min(100, Math.round((logged / target) * 100)) : 0
              return (
                <Pressable
                  key={course.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${course.name}, long press to edit`}
                  onLongPress={() => courseActions(course.id)}
                  style={({ pressed }) => ({
                    gap: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: c.line,
                    backgroundColor: pressed ? c.overline : 'transparent',
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}
                    >
                      {course.name}
                    </Text>
                    <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                      {course.detail}
                    </Text>
                  </View>
                  <ProgressBar label="Progress" value={course.progress} percentOnly />
                  {target > 0 ? (
                    <ProgressBar
                      label={`This week · ${logged}h of ${target}h`}
                      value={pct}
                      percentOnly
                    />
                  ) : (
                    <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
                      {logged}h this week
                    </Text>
                  )}
                  {course.next ? (
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}
                    >
                      Next · {course.next}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Play}
                      onPress={() => start({ courseId: course.id, title: course.name })}
                    >
                      Study
                    </Button>
                  </View>
                </Pressable>
              )
            })
          ) : (
            <EmptyState
              title="No courses yet"
              description="Add a course to track units, set a weekly target and study toward it."
              action={
                <Button size="sm" variant="primary" onPress={openNewCourse}>
                  Add a course
                </Button>
              }
            />
          )}
        </Card>
      </Section>

      <Section
        title="Recent sessions"
        action={
          <Button size="sm" variant="ghost" onPress={() => openLog()}>
            Log
          </Button>
        }
      >
        <Card padded={!recent.length}>
          {recent.length ? (
            recent.map((record, index) => (
              <Pressable
                key={record.id}
                accessibilityRole="button"
                accessibilityLabel={`Session, long press to edit`}
                onLongPress={() => sessionActions(record.id)}
                style={({ pressed }) => ({
                  gap: 4,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: c.line,
                  backgroundColor: pressed ? c.overline : 'transparent',
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}
                  >
                    {courseName(record.course_id) || 'Study'}
                  </Text>
                  <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                    {Number(record.hours)}h · {formatDateShort(record.studied_on)}
                  </Text>
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
      <PlanForm
        visible={planOpen}
        tag="Study"
        onClose={() => setPlanOpen(false)}
      />
    </Screen>
  )
}
