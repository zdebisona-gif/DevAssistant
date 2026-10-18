import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMemo, useState } from 'react'
import { Plus } from '../icons.js'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Loading from '../components/ui/Loading.jsx'
import NoteForm from '../components/forms/NoteForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { NOTE_TAGS } from '../data/constants.js'
import { useData } from '../data/store.jsx'
import { relativeTime } from '../lib/analytics.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

export default function Notes() {
  const { c, fonts, radius, text } = useTheme()
  const { data, loading, error, reload, deleteNote } = useData()
  const [filter, setFilter] = useState('All')
  const [formOpen, setFormOpen] = useState(false)

  const notes = data.notes
  const filters = useMemo(() => {
    const extra = notes.map((note) => note.tag).filter((tag) => tag && !NOTE_TAGS.includes(tag))
    return ['All', ...NOTE_TAGS, ...Array.from(new Set(extra))]
  }, [notes])

  const visible = filter === 'All' ? notes : notes.filter((note) => note.tag === filter)

  const confirmDelete = (note) => {
    Alert.alert('Delete note', `"${note.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote(note.id).catch(() => {}) },
    ])
  }

  const header = (
    <Button size="sm" variant="secondary" icon={Plus} onPress={() => setFormOpen(true)}>
      New
    </Button>
  )

  return (
    <Screen title="Notes" subtitle="Capture, then let Zen-I connect them" right={header}>
      {loading ? (
        <Loading label="Loading notes" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {filters.map((tag) => {
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

          {visible.length ? (
            <Section
              title={filter === 'All' ? 'All notes' : filter}
              action={
                <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                  {visible.length}
                </Text>
              }
            >
              <Card>
                {visible.map((note, index) => (
                  <Pressable
                    key={note.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Note: ${note.title}`}
                    onLongPress={() => confirmDelete(note)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      gap: 4,
                      borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                      borderTopColor: c.line,
                      backgroundColor: pressed ? c.overline : 'transparent',
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                      <Text
                        numberOfLines={1}
                        style={{ flex: 1, fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}
                      >
                        {note.title}
                      </Text>
                      {note.tag ? (
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
                      ) : null}
                    </View>
                    {note.body ? (
                      <Text
                        numberOfLines={2}
                        style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.mutedForeground }}
                      >
                        {note.body}
                      </Text>
                    ) : null}
                    <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                      {relativeTime(note.updated_at)}
                    </Text>
                  </Pressable>
                ))}
              </Card>
            </Section>
          ) : (
            <Card>
              {filter === 'All' ? (
                <EmptyState
                  icon={Plus}
                  title="No notes yet"
                  description="Capture an idea, a lesson or a decision. It all lands here."
                  action={
                    <Button size="sm" variant="primary" onPress={() => setFormOpen(true)}>
                      Write the first note
                    </Button>
                  }
                />
              ) : (
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
              )}
            </Card>
          )}
        </>
      )}

      <NoteForm visible={formOpen} onClose={() => setFormOpen(false)} />
    </Screen>
  )
}
