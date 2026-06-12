import { Assets } from '../models/assets'
import { Record } from '../models/records'
import { Insight } from '../models/insights'
import { Goal } from '../models/goals'
import CustomCurrency from '../models/customCurrency'
import { normalizeGoalInput } from '../helper/goals'

const BACKUP_APP_NAME = 'wealth-tracker'
const BACKUP_VERSION = 1

// Stable dedupe key for an asset snapshot, tolerant to Date/string created values.
const genRecordKey = (item: any) => {
  const created = item.created ? new Date(item.created).getTime() : 0
  return [item.type, item.datetime, Number(item.amount), item.currency, created].join('|')
}

const normalizeImportedAmount = (item: any) => {
  const amount = Number(item.amount)
  if (item.kind === 'LIABILITY' && amount > 0) {
    return -Math.abs(amount)
  }
  return item.amount
}

const genInsightKey = (item: any) => {
  const created = item.created ? new Date(item.created).getTime() : 0
  return [item.title, created].join('|')
}

export const exportData = async (_, reply) => {
  try {
    const [assets, records, insights, goals, customCurrencies] = await Promise.all([
      Assets.findAll({ raw: true }),
      Record.findAll({ raw: true }),
      Insight.findAll({ raw: true }),
      Goal.findAll({ raw: true }),
      CustomCurrency.findAll({ raw: true }),
    ])

    return reply.send({
      app: BACKUP_APP_NAME,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: { assets, records, insights, goals, customCurrencies },
    })
  } catch (error: any) {
    return reply.code(400).send({
      statusCode: 400,
      message: error.message,
    })
  }
}

export const importData = async (request, reply) => {
  const payload = request?.body
  const data = payload?.data

  if (payload?.app !== BACKUP_APP_NAME || !data || typeof data !== 'object') {
    return reply.code(400).send({
      statusCode: 400,
      message: 'Invalid backup file: expected a wealth-tracker backup JSON.',
    })
  }

  try {
    const counts = { assets: 0, records: 0, insights: 0, goals: 0, customCurrencies: 0 }

    if (Array.isArray(data.assets)) {
      for (const item of data.assets) {
        if (!item?.type || item.amount === undefined) continue
        await Assets.upsert({
          type: String(item.type),
          alias: item.alias || String(item.type),
          amount: normalizeImportedAmount(item),
          currency: item.currency || 'CNY',
          note: item.note || '',
          risk: item.risk || 'LOW',
          liquidity: item.liquidity || 'GOOD',
          tags: item.tags || '',
          datetime: item.datetime,
          created: item.created || new Date(),
          updated: new Date(),
        })
        counts.assets += 1
      }
    }

    if (Array.isArray(data.records)) {
      const existing = await Record.findAll({ raw: true })
      const existingKeys = new Set(existing.map(genRecordKey))
      const newRecords = data.records
        .filter((item: any) => item?.type && item.amount !== undefined && item.datetime)
        .filter((item: any) => {
          const key = genRecordKey(item)
          if (existingKeys.has(key)) return false
          existingKeys.add(key)
          return true
        })
        .map((item: any) => ({
          type: String(item.type),
          alias: item.alias || String(item.type),
          amount: normalizeImportedAmount(item),
          currency: item.currency || 'CNY',
          note: item.note || '',
          risk: item.risk || 'LOW',
          liquidity: item.liquidity || 'GOOD',
          tags: item.tags || '',
          datetime: item.datetime,
          created: item.created || new Date(),
        }))
      await Record.bulkCreate(newRecords)
      counts.records = newRecords.length
    }

    if (Array.isArray(data.insights)) {
      const existing = await Insight.findAll({ raw: true })
      const existingKeys = new Set(existing.map(genInsightKey))
      const newInsights = data.insights
        .filter((item: any) => item?.title && item?.content)
        .filter((item: any) => {
          const key = genInsightKey(item)
          if (existingKeys.has(key)) return false
          existingKeys.add(key)
          return true
        })
        .map((item: any) => ({
          title: item.title,
          content: item.content,
          tags: item.tags || '',
          created: item.created || new Date(),
          updated: item.updated || new Date(),
        }))
      await Insight.bulkCreate(newInsights)
      counts.insights = newInsights.length
    }

    if (Array.isArray(data.goals)) {
      const newGoals = data.goals
        .map((item: any) => {
          const normalized = normalizeGoalInput({
            name: item?.name,
            amount: item?.amount,
            deadline: item?.deadline,
          })
          if (!normalized.ok) return null
          return {
            name: normalized.value.name,
            amount: normalized.value.amount,
            currency: item.currency || 'CNY',
            deadline: normalized.value.deadline,
            achievedAt: item.achievedAt || null,
            created: item.created || new Date(),
            updated: new Date(),
          }
        })
        .filter(Boolean)

      // Replace goals entirely so stale or corrupted rows do not linger after import.
      await Goal.destroy({ where: {} })
      if (newGoals.length > 0) {
        await Goal.bulkCreate(newGoals)
      }
      counts.goals = newGoals.length
    }

    if (Array.isArray(data.customCurrencies)) {
      for (const item of data.customCurrencies) {
        if (!item?.code || !item?.symbol) continue
        const existing = await CustomCurrency.findOne({ where: { code: item.code } })
        const values = {
          code: item.code,
          symbol: item.symbol,
          name: item.name || '',
          exchangeRate: item.exchangeRate,
          isActive: item.isActive !== false,
        }
        if (existing) {
          await existing.update(values)
        } else {
          await CustomCurrency.create(values)
        }
        counts.customCurrencies += 1
      }
    }

    return reply.send({ success: true, counts })
  } catch (error: any) {
    return reply.code(400).send({
      statusCode: 400,
      message: error.message,
    })
  }
}
