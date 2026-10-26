import { Platform } from 'react-native'

const ALLOWED_ROUTES = new Set([
  '/sleep',
  '/planner',
  '/learning',
  '/projects',
  '/finances',
  '/reminders',
])

const CHANNELS = [
  ['zeni-sleep', 'Sleep'],
  ['zeni-planner', 'Planner'],
  ['zeni-learning', 'Learning'],
  ['zeni-deadlines', 'Deadlines'],
  ['zeni-money', 'Money'],
]

let modulePromise

async function loadNativeNotifications() {
  const [handler, permissions, channels, scheduler, scheduled, cancel, emitter, types, permissionTypes, channelTypes] =
    await Promise.all([
      import('expo-notifications/build/NotificationsHandler'),
      import('expo-notifications/build/NotificationPermissions'),
      import('expo-notifications/build/setNotificationChannelAsync'),
      import('expo-notifications/build/scheduleNotificationAsync'),
      import('expo-notifications/build/getAllScheduledNotificationsAsync'),
      import('expo-notifications/build/cancelScheduledNotificationAsync'),
      import('expo-notifications/build/NotificationsEmitter'),
      import('expo-notifications/build/Notifications.types'),
      import('expo-notifications/build/NotificationPermissions.types'),
      import('expo-notifications/build/NotificationChannelManager.types'),
    ])

  return {
    setNotificationHandler: handler.setNotificationHandler,
    getPermissionsAsync: permissions.getPermissionsAsync,
    requestPermissionsAsync: permissions.requestPermissionsAsync,
    setNotificationChannelAsync: channels.setNotificationChannelAsync,
    scheduleNotificationAsync: scheduler.scheduleNotificationAsync,
    getAllScheduledNotificationsAsync: scheduled.getAllScheduledNotificationsAsync,
    cancelScheduledNotificationAsync: cancel.cancelScheduledNotificationAsync,
    addNotificationResponseReceivedListener: emitter.addNotificationResponseReceivedListener,
    getLastNotificationResponseAsync: emitter.getLastNotificationResponseAsync,
    clearLastNotificationResponseAsync: emitter.clearLastNotificationResponseAsync,
    AndroidImportance: channelTypes.AndroidImportance,
    IosAuthorizationStatus: permissionTypes.IosAuthorizationStatus,
    SchedulableTriggerInputTypes: types.SchedulableTriggerInputTypes,
  }
}

function nativeNotifications() {
  if (Platform.OS === 'web') return Promise.resolve(null)
  modulePromise ??= loadNativeNotifications()
  return modulePromise
}

function isAllowed(Notifications, settings) {
  if (settings?.granted) return true
  const status = settings?.ios?.status
  return (
    status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    status === Notifications.IosAuthorizationStatus.EPHEMERAL
  )
}

async function ensureChannels(Notifications) {
  if (Platform.OS !== 'android') return
  await Promise.all(
    CHANNELS.map(([id, name]) =>
      Notifications.setNotificationChannelAsync(id, {
        name,
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#1E40AF',
        sound: 'default',
      }),
    ),
  )
}

function owned(request) {
  return request?.content?.data?.reminder === true
}

function planOwned(request) {
  return owned(request) && request.content.data.kind === 'plan'
}

export async function configureNotifications() {
  const Notifications = await nativeNotifications()
  if (!Notifications) return false
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
  await ensureChannels(Notifications)
  return true
}

export async function getPermissionStatus() {
  const Notifications = await nativeNotifications()
  if (!Notifications) return 'unavailable'
  const settings = await Notifications.getPermissionsAsync()
  if (isAllowed(Notifications, settings)) return 'granted'
  if (settings.status === 'denied') return 'denied'
  return settings.canAskAgain ? 'unknown' : 'denied'
}

export async function requestPermission() {
  const Notifications = await nativeNotifications()
  if (!Notifications) return 'unavailable'
  await ensureChannels(Notifications)
  const current = await Notifications.getPermissionsAsync()
  if (isAllowed(Notifications, current)) return 'granted'
  if (!current.canAskAgain) return 'denied'
  const settings = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  })
  return isAllowed(Notifications, settings) ? 'granted' : 'denied'
}

export async function syncScheduledNotifications({ daily, oneOff }) {
  const Notifications = await nativeNotifications()
  if (!Notifications) return 0
  await ensureChannels(Notifications)

  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const old = scheduled.filter(planOwned)
  await Promise.all(old.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)))

  let count = 0
  for (const reminder of daily) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: 'default',
        data: { reminder: true, kind: 'plan', key: reminder.key, url: reminder.url },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: reminder.minute,
        channelId: reminder.channelId,
      },
    })
    count += 1
  }

  for (const reminder of oneOff) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: 'default',
        data: { reminder: true, kind: 'plan', key: reminder.key, url: reminder.url },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.date,
        channelId: reminder.channelId,
      },
    })
    count += 1
  }

  return count
}

export async function cancelPlanNotifications() {
  const Notifications = await nativeNotifications()
  if (!Notifications) return
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const old = scheduled.filter(planOwned)
  await Promise.all(old.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)))
}

export async function cancelAllOwnedNotifications() {
  const Notifications = await nativeNotifications()
  if (!Notifications) return
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const old = scheduled.filter(owned)
  await Promise.all(old.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)))
}

export async function sendBudgetAlert(reminder) {
  const Notifications = await nativeNotifications()
  if (!Notifications) return
  await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.body,
      sound: 'default',
      data: { reminder: true, kind: 'budget', key: reminder.key, url: reminder.url },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: reminder.channelId,
    },
  })
}

export async function sendTestNotification() {
  const Notifications = await nativeNotifications()
  if (!Notifications) throw new Error('Notifications are not available on this platform.')
  await ensureChannels(Notifications)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Reminders are on',
      body: 'This is what a Zen-I reminder will look like.',
      sound: 'default',
      data: { reminder: true, kind: 'test', url: '/reminders' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: 'zeni-sleep',
    },
  })
}

export async function subscribeToNotificationTaps(onUrl) {
  const Notifications = await nativeNotifications()
  if (!Notifications) return () => {}

  const handle = (response) => {
    const url = response?.notification?.request?.content?.data?.url
    if (typeof url === 'string' && ALLOWED_ROUTES.has(url)) onUrl(url)
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(handle)
  const last = await Notifications.getLastNotificationResponseAsync()
  if (last) {
    handle(last)
    await Notifications.clearLastNotificationResponseAsync?.()
  }

  return () => subscription.remove()
}
