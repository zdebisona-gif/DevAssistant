import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Check, Trash } from '../../icons.js'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useData } from '../../data/store.jsx'
import { confirmDelete } from '../../lib/alerts.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/* Manage a course's units. Completing a unit advances the course progress; no session is logged. */
export default function CourseUnits({ visible, course, onClose }) {
  const { c, fonts, radius, text } = useTheme()
  const { data, createCourseUnit, completeCourseUnit, deleteCourseUnit } = useData()
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    setTitle('')
    setSaving(false)
    setError(null)
  }, [visible, course?.id])

  const units = (data.units || [])
    .filter((unit) => unit.course_id === course?.id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const done = units.filter((unit) => unit.done).length

  const addUnit = async () => {
    const value = title.trim()
    if (!value || saving || !course) return
    setSaving(true)
    setError(null)
    try {
      await createCourseUnit({ course_id: course.id, title: value, position: units.length })
      setTitle('')
    } catch (cause) {
      setError(cause.message || 'Could not add the unit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={course?.name ?? 'Units'}
      subtitle={units.length ? `${done} of ${units.length} done` : 'No units yet'}
    >
      <Field
        label="Add a unit"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Lesson 12 — past tense"
        hint="Completing a unit advances progress; it does not log study time"
      />
      <Button variant="primary" onPress={addUnit} loading={saving} disabled={!title.trim()}>
        Add unit
      </Button>
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>
          {error}
        </Text>
      ) : null}

      {units.length ? (
        <View style={{ gap: 8 }}>
          {units.map((unit) => (
            <View
              key={unit.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.border,
                paddingLeft: 10,
                paddingRight: 4,
                paddingVertical: 8,
              }}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: unit.done }}
                accessibilityLabel={unit.title}
                onPress={() => completeCourseUnit(unit.id, !unit.done).catch(() => {})}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingVertical: 4 }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: radius.sm,
                    borderWidth: unit.done ? 0 : 1.5,
                    borderColor: c.border,
                    backgroundColor: unit.done ? c.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {unit.done ? <Check size={13} weight="bold" color={c.onPrimary} /> : null}
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: fonts.sansMedium,
                    fontSize: text.body,
                    color: unit.done ? c.mutedForeground : c.foreground,
                    textDecorationLine: unit.done ? 'line-through' : 'none',
                  }}
                >
                  {unit.title}
                </Text>
              </Pressable>
              <Button
                size="sm"
                variant="ghost"
                icon={Trash}
                accessibilityLabel={`Delete ${unit.title}`}
                onPress={() =>
                  confirmDelete(unit.title, () => deleteCourseUnit(unit.id).catch(() => {}))
                }
              />
            </View>
          ))}
        </View>
      ) : null}
    </Sheet>
  )
}
