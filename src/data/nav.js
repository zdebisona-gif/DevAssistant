import {
  CalendarBlank,
  CurrencyCircleDollar,
  House,
  Notebook,
  Sparkle,
  Target,
} from '../icons.js'

/*
 * Bottom navigation: five destinations plus one raised action.
 * Order here must match the order the navigator registers its screens.
 */
export const TAB_ITEMS = [
  { route: 'index', path: '/', label: 'Home', icon: House },
  { route: 'notes', path: '/notes', label: 'Notes', icon: Notebook },
  { route: 'finances', path: '/finances', label: 'Money', icon: CurrencyCircleDollar },
  { route: 'planner', path: '/planner', label: 'Plan', icon: CalendarBlank },
  { route: 'projects', path: '/projects', label: 'Projects', icon: Target },
]

/* Ask Zen-I is the product's core move, so it lives as a raised action, not a tab. */
export const ASK_ACTION = { path: '/ask', label: 'Ask', icon: Sparkle }

/* The column the raised action occupies in the bar (0-based), kept centred. */
export const ACTION_COLUMN = 3
