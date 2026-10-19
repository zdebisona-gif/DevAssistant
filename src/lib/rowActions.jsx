import { useCallback, useState } from 'react'
import ActionSheet from '../components/ui/ActionSheet.jsx'

/*
 * Drives a record row's action menu without each screen managing the sheet state.
 *
 *   const { open, sheet } = useRowActions()
 *   <Pressable onPress={() => open({ title, actions: [...] })} />
 *   return (<> ... {sheet} </>)
 */
export function useRowActions() {
  const [menu, setMenu] = useState(null)

  const open = useCallback((config) => setMenu(config), [])
  const close = useCallback(() => setMenu(null), [])

  const sheet = (
    <ActionSheet
      visible={Boolean(menu)}
      title={menu?.title}
      subtitle={menu?.subtitle}
      actions={menu?.actions ?? []}
      onClose={close}
    />
  )

  return { open, close, sheet }
}
