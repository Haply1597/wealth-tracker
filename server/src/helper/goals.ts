const GOAL_AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/
const GOAL_DEADLINE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Accept only plain positive numeric amounts (rejects strings like "note96897.99"). */
export const parseGoalAmount = (amount: unknown): number | null => {
  if (amount === null || amount === undefined || amount === '') {
    return null
  }

  if (typeof amount === 'number') {
    if (!Number.isFinite(amount) || amount <= 0) {
      return null
    }
    return amount
  }

  if (typeof amount === 'string') {
    const trimmed = amount.trim()
    if (!GOAL_AMOUNT_PATTERN.test(trimmed)) {
      return null
    }
    const value = Number(trimmed)
    if (!Number.isFinite(value) || value <= 0) {
      return null
    }
    return value
  }

  return null
}

/** Accept YYYY-MM-DD or empty; reject risk enums and other free text. */
export const parseGoalDeadline = (deadline: unknown): string | null => {
  if (deadline === null || deadline === undefined || deadline === '') {
    return null
  }

  if (typeof deadline !== 'string') {
    return null
  }

  const trimmed = deadline.trim()
  if (!trimmed) {
    return null
  }

  if (!GOAL_DEADLINE_PATTERN.test(trimmed)) {
    return null
  }

  const parsed = new Date(`${trimmed}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return trimmed
}

export const hasGoalDeadlineInput = (deadline: unknown): boolean => {
  if (deadline === null || deadline === undefined) {
    return false
  }
  return String(deadline).trim().length > 0
}

export type GoalInput = {
  name?: unknown
  amount?: unknown
  deadline?: unknown
}

export type NormalizedGoalInput = {
  name: string
  amount: number
  deadline: string | null
}

export const normalizeGoalInput = (
  input: GoalInput,
): { ok: true; value: NormalizedGoalInput } | { ok: false; message: string } => {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const amount = parseGoalAmount(input.amount)
  const deadline = parseGoalDeadline(input.deadline)

  if (!name) {
    return { ok: false, message: 'A goal requires a name.' }
  }

  if (amount === null) {
    return { ok: false, message: 'A goal requires a positive numeric target amount.' }
  }

  if (hasGoalDeadlineInput(input.deadline) && deadline === null) {
    return {
      ok: false,
      message: 'Deadline must be empty or a valid date (YYYY-MM-DD).',
    }
  }

  return { ok: true, value: { name, amount, deadline } }
}
