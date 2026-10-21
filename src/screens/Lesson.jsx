import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ArrowLeft, ArrowRight, Check, PencilSimple, Plus, Sparkle, Trash } from '../icons.js'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Loading from '../components/ui/Loading.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import RowMenuButton from '../components/ui/RowMenuButton.jsx'
import LessonQuiz from '../components/assistant/LessonQuiz.jsx'
import LessonTutor from '../components/assistant/LessonTutor.jsx'
import LessonForm from '../components/forms/LessonForm.jsx'
import NoteForm from '../components/forms/NoteForm.jsx'
import NoteView from '../components/views/NoteView.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import { Card } from '../components/ui/Card.jsx'
import { useAiPrefs } from '../data/aiPrefs.jsx'
import { useData } from '../data/store.jsx'
import { confirmDelete, reportError } from '../lib/alerts.js'
import { relativeTime } from '../lib/analytics.js'
import { describeGeminiError, generateLesson, inCooldown } from '../lib/gemini.js'
import { courseProgress, lessonContext, locateLesson } from '../lib/learning.js'
import { useRowActions } from '../lib/rowActions.jsx'
import { useTheme } from '../theme/ThemeProvider.jsx'

const CONTENT_LINE_HEIGHT = 24

export default function Lesson() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { c, fonts, text } = useTheme()
  const { data, loading, error, reload, toggleLesson, deleteLesson, updateLesson, touchLesson, deleteNote } = useData()
  const { enabled: aiEnabled, recordUsage } = useAiPrefs()
  const [editOpen, setEditOpen] = useState(false)
  const [tutorOpen, setTutorOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteRecord, setNoteRecord] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [writing, setWriting] = useState(false)
  const [writeError, setWriteError] = useState(null)
  const { open, sheet } = useRowActions()

  const located = locateLesson(id, data)
  const lessonId = located?.lesson.id
  const touchRef = useRef(touchLesson)

  useEffect(() => {
    touchRef.current = touchLesson
  })

  useEffect(() => {
    if (lessonId) touchRef.current(lessonId)
  }, [lessonId])

  if (loading) {
    return (
      <Screen title="Lesson" left="back" tabbed={false}>
        <Loading label="Loading lesson" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title="Lesson" left="back" tabbed={false}>
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    )
  }

  if (!located) {
    return (
      <Screen title="Lesson" left="back" tabbed={false}>
        <Card>
          <EmptyState
            title="Lesson not found"
            description="It may have been deleted. Head back to Learning to find your courses."
            action={
              <Button size="sm" variant="secondary" onPress={() => router.replace('/learning')}>
                Back to Learning
              </Button>
            }
          />
        </Card>
      </Screen>
    )
  }

  const { lesson, module, course, prev, next, index, total } = located
  const progress = courseProgress(course.id, data)
  const notes = (data.notes || []).filter((note) => note.lesson_id === lesson.id)

  const openNote = (note) => {
    setNoteRecord(note)
    setNoteOpen(true)
  }

  const lessonMenu = () =>
    open({
      title: lesson.title,
      subtitle: module.title,
      actions: [
        {
          key: 'toggle',
          label: lesson.done ? 'Mark incomplete' : 'Mark complete',
          icon: Check,
          onPress: () => toggleLesson(lesson.id, !lesson.done).catch(reportError),
        },
        { key: 'edit', label: 'Edit lesson', icon: PencilSimple, onPress: () => setEditOpen(true) },
        {
          key: 'delete',
          label: 'Delete lesson',
          icon: Trash,
          destructive: true,
          onPress: () =>
            confirmDelete(lesson.title, () => {
              router.back()
              deleteLesson(lesson.id).catch(reportError)
            }),
        },
      ],
    })

  const writeContent = async () => {
    if (writing) return
    if (!aiEnabled) {
      setWriteError('Turn on AI in Settings to generate a lesson.')
      return
    }
    if (inCooldown()) {
      setWriteError('Gemini is cooling down after its free limit. Try again shortly.')
      return
    }
    setWriting(true)
    setWriteError(null)
    try {
      const result = await generateLesson({
        course: course.name,
        module: module.title,
        lesson: lesson.title,
        context: lessonContext(course, module, lesson),
      })
      recordUsage({ remaining: result.remaining, cap: result.cap, model: result.model })
      await updateLesson(lesson.id, { content: result.text })
    } catch (cause) {
      setWriteError(describeGeminiError(cause))
    } finally {
      setWriting(false)
    }
  }

  return (
    <Screen
      title={lesson.title}
      subtitle={`${module.title} · ${index + 1} of ${total}`}
      left="back"
      tabbed={false}
      right={
        <RowMenuButton accessibilityLabel={`${lesson.title}, lesson options`} onPress={lessonMenu} />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Course ${course.name}, module ${module.title}`}
        onPress={() => router.push(`/course/${course.id}`)}
        hitSlop={6}
        style={{ gap: 3 }}
      >
        <Text
          numberOfLines={1}
          style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}
        >
          {course.name} → {module.title}
        </Text>
      </Pressable>

      <ProgressBar label={progress.detail} value={progress.pct} percentOnly />

      <Card padded>
        {lesson.content ? (
          <Text
            selectable
            style={{
              fontFamily: fonts.sans,
              fontSize: text.body,
              lineHeight: CONTENT_LINE_HEIGHT,
              color: c.body,
            }}
          >
            {lesson.content}
          </Text>
        ) : (
          <EmptyState
            title="No content yet"
            description="Write this lesson yourself, or let Gemini draft it from the title."
            action={
              <Button
                size="sm"
                variant="secondary"
                icon={Sparkle}
                loading={writing}
                onPress={writeContent}
              >
                Generate content
              </Button>
            }
          />
        )}
        {writeError ? (
          <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructiveText }}>
            {writeError}
          </Text>
        ) : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          variant="secondary"
          icon={Sparkle}
          onPress={() => setTutorOpen(true)}
          style={{ flex: 1 }}
        >
          Ask AI
        </Button>
        <Button variant="secondary" onPress={() => setQuizOpen(true)} style={{ flex: 1 }}>
          Quiz
        </Button>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Button
          size="sm"
          variant="ghost"
          icon={ArrowLeft}
          disabled={!prev}
          accessibilityLabel="Previous lesson"
          onPress={() => prev && router.replace(`/lesson/${prev.id}`)}
        >
          Previous
        </Button>
        <Button
          variant={lesson.done ? 'secondary' : 'primary'}
          icon={lesson.done ? Check : undefined}
          onPress={() => toggleLesson(lesson.id, !lesson.done).catch(reportError)}
          style={{ flex: 1 }}
        >
          {lesson.done ? 'Completed' : 'Mark complete'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={ArrowRight}
          disabled={!next}
          accessibilityLabel="Next lesson"
          onPress={() => next && router.replace(`/lesson/${next.id}`)}
        >
          Next
        </Button>
      </View>

      <Section
        title="Notes"
        action={
          <Button size="sm" variant="ghost" icon={Plus} onPress={() => openNote(null)}>
            Add
          </Button>
        }
      >
        <Card padded={!notes.length}>
          {notes.length ? (
            notes.map((note, noteIndex) => (
              <Pressable
                key={note.id}
                accessibilityRole="button"
                accessibilityLabel={`Note: ${note.title}`}
                onPress={() => setViewing(note)}
                style={({ pressed }) => ({
                  gap: 3,
                  paddingLeft: 16,
                  paddingRight: 8,
                  paddingVertical: 14,
                  borderTopWidth: noteIndex === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: c.line,
                  backgroundColor: pressed ? c.overline : 'transparent',
                })}
              >
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}
                >
                  {note.title}
                </Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                  {relativeTime(note.updated_at)}
                </Text>
              </Pressable>
            ))
          ) : (
            <EmptyState
              title="No notes for this lesson"
              description="Capture what you want to remember, and it stays linked here."
              action={
                <Button size="sm" variant="primary" onPress={() => openNote(null)}>
                  Add a note
                </Button>
              }
            />
          )}
        </Card>
      </Section>

      <LessonForm
        visible={editOpen}
        moduleId={module.id}
        record={lesson}
        onClose={() => setEditOpen(false)}
      />
      <LessonTutor
        visible={tutorOpen}
        course={course}
        module={module}
        lesson={lesson}
        onClose={() => setTutorOpen(false)}
      />
      <LessonQuiz
        visible={quizOpen}
        course={course}
        module={module}
        lesson={lesson}
        onClose={() => setQuizOpen(false)}
      />
      <NoteForm
        visible={noteOpen}
        record={noteRecord}
        defaults={{
          tag: 'Study',
          course_id: course.id,
          lesson_id: lesson.id,
          title: lesson.title,
        }}
        onClose={() => {
          setNoteOpen(false)
          setNoteRecord(null)
        }}
      />
      <NoteView
        note={viewing}
        onClose={() => setViewing(null)}
        onEdit={() => {
          const note = viewing
          setViewing(null)
          if (note) openNote(note)
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
