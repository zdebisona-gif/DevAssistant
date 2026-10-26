import * as Haptics from 'expo-haptics'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMemo, useState } from 'react'
import { Eye, PencilSimple, Plus, Sparkle, Star, Trash } from '../icons.js'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import FadeSwap from '../components/ui/FadeSwap.jsx'
import IconButton from '../components/ui/IconButton.jsx'
import Loading from '../components/ui/Loading.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import GenerateNote from '../components/assistant/GenerateNote.jsx'
import NoteForm from '../components/forms/NoteForm.jsx'
import NoteView from '../components/views/NoteView.jsx'
import RowMenuButton from '../components/ui/RowMenuButton.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { NOTE_TAGS } from '../data/constants.js'
import { useData } from '../data/store.jsx'
import { confirmDelete, reportError } from '../lib/alerts.js'
import { relativeTime } from '../lib/analytics.js'
import { NOTE_DRAFT_NOTICE } from '../lib/noteDraft.js'
import { useRowActions } from '../lib/rowActions.jsx'
import { useTheme } from '../theme/ThemeProvider.jsx'

export default function Notes() {
  const { c, fonts, radius, text } = useTheme()
  const { data, loading, error, reload, deleteNote, updateNote } = useData()
  const [filter, setFilter] = useState('All')
  const [formOpen, setFormOpen] = useState(false)
  const [record, setRecord] = useState(null)
  const [defaults, setDefaults] = useState(null)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [importantPending, setImportantPending] = useState(null)
  const { open, sheet } = useRowActions()

  const notes = data.notes
  const filters = useMemo(() => {
    const extra = notes
      .map((note) => note.tag)
      .filter((tag) => tag && tag !== 'Important' && !NOTE_TAGS.includes(tag))
    return ['All', 'Important', ...NOTE_TAGS, ...Array.from(new Set(extra))]
  }, [notes])

  const visible = useMemo(() => {
    const filtered =
      filter === 'All'
        ? notes
        : filter === 'Important'
          ? notes.filter((note) => note.important)
          : notes.filter((note) => note.tag === filter)
    return [...filtered].sort((a, b) => {
      const priority = Number(Boolean(b.important)) - Number(Boolean(a.important))
      if (priority) return priority
      return String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? ''))
    })
  }, [notes, filter])

  const visibleKey = `${filter}:${visible
    .map((note) => `${note.id}:${note.important ? 'important' : 'normal'}`)
    .join(',')}`

  const selectFilter = (tag) => {
    if (tag === filter) return
    Haptics.selectionAsync().catch(() => {})
    setFilter(tag)
  }

  const toggleImportant = async (note) => {
    if (!note || importantPending) return
    Haptics.selectionAsync().catch(() => {})
    setImportantPending(note.id)
    try {
      const updated = await updateNote(note.id, { important: !note.important })
      if (updated?.id) {
        setViewing((current) => (current?.id === updated.id ? updated : current))
      }
    } catch (cause) {
      reportError(cause)
    } finally {
      setImportantPending(null)
    }
  }

  const openNew = () => {
    setRecord(null)
    setDefaults(null)
    setFormOpen(true)
  }

  const openEdit = (note) => {
    setRecord(note)
    setDefaults(null)
    setFormOpen(true)
  }

  const openDraft = (draft) => {
    setGenerateOpen(false)
    setRecord(null)
    setDefaults(draft)
    setFormOpen(true)
  }

  const openActions = (note) =>
    open({
      title: note.title,
      subtitle: note.tag ?? undefined,
      actions: [
        { key: 'view', label: 'View note', icon: Eye, onPress: () => setViewing(note) },
        { key: 'edit', label: 'Edit', icon: PencilSimple, onPress: () => openEdit(note) },
        {
          key: 'important',
          label: note.important ? 'Remove important' : 'Mark important',
          icon: Star,
          onPress: () => toggleImportant(note),
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: Trash,
          destructive: true,
          onPress: () => confirmDelete(note.title, () => deleteNote(note.id).catch(reportError)),
        },
      ],
    })

  const header = (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button
        size="icon"
        variant="secondary"
        icon={Sparkle}
        accessibilityLabel="Generate note with AI"
        onPress={() => setGenerateOpen(true)}
      />
      <Button size="sm" variant="secondary" icon={Plus} onPress={openNew}>
        New note
      </Button>
    </View>
  )

  return (
    <Screen title="Notes" subtitle="Capture, then let Zen-I connect them" right={header}>
      {loading ? (
        <Loading label="Loading notes" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <Reveal distance={6}>
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
                    accessibilityLabel={`Filter by ${tag}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => selectFilter(tag)}
                    style={({ pressed }) => ({
                      height: 48,
                      justifyContent: 'center',
                      borderRadius: radius.pill,
                      paddingHorizontal: 14,
                      backgroundColor: active ? c.primary : 'transparent',
                      borderWidth: 1,
                      borderColor: active ? c.primary : c.border,
                      opacity: pressed ? 0.8 : 1,
                    })}
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
          </Reveal>

          <Reveal delay={40}>
            <FadeSwap swapKey={visible.length ? visibleKey : `empty:${filter}`}>
              {visible.length ? (
                <Section>
                  <Card>
                  {visible.map((note, index) => (
                    <Pressable
                      key={note.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Note: ${note.title}${note.important ? ', important' : ''}`}
                      onPress={() => setViewing(note)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 8,
                        paddingLeft: 16,
                        paddingRight: 8,
                        paddingVertical: 14,
                        borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                        borderTopColor: c.line,
                        backgroundColor: note.important
                          ? c.accentSoft
                          : pressed
                            ? c.overline
                            : 'transparent',
                      })}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
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
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton
                          icon={Star}
                          size={36}
                          iconSize={20}
                          iconWeight={note.important ? 'fill' : 'regular'}
                          color={note.important ? c.accent : c.mutedForeground}
                          accessibilityLabel={
                            note.important
                              ? `Remove ${note.title} from important`
                              : `Mark ${note.title} as important`
                          }
                          disabled={Boolean(importantPending)}
                          onPress={() => toggleImportant(note)}
                          hitSlop={6}
                          ripple={false}
                          pressedBackground={c.overline}
                          style={{ opacity: importantPending ? 0.5 : 1 }}
                          stopPropagation
                        />
                        <RowMenuButton
                          accessibilityLabel={`${note.title}, more options`}
                          onPress={() => openActions(note)}
                        />
                      </View>
                    </Pressable>
                  ))}
                  </Card>
                </Section>
              ) : (
                <Card>
                  {filter === 'Important' ? (
                    <EmptyState
                      icon={Star}
                      title="No important notes"
                      description="Star the notes you need to see first. They stay at the top of Notes."
                      action={
                        <Button size="sm" variant="secondary" onPress={() => selectFilter('All')}>
                          Show all notes
                        </Button>
                      }
                    />
                  ) : filter === 'All' ? (
                    <EmptyState
                      icon={Plus}
                      title="No notes yet"
                      description="Capture an idea, a lesson or a decision. It all lands here."
                      action={
                        <Button size="sm" variant="primary" onPress={openNew}>
                          Write the first note
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      title={`No notes tagged "${filter}"`}
                      description="Try another tag, or clear the filter to see all notes."
                      action={
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => selectFilter('All')}
                          hitSlop={4}
                          style={({ pressed }) => ({
                            minHeight: 48,
                            justifyContent: 'center',
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.caption, color: c.primaryFg }}>
                            Clear filter
                          </Text>
                        </Pressable>
                      }
                    />
                  )}
                </Card>
              )}
            </FadeSwap>
          </Reveal>
        </>
      )}

      <NoteForm
        visible={formOpen}
        record={record}
        defaults={defaults}
        notice={defaults ? NOTE_DRAFT_NOTICE : null}
        onClose={() => {
          setFormOpen(false)
          setRecord(null)
          setDefaults(null)
        }}
      />
      {generateOpen ? (
        <GenerateNote
          visible
          onClose={() => setGenerateOpen(false)}
          onDraft={openDraft}
        />
      ) : null}
      <NoteView
        note={viewing}
        importantBusy={Boolean(importantPending)}
        onToggleImportant={() => toggleImportant(viewing)}
        onClose={() => setViewing(null)}
        onEdit={() => {
          const note = viewing
          setViewing(null)
          if (note) openEdit(note)
        }}
        onDelete={() => {
          if (!viewing) return
          const note = viewing
          confirmDelete(note.title, () => {
            setViewing(null)
            deleteNote(note.id).catch(reportError)
          })
        }}
      />
      {sheet}
    </Screen>
  )
}
