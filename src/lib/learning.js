/*
 * Pure derivations for the Learning feature: courses → modules → lessons.
 * No React, no network. Screens and AI context builders read from here so a course's
 * progress is always the same number, always derived from completed lessons.
 */

const byPosition = (a, b) =>
  (Number(a.position) || 0) - (Number(b.position) || 0) || String(a.id).localeCompare(String(b.id))

export function modulesFor(courseId, data) {
  return (data?.modules || []).filter((mod) => mod.course_id === courseId).sort(byPosition)
}

export function lessonsFor(moduleId, data) {
  return (data?.lessons || []).filter((lesson) => lesson.module_id === moduleId).sort(byPosition)
}

/** Ordered lessons of a course, module by module. */
export function courseLessons(courseId, data) {
  const out = []
  for (const mod of modulesFor(courseId, data)) out.push(...lessonsFor(mod.id, data))
  return out
}

/** A course with its modules, lessons and derived progress. */
export function courseTree(course, data) {
  const modules = modulesFor(course.id, data).map((mod) => ({
    ...mod,
    lessons: lessonsFor(mod.id, data),
  }))
  const lessons = modules.flatMap((mod) => mod.lessons)
  const done = lessons.filter((lesson) => lesson.done).length
  return {
    id: course.id,
    course,
    name: course.name,
    description: course.description || '',
    modules,
    lessons,
    total: lessons.length,
    done,
    pct: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
    next: lessons.find((lesson) => !lesson.done) || null,
    detail: lessons.length
      ? `${done} / ${lessons.length} ${lessons.length === 1 ? 'lesson' : 'lessons'}`
      : 'No lessons yet',
  }
}

/** Every active course, ordered, each with its tree and progress. */
export function coursesTree(data) {
  return (data?.courses || [])
    .filter((course) => course.active !== false)
    .sort(byPosition)
    .map((course) => courseTree(course, data))
}

export function courseProgress(courseId, data) {
  const lessons = courseLessons(courseId, data)
  const done = lessons.filter((lesson) => lesson.done).length
  return { total: lessons.length, done, pct: lessons.length ? Math.round((done / lessons.length) * 100) : 0 }
}

/** The lesson, its module, its course and its neighbours in reading order. */
export function locateLesson(lessonId, data) {
  const lesson = (data?.lessons || []).find((row) => row.id === lessonId)
  if (!lesson) return null
  const module = (data?.modules || []).find((row) => row.id === lesson.module_id)
  if (!module) return null
  const course = (data?.courses || []).find((row) => row.id === module.course_id)
  if (!course) return null
  const lessons = courseLessons(course.id, data)
  const index = lessons.findIndex((row) => row.id === lesson.id)
  return {
    lesson,
    module,
    course,
    index,
    total: lessons.length,
    prev: index > 0 ? lessons[index - 1] : null,
    next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null,
  }
}

/** Where "Continue learning" should go: the last lesson still open, else the next one. */
export function continueTarget(data) {
  const opened = [...(data?.lessons || [])]
    .filter((lesson) => lesson.opened_at)
    .sort((a, b) => String(b.opened_at).localeCompare(String(a.opened_at)))

  const firstIncomplete = (courseId) => courseLessons(courseId, data).find((lesson) => !lesson.done) || null

  // Most recently opened lesson that is still incomplete.
  for (const lesson of opened) {
    if (lesson.done) continue
    const hit = locateLesson(lesson.id, data)
    if (hit) return hit
  }

  // Next incomplete lesson in the course last opened.
  if (opened[0]) {
    const hit = locateLesson(opened[0].id, data)
    const next = hit ? firstIncomplete(hit.course.id) : null
    if (next) return locateLesson(next.id, data)
  }

  // First incomplete lesson, in course order.
  for (const tree of coursesTree(data)) {
    const next = firstIncomplete(tree.id)
    if (next) return locateLesson(next.id, data)
  }

  // Everything done — fall back to the most recently opened, else the first lesson.
  if (opened[0]) return locateLesson(opened[0].id, data)
  const firstTree = coursesTree(data)[0]
  const firstLesson = firstTree?.modules[0]?.lessons[0]
  return firstLesson ? locateLesson(firstLesson.id, data) : null
}

/**
 * Bounded context for an in-lesson AI request. Only the current lesson's own title and
 * content are sent, and only after the user explicitly asks about that lesson.
 */
export function lessonContext(course, module, lesson) {
  const lines = []
  if (course?.name) lines.push(`Course: ${course.name}`)
  if (course?.description) lines.push(`Course description: ${course.description}`)
  if (module?.title) lines.push(`Module: ${module.title}`)
  if (lesson?.title) lines.push(`Lesson: ${lesson.title}`)
  const content = String(lesson?.content || '').trim()
  if (content) lines.push(`Lesson content:\n${content}`)
  return lines.join('\n').slice(0, 3800)
}
