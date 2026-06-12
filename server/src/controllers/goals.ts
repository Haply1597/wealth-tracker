import { Goal } from '../models/goals'
import {
  hasGoalDeadlineInput,
  normalizeGoalInput,
  parseGoalAmount,
  parseGoalDeadline,
} from '../helper/goals'

export const create = async (request, reply) => {
  const params = request?.body
  try {
    const normalized = normalizeGoalInput({
      name: params?.name,
      amount: params?.amount,
      deadline: params?.deadline,
    })
    if (!normalized.ok) {
      return reply.code(400).send({
        statusCode: 400,
        message: normalized.message,
      })
    }

    const goal = await Goal.create({
      name: normalized.value.name,
      amount: normalized.value.amount,
      currency: params.currency || 'CNY',
      deadline: normalized.value.deadline,
      created: new Date(),
      updated: new Date(),
    })
    return reply.send(goal)
  } catch (error: any) {
    return reply.code(400).send({
      statusCode: 400,
      message: error.message,
    })
  }
}

export const get = async (_, reply) => {
  try {
    const data = await Goal.findAll({ order: [['created', 'ASC']] })
    return reply.send(data)
  } catch (error: any) {
    return reply.code(400).send({
      statusCode: 400,
      message: error.message,
    })
  }
}

export const update = async (request, reply) => {
  const params = request?.body
  try {
    const options: any = { updated: new Date() }

    if (params.name !== undefined) {
      const name = typeof params.name === 'string' ? params.name.trim() : ''
      if (!name) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'A goal requires a name.',
        })
      }
      options.name = name
    }

    if (params.amount !== undefined) {
      const amount = parseGoalAmount(params.amount)
      if (amount === null) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'A goal requires a positive numeric target amount.',
        })
      }
      options.amount = amount
    }

    if (params.deadline !== undefined) {
      if (hasGoalDeadlineInput(params.deadline) && parseGoalDeadline(params.deadline) === null) {
        return reply.code(400).send({
          statusCode: 400,
          message: 'Deadline must be empty or a valid date (YYYY-MM-DD).',
        })
      }
      options.deadline = parseGoalDeadline(params.deadline)
    }

    if (params.currency !== undefined) options.currency = params.currency
    if (params.achievedAt !== undefined) options.achievedAt = params.achievedAt || null

    const data = await Goal.update(options, {
      where: { id: params.id },
    })
    return reply.send(data)
  } catch (error: any) {
    return reply.code(400).send({
      statusCode: 400,
      message: error.message,
    })
  }
}

export const destroy = async (request, reply) => {
  const { id } = request?.body
  try {
    await Goal.destroy({ where: { id } })
    return reply.send({ result: true })
  } catch (error: any) {
    return reply.code(400).send({
      statusCode: 400,
      message: error.message,
    })
  }
}
