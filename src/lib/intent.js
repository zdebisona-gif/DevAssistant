/*
 * Deterministic intent routing. The app decides whether a question is:
 *   - 'local'   : the deterministic engine can answer it (no Gemini, no data leaves).
 *   - 'ai'      : an explanation/recommendation/planning ask within ONE known domain.
 *   - 'clarify' : an AI-style ask with no clear domain — we ask which area instead of
 *                 shipping a universal digest.
 * Domain detection is intentionally single-domain (no automatic cross-domain merging).
 */

const DOMAIN_RULES = [
  {
    key: 'finance',
    re: /\b(spend|spent|spending|budget|budgets|money|expense|expenses|income|salary|earn|earnings|save|saving|savings|afford|bill|bills|cost|costs|financ\w*|cheaper|overspend|overspending|owe|owes|owed|debt|debts|lent|borrow|borrowed|iou|account|accounts|balance|balances|assets|gcash|bdo)\b/i,
  },
  {
    key: 'projects',
    re: /\b(project|projects|deliverable|deliverables|deadline|deadlines|due|overdue|penalt\w*|atonement|atone|credits|locked)\b/i,
  },
  {
    key: 'learning',
    re: /\b(study|studying|learn|learning|course|courses|streak|revision|revise|exam|exams|topic|topics|practice|practise|memori[sz]e|java|python|math|maths)\b/i,
  },
  {
    key: 'planner',
    re: /\b(plan|plans|planning|schedule|scheduling|calendar|agenda|tomorrow|week|weekend|routine|productiv\w*|time)\b/i,
  },
]

const AI_INTENT_RULES =
  /\b(should i|what do you think|advice|advise|recommend\w*|suggest\w*|improve|better|why|how can i|how do i|how should i|help me|interpret|explain|explanation|make me|build me|make a plan|strategy|tips?|ideas?)\b/i

export function detectDomain(question) {
  const q = String(question || '')
  for (const rule of DOMAIN_RULES) {
    if (rule.re.test(q)) return rule.key
  }
  return null
}

export function classifyIntent(question) {
  const q = String(question || '').trim()
  if (!q) return { kind: 'local', domain: null }
  const domain = detectDomain(q)
  const wantsAi = AI_INTENT_RULES.test(q)
  if (wantsAi && domain) return { kind: 'ai', domain }
  if (wantsAi && !domain) return { kind: 'clarify', domain: null }
  return { kind: 'local', domain }
}
