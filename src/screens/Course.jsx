import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { BookOpen, Check, PencilSimple, Play, Plus, Trash } from '../icons.js'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Loading from '../components/ui/Loading.jsx'
import ProgressBar from '../components/ui/ProgressBar.jsx'
import RowMenuButton from '../components/ui/RowMenuButton.jsx'
import LessonForm from '../components/forms/LessonForm.jsx'
import ModuleForm from '../components/forms/ModuleForm.jsx'
import CourseForm from '../components/forms/CourseForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import { Card } from '../components/ui/Card.jsx'
import { useData } from '../data/store.jsx'
import { confirmDelete, reportError } from '../lib/alerts.js'
import { courseWeekHours } from '../lib/analytics.js'
import { courseTree } from '../lib/learning.js'
import { useRowActions } from '../lib/rowActions.jsx'
import { useTheme } from '../theme/ThemeProvider.jsx'

function LessonRow({ lesson, current, index, onOpen, onMenu }) {
  const { c, fonts, text } = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 16,
        paddingRight: 4,
        paddingVertical: 12,
        borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: c.line,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${lesson.title}${lesson.done ? ', completed' : current ? ', current lesson' : ''}`}
        onPress={onOpen}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 2,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: lesson.done ? 0 : 1.5,
            borderColor: current ? c.primary : c.border,
            backgroundColor: lesson.done ? c.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {lesson.done ? (
            <Check size={13} weight="bold" color={c.onPrimary} />
          ) : current ? (
            <Play size={10} weight="fill" color={c.primary} />
          ) : null}
        </View>
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            fontFamily: current ? fonts.sansSemiBold : fonts.sansMedium,
            fontSize: text.body,
            color: lesson.done ? c.mutedForeground : c.foreground,
          }}
        >
          {lesson.title}
        </Text>
      </Pressable>
      <RowMenuButton compact accessibilityLabel={`${lesson.title}, more options`} onPress={onMenu} />
    </View>
  )
}

export default function Course() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { c, fonts, text } = useTheme()
  const {
    data,
    loading,
    error,
    reload,
    deleteCourse,
    deleteModule,
    deleteLesson,
    toggleLesson,
    touchLesson,
  } = useData()
  const [courseOpen, setCourseOpen] = useState(false)
  const [moduleOpen, setModuleOpen] = useState(false)
  const [moduleRecord, setModuleRecord] = useState(null)
  const [lessonOpen, setLessonOpen] = useState(false)
  const [lessonRecord, setLessonRecord] = useState(null)
  const [lessonModule, setLessonModule] = useState(null)
  const { open, sheet } = useRowActions()

  const course = data.courses.find((row) => row.id === id)
  const tree = course ? courseTree(course, data) : null

  const openLesson = (lesson) => {
    touchLesson(lesson.id)
    router.push(`/lesson/${lesson.id}`)
  }

  const courseMenu = () =>
    open({
      title: course.name,
      subtitle: 'Course',
      actions: [
        { key: 'edit', label: 'Edit course', icon: PencilSimple, onPress: () => setCourseOpen(true) },
        {
          key: 'delete',
          label: 'Delete course',
          icon: Trash,
          destructive: true,
          onPress: () =>
            confirmDelete(course.name, () => {
              router.back()
              deleteCourse(course.id).catch(reportError)
            }),
        },
      ],
    })

  const moduleMenu = (module) =>
    open({
      title: module.title,
      subtitle: 'Module',
      actions: [
        {
          key: 'add',
          label: 'Add lesson',
          icon: Plus,
          onPress: () => {
            setLessonModule(module)
            setLessonRecord(null)
            setLessonOpen(true)
          },
        },
        {
          key: 'edit',
          label: 'Edit module',
          icon: PencilSimple,
          onPress: () => {
            setModuleRecord(module)
            setModuleOpen(true)
          },
        },
        {
          key: 'delete',
          label: 'Delete module',
          icon: Trash,
          destructive: true,
          onPress: () =>
            confirmDelete(module.title, () => deleteModule(module.id).catch(reportError)),
        },
      ],
    })

  const lessonMenu = (module, lesson) =>
    open({
      title: lesson.title,
      subtitle: module.title,
      actions: [
        {
          key: 'toggle',
          label: lesson.done ? 'Mark incomplete' : 'Mark complete',
          icon: lesson.done ? Play : Check,
          onPress: () => toggleLesson(lesson.id, !lesson.done).catch(reportError),
        },
        {
          key: 'edit',
          label: 'Edit lesson',
          icon: PencilSimple,
          onPress: () => {
            setLessonModule(module)
            setLessonRecord(lesson)
            setLessonOpen(true)
          },
        },
        {
          key: 'delete',
          label: 'Delete lesson',
          icon: Trash,
          destructive: true,
          onPress: () => confirmDelete(lesson.title, () => deleteLesson(lesson.id).catch(reportError)),
        },
      ],
    })

  if (loading) {
    return (
      <Screen title="Course" left="back" tabbed={false}>
        <Loading label="Loading course" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title="Course" left="back" tabbed={false}>
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    )
  }

  if (!tree) {
    return (
      <Screen title="Course" left="back" tabbed={false}>
        <Card>
          <EmptyState
            icon={BookOpen}
            title="Course not found"
            description="It may have been deleted. Head back to Learning to see your courses."
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

  const courseMenuButton = (
    <RowMenuButton
      accessibilityLabel={`${tree.name}, course options`}
      onPress={courseMenu}
    />
  )

  const weeklyTarget = Number(course.weekly_target_hours) || 0
  const weeklyLogged = courseWeekHours(data.sessions, course.id)
  const weeklyPct =
    weeklyTarget > 0 ? Math.min(100, Math.round((weeklyLogged / weeklyTarget) * 100)) : 0

  return (
    <Screen
      title={tree.name}
      subtitle={tree.detail}
      left="back"
      tabbed={false}
      right={courseMenuButton}
    >
      {tree.description ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.body, lineHeight: 21, color: c.body }}>
          {tree.description}
        </Text>
      ) : null}

      <View style={{ gap: 12 }}>
        <ProgressBar label="Course progress" value={tree.pct} percentOnly />
        {weeklyTarget > 0 ? (
          <ProgressBar
            label={`This week · ${weeklyLogged}h of ${weeklyTarget}h`}
            value={weeklyPct}
            percentOnly
          />
        ) : null}
      </View>

      {tree.modules.map((module) => (
        <View key={module.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              numberOfLines={2}
              style={{ flex: 1, fontFamily: fonts.sansSemiBold, fontSize: text.heading, color: c.foreground }}
            >
              {module.title}
            </Text>
            {module.lessons.length ? (
              <Button
                size="sm"
                variant="ghost"
                accessibilityLabel={`Add lesson to ${module.title}`}
                onPress={() => {
                  setLessonModule(module)
                  setLessonRecord(null)
                  setLessonOpen(true)
                }}
              >
                Add
              </Button>
            ) : null}
            <RowMenuButton
              compact
              accessibilityLabel={`${module.title}, module options`}
              onPress={() => moduleMenu(module)}
            />
          </View>
          {module.description ? (
            <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
              {module.description}
            </Text>
          ) : null}
          <Card padded={!module.lessons.length}>
            {module.lessons.length ? (
              module.lessons.map((lesson, index) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  index={index}
                  current={tree.next?.id === lesson.id}
                  onOpen={() => openLesson(lesson)}
                  onMenu={() => lessonMenu(module, lesson)}
                />
              ))
            ) : (
              <EmptyState
                title="No lessons yet"
                description="Add the first lesson to this module."
                action={
                  <Button
                    size="sm"
                    variant="primary"
                    onPress={() => {
                      setLessonModule(module)
                      setLessonRecord(null)
                      setLessonOpen(true)
                    }}
                  >
                    Add lesson
                  </Button>
                }
              />
            )}
          </Card>
        </View>
      ))}

      <Button
        variant="secondary"
        icon={Plus}
        onPress={() => {
          setModuleRecord(null)
          setModuleOpen(true)
        }}
      >
        Add module
      </Button>

      <CourseForm visible={courseOpen} record={course} onClose={() => setCourseOpen(false)} />
      <ModuleForm
        visible={moduleOpen}
        courseId={course.id}
        record={moduleRecord}
        position={tree.modules.length}
        onClose={() => {
          setModuleOpen(false)
          setModuleRecord(null)
        }}
      />
      <LessonForm
        visible={lessonOpen}
        moduleId={lessonModule?.id}
        record={lessonRecord}
        position={
          lessonModule
            ? tree.modules.find((row) => row.id === lessonModule.id)?.lessons.length ?? 0
            : 0
        }
        onClose={() => {
          setLessonOpen(false)
          setLessonRecord(null)
          setLessonModule(null)
        }}
      />
      {sheet}
    </Screen>
  )
}
