import { StyleSheet, Text, View } from 'react-native'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { courses, kpis, weeklyStudy } from '../data/mock.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

const MAX_HOURS = Math.max(...weeklyStudy.map((day) => day.hours), 1)
const studyHours = weeklyStudy.reduce((sum, day) => sum + day.hours, 0)

export default function Learning() {
  const { c, fonts, text } = useTheme()

  return (
    <Screen title="Learning" subtitle="Courses, study hours and streaks" left="back">
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <StatCard label="Current streak" value={`${kpis.learningStreak} days`} hint="Log a session daily" />
        <StatCard
          label="This week"
          value={`${studyHours}h`}
          hint={`of ${kpis.learningGoalHours}h goal`}
        />
      </View>

      <Section title="Study hours">
        <Card padded>
          <View
            style={{ height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}
            accessible
            accessibilityLabel={`Study hours this week: ${weeklyStudy
              .map((day) => `${day.day} ${day.hours} hours`)
              .join(', ')}`}
          >
            {weeklyStudy.map((day) => (
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
                    height: `${Math.round((day.hours / MAX_HOURS) * 100)}%`,
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

      <Section title="Active courses">
        <Card>
          {courses.map((course, index) => (
            <View
              key={course.id}
              style={{
                gap: 10,
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                borderTopColor: c.line,
              }}
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
              <Text
                numberOfLines={1}
                style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}
              >
                {course.next}
              </Text>
            </View>
          ))}
        </Card>
      </Section>
    </Screen>
  )
}
