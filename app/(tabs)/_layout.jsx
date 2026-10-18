import { Tabs } from 'expo-router'
import TabBar from '../../src/components/layout/TabBar.jsx'
import { TAB_ITEMS } from '../../src/data/nav.js'
import { useTheme } from '../../src/theme/ThemeProvider.jsx'

export default function TabsLayout() {
  const { c } = useTheme()

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.background },
      }}
    >
      {TAB_ITEMS.map(({ route, label }) => (
        <Tabs.Screen key={route} name={route} options={{ title: label }} />
      ))}
    </Tabs>
  )
}
