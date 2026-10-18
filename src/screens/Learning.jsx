import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Loading from '../components/ui/Loading.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import CourseForm from '../components/forms/CourseForm.jsx'
import SessionForm from '../components/forms/SessionForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { LEARNING_GOAL_HOURS } from '../data/constants.js'
import { useData } from '../data/store.jsx'
import { recordActions } from '../lib/alerts.js'
import { courseRow, currentStreak, weekHours, weekStack } from '../lib/analytics.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

export default function Learning() {
  const { c, fonts, text } = useTheme()
  const { data, loading, error, reload, deleteCourse } = useData()
  const [courseOpen, setCourseOpen] = useState(false)
  const [courseRecord, setCourseRecord] = useState(null)
  const [sessionOpen, setSessionOpen] = useState(false)

  const openNewCourse = () => {
    setCourseRecord(null)
    setCourseOpen(true)
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
  const courses = data.courses.map(courseRow)
  const maxHours = Math.max(...week.map((day) => day.hours), 1)

  return (
    <Screen title="Learning" subtitle="Courses, study hours and streaks" left="back">
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <StatCard label="Current streak" value={`${streak} days`} hint="Log a session daily" />
        <StatCard label="This week" value={`${hours}h`} hint={`of ${LEARNING_GOAL_HOURS}h goal`} />
      </View>

      <Section
        title="Study hours"
        action={
          <Button size="sm" variant="ghost" onPress={() => setSessionOpen(true)}>
            Log
          </Button>
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
        title="Active courses"
        action={
          <Button size="sm" variant="ghost" onPress={openNewCourse}>
            Add
          </Button>
        }
      >
        <Card padded={!courses.length}>
          {courses.length ? (
            courses.map((course, index) => (
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
                {course.next ? (
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}
                  >
                    {course.next}
                  </Text>
                ) : null}
              </Pressable>
            ))
          ) : (
            <EmptyState
              title="No courses yet"
              description="Add a course to track units and see your progress build up."
              action={
                <Button size="sm" variant="primary" onPress={openNewCourse}>
                  Add a course
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
      <SessionForm visible={sessionOpen} onClose={() => setSessionOpen(false)} />
    </Screen>
  )
}
