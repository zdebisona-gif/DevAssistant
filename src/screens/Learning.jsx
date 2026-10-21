import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { BookOpen, PencilSimple, Play, Sparkle, Trash } from '../icons.js'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Loading from '../components/ui/Loading.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import RowMenuButton from '../components/ui/RowMenuButton.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import GenerateCourse from '../components/assistant/GenerateCourse.jsx'
import PlanWithAi from '../components/assistant/PlanWithAi.jsx'
import CourseForm from '../components/forms/CourseForm.jsx'
import PlanForm from '../components/forms/PlanForm.jsx'
import SessionForm from '../components/forms/SessionForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { LEARNING_GOAL_HOURS } from '../data/constants.js'
import { formatElapsed, useFocus } from '../data/focus.jsx'
import { useData } from '../data/store.jsx'
import { confirmDelete, reportError } from '../lib/alerts.js'
import { formatClock12 } from '../lib/format.js'
import { continueTarget, courseProgress, coursesTree, learningStats } from '../lib/learning.js'
import { useRowActions } from '../lib/rowActions.jsx'
import {
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
  const router = useRouter()
  const { data, loading, error, reload, deleteCourse, deleteSession } = useData()
  const { active, session, elapsedMs, start, stop, cancel } = useFocus()
  const [courseOpen, setCourseOpen] = useState(false)
  const [courseRecord, setCourseRecord] = useState(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [sessionRecord, setSessionRecord] = useState(null)
  const [sessionDefaults, setSessionDefaults] = useState(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
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

  const courseMenu = (course) =>
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
  const stats = learningStats(data)
  const target = continueTarget(data)
  const targetProgress = target ? courseProgress(target.course.id, data) : null
  const blocks = todayStudyBlocks(data.planner)
  const recent = recentSessions(data.sessions, 5)
  const courseName = (id) => data.courses.find((course) => course.id === id)?.name

  return (
    <Screen title="Learning" subtitle="Courses, lessons and study hours" left="back" tabbed={false}>
      {target ? (
        <Section title="Continue learning">
          <Card padded>
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
              <ProgressBar label="Course progress" value={targetProgress.pct} percentOnly />
              <Button
                variant="primary"
                icon={Play}
                onPress={() => router.push(`/lesson/${target.lesson.id}`)}
              >
                Continue
              </Button>
            </View>
          </Card>
        </Section>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <StatCard
          label="Active courses"
          value={String(stats.activeCourses)}
          hint={`${stats.courses} total`}
        />
        <StatCard
          label="Lessons done"
          value={`${stats.completedLessons} / ${stats.totalLessons}`}
          hint={`${stats.pct}% overall`}
        />
      </View>

      <Section
        title="My courses"
        action={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button size="sm" variant="ghost" icon={Sparkle} onPress={() => setGenOpen(true)}>
              Generate
            </Button>
            <Button size="sm" variant="ghost" onPress={openNewCourse}>
              Add
            </Button>
          </View>
        }
      >
        <Card padded={!trees.length}>
          {trees.length ? (
            trees.map((tree, index) => {
              const logged = courseWeekHours(data.sessions, tree.id)
              const targetHours = Number(tree.course.weekly_target_hours) || 0
              const weekPct = targetHours > 0 ? Math.min(100, Math.round((logged / targetHours) * 100)) : 0
              return (
                <Pressable
                  key={tree.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${tree.name}, ${tree.detail}`}
                  onPress={() => router.push(`/course/${tree.id}`)}
                  style={({ pressed }) => ({
                    gap: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 16,
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
                      onPress={() => courseMenu(tree.course)}
                    />
                  </View>
                  {tree.description ? (
                    <Text
                      numberOfLines={2}
                      style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.mutedForeground }}
                    >
                      {tree.description}
                    </Text>
                  ) : null}
                  <ProgressBar label="Progress" value={tree.pct} percentOnly />
                  {targetHours > 0 ? (
                    <ProgressBar
                      label={`This week · ${logged}h of ${targetHours}h`}
                      value={weekPct}
                      percentOnly
                    />
                  ) : null}
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
              )
            })
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
      </Section>

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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button size="sm" variant="ghost" onPress={() => setPlanOpen(true)}>
              Plan
            </Button>
            <Button size="sm" variant="ghost" icon={Sparkle} onPress={() => setAiOpen(true)}>
              Plan with AI
            </Button>
          </View>
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

      <Section
        title="Study hours"
        action={
          <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
            {streak} day streak · {hours}h of {LEARNING_GOAL_HOURS}h
          </Text>
        }
      >
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
                accessibilityLabel="Session"
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
      <PlanForm visible={planOpen} tag="Study" onClose={() => setPlanOpen(false)} />
      <PlanWithAi visible={aiOpen} defaultScope="study" onClose={() => setAiOpen(false)} />
      <GenerateCourse visible={genOpen} onClose={() => setGenOpen(false)} />
      {sheet}
    </Screen>
  )
}
