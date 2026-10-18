import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { weekPlan } from '../data/mock.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

const TODAY_INDEX = 4

const UPCOMING = [
  { when: 'Tomorrow · 10:00', what: 'Deep work block' },
  { when: 'Wed · 13:00', what: 'Proposal draft' },
  { when: 'Thu · 09:30', what: 'Finance lesson 35' },
  { when: 'Fri · 11:00', what: 'Pay bills' },
]

export default function Planner() {
  const { c, fonts, radius, text } = useTheme()

  return (
    <Screen title="Plan" subtitle="Week 42 · Mon 13 — Sun 19 Oct">
      <Section title="This week">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingRight: 4 }}
        >
          {weekPlan.map((day, index) => {
            const isToday = index === TODAY_INDEX
            return (
              <View
                key={day.day}
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
                    {day.date}
                  </Text>
                </View>

                {day.events.length ? (
                  <View style={{ gap: 8 }}>
                    {day.events.map((event) => (
                      <View key={event.id} style={{ gap: 1 }}>
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
                          style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.foreground }}
                        >
                          {event.title}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
                    Free day
                  </Text>
                )}
              </View>
            )
          })}
        </ScrollView>
      </Section>

      <Section title="Upcoming">
        <Card>
          {UPCOMING.map((item, index) => (
            <View
              key={item.what}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                borderTopColor: c.line,
              }}
            >
              <Text
                numberOfLines={1}
                style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}
              >
                {item.what}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.mono,
                  fontSize: text.micro,
                  color: c.mutedForeground,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {item.when}
              </Text>
            </View>
          ))}
        </Card>
      </Section>
    </Screen>
  )
}
