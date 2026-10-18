/*
 * Preview data for the UI shell.
 * Every value here is replaced by a real API response in the backend phase.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function lastMonths(count) {
  const now = new Date()
  const labels = []
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    labels.push(MONTHS[d.getMonth()])
  }
  return labels
}

const spendSeries = [
  1980, 2240, 1760, 2380, 2610, 2050, 2180, 2470, 2320, 1980, 2210, 2245,
]
const incomeSeries = [
  4200, 4200, 4350, 4200, 4650, 4200, 4200, 4800, 4200, 4200, 4550, 4650,
]

export const spendingTrend = lastMonths(12).map((month, i) => ({
  month,
  spend: spendSeries[i],
  income: incomeSeries[i],
}))

export const user = {
  name: 'Zane',
  initials: 'Z',
  plan: 'Local preview',
}

export const kpis = {
  netBalance: 18420.75,
  netBalanceDelta: 2.4,
  monthlySpendDelta: 13.4,
  notesTotal: 47,
  notesDelta: 6,
  learningStreak: 12,
  learningWeeklyHours: 4.5,
  learningGoalHours: 6,
}

export const budgets = [
  { category: 'Bills & Utilities', spent: 900, limit: 1000 },
  { category: 'Food & Dining', spent: 420, limit: 600 },
  { category: 'Shopping', spent: 310, limit: 400 },
  { category: 'Groceries', spent: 285, limit: 450 },
  { category: 'Transport', spent: 180, limit: 250 },
  { category: 'Entertainment', spent: 130, limit: 200 },
]

export const monthlySpend = budgets.reduce((sum, b) => sum + b.spent, 0)
export const monthlyBudget = budgets.reduce((sum, b) => sum + b.limit, 0)

export const todayPlan = [
  {
    id: 'p1',
    time: '09:00',
    title: 'Review weekly budget',
    tag: 'Finances',
    done: true,
  },
  {
    id: 'p2',
    time: '10:30',
    title: "Finish 'Index funds' lesson",
    tag: 'Learning',
    done: true,
  },
  {
    id: 'p3',
    time: '13:00',
    title: 'Draft project proposal',
    tag: 'Work',
    done: false,
  },
  {
    id: 'p4',
    time: '15:30',
    title: 'Grocery run + log receipts',
    tag: 'Personal',
    done: false,
  },
  {
    id: 'p5',
    time: '20:00',
    title: 'Evening reflection note',
    tag: 'Daily',
    done: false,
  },
]

export const recentNotes = [
  {
    id: 'n1',
    title: 'Index funds — core takeaways',
    snippet:
      'Low-cost broad market funds beat most active picks over 10+ years. Keep expense ratio under 0.20%.',
    tag: 'Study',
    updated: '2h ago',
  },
  {
    id: 'n2',
    title: 'Project proposal outline',
    snippet:
      'Problem, scope, milestones, budget, risks. Lead with the metric that moves: activation rate.',
    tag: 'Work',
    updated: 'Yesterday',
  },
  {
    id: 'n3',
    title: 'App idea — receipt auto-tagger',
    snippet:
      'Snap a receipt, the assistant extracts merchant, total and category, then files it into Finances.',
    tag: 'Idea',
    updated: '2d ago',
  },
  {
    id: 'n4',
    title: 'Week 41 review',
    snippet:
      'Held budget on dining, overspent on shopping. Move grocery run to Saturday to cut impulse buys.',
    tag: 'Personal',
    updated: '4d ago',
  },
]

export const courses = [
  {
    id: 'c1',
    name: 'Personal Finance Fundamentals',
    progress: 68,
    detail: '34 of 50 lessons',
    next: 'Lesson 35 · Rebalancing a portfolio',
  },
  {
    id: 'c2',
    name: 'Spanish — A2',
    progress: 42,
    detail: '21 of 50 units',
    next: 'Unit 22 · Past tense verbs',
  },
  {
    id: 'c3',
    name: 'System Design Basics',
    progress: 20,
    detail: '6 of 30 lessons',
    next: 'Lesson 7 · Caching strategies',
  },
]

export const weeklyStudy = [
  { day: 'Mon', hours: 0.5 },
  { day: 'Tue', hours: 1.0 },
  { day: 'Wed', hours: 0.5 },
  { day: 'Thu', hours: 1.5 },
  { day: 'Fri', hours: 0.0 },
  { day: 'Sat', hours: 1.0 },
  { day: 'Sun', hours: 0.0 },
]

export const transactions = [
  {
    id: 't1',
    date: 'Oct 14',
    merchant: 'Whole Foods',
    category: 'Groceries',
    account: 'Checking ••4831',
    amount: -84.2,
  },
  {
    id: 't2',
    date: 'Oct 13',
    merchant: 'Salary — Acme Corp',
    category: 'Income',
    account: 'Checking ••4831',
    amount: 3200.0,
  },
  {
    id: 't3',
    date: 'Oct 12',
    merchant: 'Netflix',
    category: 'Entertainment',
    account: 'Credit ••2290',
    amount: -15.99,
  },
  {
    id: 't4',
    date: 'Oct 12',
    merchant: 'Shell',
    category: 'Transport',
    account: 'Credit ••2290',
    amount: -52.4,
  },
  {
    id: 't5',
    date: 'Oct 10',
    merchant: 'IKEA',
    category: 'Shopping',
    account: 'Credit ••2290',
    amount: -210.0,
  },
  {
    id: 't6',
    date: 'Oct 9',
    merchant: 'Electric bill',
    category: 'Bills & Utilities',
    account: 'Checking ••4831',
    amount: -118.75,
  },
  {
    id: 't7',
    date: 'Oct 8',
    merchant: 'Freelance — Logo project',
    category: 'Income',
    account: 'Checking ••4831',
    amount: 450.0,
  },
]

export const weekPlan = [
  {
    day: 'Mon',
    date: '13',
    events: [
      { id: 'w1', time: '09:00', title: 'Budget review', kind: 'money' },
      { id: 'w2', time: '19:00', title: 'Spanish practice', kind: 'learn' },
    ],
  },
  {
    day: 'Tue',
    date: '14',
    events: [
      { id: 'w3', time: '10:00', title: 'Deep work block', kind: 'focus' },
    ],
  },
  {
    day: 'Wed',
    date: '15',
    events: [
      { id: 'w4', time: '13:00', title: 'Proposal draft', kind: 'focus' },
      { id: 'w5', time: '18:30', title: 'Gym', kind: 'personal' },
    ],
  },
  {
    day: 'Thu',
    date: '16',
    events: [
      { id: 'w6', time: '09:30', title: 'Finance lesson 35', kind: 'learn' },
    ],
  },
  {
    day: 'Fri',
    date: '17',
    events: [
      { id: 'w7', time: '11:00', title: 'Pay bills', kind: 'money' },
      { id: 'w8', time: '16:00', title: 'Weekly review', kind: 'personal' },
    ],
  },
  {
    day: 'Sat',
    date: '18',
    events: [{ id: 'w9', time: '10:00', title: 'Grocery run', kind: 'personal' }],
  },
  { day: 'Sun', date: '19', events: [] },
]

export const askSuggestions = [
  'How much did I spend on food this month?',
  "What's on my plan tomorrow?",
  'Summarize my notes from this week',
  'Which category grew the fastest?',
]

export const askHistory = [
  'Where did my money go last month?',
  'Compare Sep vs Oct spending',
  'Summarize week 41 notes',
]

export const dataSources = [
  { name: 'Finances', records: 312, updated: '2h ago' },
  { name: 'Notes', records: 47, updated: '5h ago' },
  { name: 'Planner', records: 28, updated: 'Yesterday' },
  { name: 'Learning', records: 96, updated: 'Yesterday' },
]

const ANSWERS = [
  {
    match: /food|dining|eat|grocery|groceries/i,
    answer:
      'You spent ₱705 on food this month — ₱420 dining out and ₱285 groceries. That is 24% of your total spend, and 17% under your ₱850 combined food budget.',
    breakdown: [
      { label: 'Food & Dining', value: 420, limit: 600 },
      { label: 'Groceries', value: 285, limit: 450 },
    ],
    insight: 'Dining out rose ₱62 vs September, mostly weekend orders.',
    followUps: [
      'Cap dining at ₱500 next month',
      'Show my top 3 restaurants',
    ],
  },
  {
    match: /plan|tomorrow|schedule|calendar|today/i,
    answer:
      'Tomorrow you have 3 blocks: Deep work (10:00), Proposal draft (13:00) and Gym (18:30). Your proposal draft is the only task that is still open from today.',
    breakdown: [
      { label: 'Focus time', value: 4, limit: 6, unit: 'h' },
      { label: 'Personal', value: 1.5, limit: 3, unit: 'h' },
    ],
    insight: 'Wednesday is your busiest day this week.',
    followUps: ['Move gym to 19:00', 'Block 2h for deep work Friday'],
  },
  {
    match: /note|summar/i,
    answer:
      'I found 4 notes from this week. Themes: index-fund investing, your project proposal outline, a receipt-tagging app idea, and a week-41 budget review.',
    breakdown: [
      { label: 'Study', value: 1, limit: 4 },
      { label: 'Work', value: 1, limit: 4 },
      { label: 'Idea', value: 1, limit: 4 },
      { label: 'Personal', value: 1, limit: 4 },
    ],
    insight: 'Two notes mention the same goal: cut impulse shopping.',
    followUps: ['Tag week-41 note as #finance', 'Draft a summary note'],
  },
]

const FALLBACK = {
  answer:
    'Here is what your data shows for that question. I pulled matching records across Finances, Notes and Planner over the last 30 days.',
  breakdown: [
    { label: 'Finances', value: 312, limit: 400 },
    { label: 'Notes', value: 47, limit: 100 },
    { label: 'Planner', value: 28, limit: 60 },
  ],
  insight: 'Spending is your fastest-moving signal this month (+13.4%).',
  followUps: [
    'Show this as a monthly trend',
    'Which records changed most?',
  ],
}

export function buildAnswer(query) {
  const found = ANSWERS.find((a) => a.match.test(query))
  const base = found || FALLBACK
  return {
    ...base,
    sources: ['Finances', 'Planner', 'Notes'],
    queriedAt: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}
