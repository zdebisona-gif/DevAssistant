import { ScrollView, StyleSheet, Pressable, Text, View } from 'react-native'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { recentNotes } from '../data/mock.js'
import { useTheme } from '../theme/ThemeProvider.jsx'
import { useMemo, useState } from 'react'

const FILTERS = ['All', 'Work', 'Study', 'Idea', 'Personal']

export default function Notes() {
  const { c, fonts, radius, text } = useTheme()
  const [filter, setFilter] = useState('All')

  const notes = useMemo(
    () => (filter === 'All' ? recentNotes : recentNotes.filter((note) => note.tag === filter)),
    [filter],
  )

  return (
    <Screen title="Notes" subtitle="Capture, then let Zen-I connect them">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {FILTERS.map((tag) => {
          const active = filter === tag
          return (
            <Pressable
              key={tag}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(tag)}
              style={{
                height: 36,
                justifyContent: 'center',
                borderRadius: radius.pill,
                paddingHorizontal: 14,
                backgroundColor: active ? c.primary : 'transparent',
                borderWidth: 1,
                borderColor: active ? c.primary : c.border,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: text.caption,
                  color: active ? c.onPrimary : c.mutedForeground,
                }}
              >
                {tag}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {notes.length ? (
        <Section title="All notes" action={<Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>{notes.length}</Text>}>
          <Card>
            {notes.map((note, index) => (
              <View
                key={note.id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  gap: 4,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: c.line,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}
                  >
                    {note.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: text.micro,
                      letterSpacing: 0.4,
                      textTransform: 'uppercase',
                      color: c.mutedForeground,
                    }}
                  >
                    {note.tag}
                  </Text>
                </View>
                <Text
                  numberOfLines={2}
                  style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.mutedForeground }}
                >
                  {note.snippet}
                </Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                  {note.updated}
                </Text>
              </View>
            ))}
          </Card>
        </Section>
      ) : (
        <Card>
          <EmptyState
            title={`No notes tagged "${filter}"`}
            description="Try another tag, or clear the filter to see all notes."
            action={
              <Pressable accessibilityRole="button" onPress={() => setFilter('All')} hitSlop={8}>
                <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.caption, color: c.primaryFg }}>
                  Clear filter
                </Text>
              </Pressable>
            }
          />
        </Card>
      )}
    </Screen>
  )
}
