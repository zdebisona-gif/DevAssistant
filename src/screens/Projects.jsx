import { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { PencilSimple, Plus, Target, Trash, WarningCircle } from '../icons.js'
import AtonementSheet from '../components/assistant/AtonementSheet.jsx'
import SubmissionSheet from '../components/assistant/SubmissionSheet.jsx'
import ProjectForm from '../components/forms/ProjectForm.jsx'
import Screen from '../components/layout/Screen.jsx'
import Section from '../components/layout/Section.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ErrorState from '../components/ui/ErrorState.jsx'
import Loading from '../components/ui/Loading.jsx'
import RowMenuButton from '../components/ui/RowMenuButton.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { useData } from '../data/store.jsx'
import { confirmDelete, reportError } from '../lib/alerts.js'
import {
  FORFEIT_CREDITS,
  creditBalance,
  dueMeta,
  isLocked,
  openPenalties,
  reasonLabel,
  sortProjects,
  statusLabel,
} from '../lib/projects.js'
import { useRowActions } from '../lib/rowActions.jsx'
import { useTheme } from '../theme/ThemeProvider.jsx'

const STATUS_TONE = { passed: 'success', failed: 'destructive', missed: 'destructive', active: 'primary' }

export default function Projects() {
  const { c, fonts, radius, text } = useTheme()
  const { data, loading, error, reload, updateProject, createPenalty, deleteProject } = useData()
  const [formOpen, setFormOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [submitTarget, setSubmitTarget] = useState(null)
  const [penaltyTarget, setPenaltyTarget] = useState(null)
  const { open, sheet } = useRowActions()

  if (loading) {
    return (
      <Screen title="Projects" subtitle="Deliverables with a deadline" left="back" tabbed={false}>
        <Loading label="Loading projects" />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen title="Projects" subtitle="Deliverables with a deadline" left="back" tabbed={false}>
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    )
  }

  const penalties = data.penalties
  const balance = creditBalance(penalties)
  const openList = openPenalties(penalties)
  const locked = isLocked(penalties)
  const projects = sortProjects(data.projects)
  const active = projects.filter((project) => project.status === 'active')
  const settled = projects.filter((project) => project.status !== 'active')

  const openNew = () => {
    setEditRecord(null)
    setFormOpen(true)
  }

  const markMissed = (project) => {
    Alert.alert(
      `Mark “${project.title}” missed?`,
      `This forfeits ${FORFEIT_CREDITS} credits and locks new projects until you write an atonement.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark missed',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateProject(project.id, { status: 'missed' })
              await createPenalty({
                project_id: project.id,
                project_title: project.title,
                reason: 'missed',
                credits: FORFEIT_CREDITS,
              })
            } catch {
              /* the store surfaces the failure on the next reload */
            }
          },
        },
      ],
    )
  }

  const projectMenu = (project) =>
    open({
      title: project.title,
      subtitle: statusLabel(project.status),
      actions: [
        {
          key: 'edit',
          label: 'Edit',
          icon: PencilSimple,
          onPress: () => {
            setEditRecord(project)
            setFormOpen(true)
          },
        },
        ...(project.status === 'active'
          ? [{ key: 'missed', label: 'Mark missed', icon: WarningCircle, onPress: () => markMissed(project) }]
          : []),
        {
          key: 'delete',
          label: 'Delete',
          icon: Trash,
          destructive: true,
          onPress: () => confirmDelete(project.title, () => deleteProject(project.id).catch(reportError)),
        },
      ],
    })

  const tone = (status) => c[STATUS_TONE[status] || 'mutedForeground']

  const dueLine = (project) => {
    const meta = dueMeta(project)
    return project.status === 'active'
      ? meta.overdue
        ? `Overdue · due ${meta.label}`
        : `Due ${meta.label}`
      : `${statusLabel(project.status)} · due ${meta.label}`
  }

  return (
    <Screen
      title="Projects"
      subtitle="Deliverables with a deadline"
      left="back"
      tabbed={false}
      right={
        <Button
          size="sm"
          variant="primary"
          icon={Plus}
          onPress={openNew}
          disabled={locked}
          accessibilityLabel="New project"
        >
          New
        </Button>
      }
    >
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <StatCard
          label="Credits"
          value={String(balance)}
          hint={locked ? 'Frozen until you atone' : 'Nothing outstanding'}
        />
        <StatCard
          label="Open penalties"
          value={String(openList.length)}
          hint={`${penalties.length} on record`}
        />
      </View>

      {locked ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: c.destructive,
            padding: 12,
          }}
        >
          <WarningCircle size={16} weight="bold" color={c.destructiveText} />
          <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.body }}>
            New projects are locked. Write an atonement in the ledger below to unlock them.
          </Text>
        </View>
      ) : null}

      <Section
        title="In progress"
        action={
          active.length ? (
            <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
              {active.length}
            </Text>
          ) : null
        }
      >
        {active.length ? (
          <View style={{ gap: 10 }}>
            {active.map((project) => {
              const meta = dueMeta(project)
              return (
                <View
                  key={project.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: c.border,
                    paddingLeft: 14,
                    paddingRight: 4,
                    paddingVertical: 10,
                  }}
                >
                  <Pressable
                    onPress={() => setSubmitTarget(project)}
                    accessibilityRole="button"
                    accessibilityLabel={`Submit ${project.title}`}
                    style={{ flex: 1, gap: 3 }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}
                    >
                      {project.title}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}
                    >
                      {project.brief}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.sansMedium,
                        fontSize: text.micro,
                        color: meta.overdue ? c.destructiveText : c.mutedForeground,
                      }}
                    >
                      {dueLine(project)}
                    </Text>
                  </Pressable>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => setSubmitTarget(project)}
                  >
                    Submit
                  </Button>
                  <RowMenuButton compact onPress={() => projectMenu(project)} />
                </View>
              )
            })}
          </View>
        ) : (
          <EmptyState
            icon={Target}
            title={projects.length ? 'Nothing in progress' : 'No projects yet'}
            description={
              locked
                ? 'Clear your open penalty first.'
                : 'Commit to a deliverable with a deadline. Submit it and Gemini judges whether it passes.'
            }
            action={
              locked ? null : (
                <Button size="sm" variant="primary" icon={Plus} onPress={openNew}>
                  New project
                </Button>
              )
            }
          />
        )}
      </Section>

      {settled.length ? (
        <Section title="Settled">
          <View style={{ gap: 10 }}>
            {settled.map((project) => (
              <View
                key={project.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingLeft: 14,
                  paddingRight: 4,
                  paddingVertical: 10,
                }}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}
                  >
                    {project.title}
                  </Text>
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.micro, color: tone(project.status) }}>
                    {dueLine(project)}
                  </Text>
                  {project.assessment_feedback ? (
                    <Text
                      numberOfLines={2}
                      style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}
                    >
                      {project.assessment_feedback}
                    </Text>
                  ) : null}
                </View>
                <RowMenuButton compact onPress={() => projectMenu(project)} />
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Penalty ledger">
        {penalties.length ? (
          <View style={{ gap: 10 }}>
            {penalties.map((penalty) => (
              <View
                key={penalty.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: penalty.atoned ? c.border : c.destructive,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: fonts.sansSemiBold, fontSize: text.body, color: c.foreground }}
                  >
                    {penalty.project_title}
                  </Text>
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.micro, color: c.destructiveText }}>
                    {reasonLabel(penalty.reason)} · −{Number(penalty.credits) || 0} credits
                  </Text>
                  {penalty.atoned ? (
                    <Text
                      numberOfLines={2}
                      style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}
                    >
                      Atoned: {penalty.atonement}
                    </Text>
                  ) : null}
                </View>
                {penalty.atoned ? (
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
                    Atoned
                  </Text>
                ) : (
                  <Button size="sm" variant="secondary" onPress={() => setPenaltyTarget(penalty)}>
                    Write atonement
                  </Button>
                )}
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No penalties"
            description="Fail or miss a deadline and it lands here until you write it through."
          />
        )}
      </Section>

      <ProjectForm
        visible={formOpen}
        record={editRecord}
        onClose={() => {
          setFormOpen(false)
          setEditRecord(null)
        }}
      />
      <SubmissionSheet
        visible={Boolean(submitTarget)}
        project={submitTarget}
        onClose={() => setSubmitTarget(null)}
      />
      <AtonementSheet
        visible={Boolean(penaltyTarget)}
        penalty={penaltyTarget}
        onClose={() => setPenaltyTarget(null)}
      />
      {sheet}
    </Screen>
  )
}
