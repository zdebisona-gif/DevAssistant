import { Pressable } from 'react-native'
import { Eye, EyeSlash } from '../../icons.js'
import { usePrivacy } from '../../data/privacy.jsx'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/*
 * Masks money on screen. The default scope is the master preference; `scope="accounts"`
 * controls only account balances and the accounts total. Per device, never synced.
 */
export default function HideToggle({ scope = 'all' }) {
  const { c } = useTheme()
  const { hidden, toggle, accountsHidden, toggleAccounts } = usePrivacy()
  const accounts = scope === 'accounts'
  const active = accounts ? hidden || accountsHidden : hidden
  const locked = accounts && hidden
  const onPress = accounts ? toggleAccounts : toggle

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: locked }}
      accessibilityLabel={
        locked
          ? 'Account balances are hidden by Hide balances'
          : accounts
            ? active
              ? 'Show account balances'
              : 'Hide account balances'
            : active
              ? 'Show balances'
              : 'Hide balances'
      }
      disabled={locked}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        opacity: locked ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      {active ? (
        <EyeSlash size={20} weight="bold" color={c.primaryFg} />
      ) : (
        <Eye size={20} weight="bold" color={c.mutedForeground} />
      )}
    </Pressable>
  )
}
