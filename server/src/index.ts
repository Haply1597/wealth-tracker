import fs from 'fs/promises'
import path from 'path'
import Fastify, { FastifyInstance } from 'fastify'
import fastifyStatic from '@fastify/static'
// Fix Bug: [fetch is not defined](Ubuntu16 Cannot Upgrade Node to v18.*)
import 'isomorphic-fetch'
import { Sequelize } from 'sequelize'
import { applyRuntimeOptions, getRuntimeOptions, ServerRuntimeOptions } from './helper/runtime'

let fastify: FastifyInstance | null = null
let sequelize: Sequelize | null = null
let serverAddress = ''
let appPromise: Promise<FastifyInstance> | null = null

const ensureDatabaseDirectory = async (dbPath: string) => {
  await fs.mkdir(path.dirname(dbPath), { recursive: true })
}

// Backward-safe SQLite migration: sequelize.sync() never adds columns to
// existing tables, so new columns must be added explicitly via ALTER TABLE.
const hasColumn = async (table: string, column: string) => {
  if (!sequelize) {
    return false
  }

  const [results] = await sequelize.query(`PRAGMA table_info(${table})`)
  return results.some((row: any) => row.name === column)
}

// Convert legacy kind=LIABILITY rows (positive amount) back to negative amounts.
const migrateKindToSignBasedAmounts = async () => {
  if (!sequelize) {
    return
  }

  for (const table of ['assets', 'record']) {
    if (!(await hasColumn(table, 'kind'))) {
      continue
    }

    const [result] = await sequelize.query(
      `UPDATE ${table} SET amount = -ABS(amount) WHERE kind = 'LIABILITY' AND amount > 0`,
    )
    const changes = (result as { changes?: number }).changes ?? 0
    if (changes > 0) {
      console.log(`Migrated ${changes} legacy liability rows in ${table} to negative amounts`)
    }
  }
}

const addColumnIfNotExists = async (table: string, column: string, definition: string) => {
  if (!sequelize) {
    return
  }

  try {
    const [results] = await sequelize.query(`PRAGMA table_info(${table})`)
    const hasColumn = results.some((row: any) => row.name === column)

    if (!hasColumn) {
      console.log(`Adding ${column} column to ${table} table...`)
      await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
      console.log(`✅ ${column} column added to ${table} table successfully!`)
    }
  } catch (err) {
    console.error(`Error adding ${column} column to ${table} table:`, err)
  }
}

const connectToSqlite = async () => {
  if (!sequelize) {
    throw new Error('Sequelize has not been initialized.')
  }

  try {
    await ensureDatabaseDirectory(getRuntimeOptions().dbPath)
    await sequelize.sync()
    await addColumnIfNotExists('assets', 'tags', "TEXT DEFAULT ''")
    await addColumnIfNotExists('record', 'tags', "TEXT DEFAULT ''")
    await migrateKindToSignBasedAmounts()
    console.log('🎊 Database synced!')
  } catch (err) {
    console.error('Failed to sync database:', err)
    throw err
  }
}

const setupStaticFiles = (app: FastifyInstance, publicDir: string) => {
  app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
  })

  // 飞牛统一网关不剥 gatewayPrefix，把 /app/wealth-tracker/* 整段转发给后端，
  // 而 client vite 用 base='/app/wealth-tracker/' 产出绝对前缀的资源引用。
  // 注册第二个 static 实例服务该前缀，让 /app/wealth-tracker/assets/x.js 能命中文件。
  app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/app/wealth-tracker/',
    decorateReply: false,
  })
}

const setupNotFoundHandler = (app: FastifyInstance, publicDir: string) => {
  app.setNotFoundHandler(async (request, reply) => {
    if (!request.url.includes('/api/')) {
      const indexHtmlContent = await fs.readFile(path.join(publicDir, 'index.html'), 'utf-8')
      reply.type('text/html').send(indexHtmlContent)
    } else {
      reply.code(404).send({ error: 'Oops , Page Not Found.' })
    }
  })
}

const loadServerModules = async () => {
  const [registerModule, routesModule, modelsModule] = await Promise.all([
    import('./register'),
    import('./routes'),
    import('./models'),
    import('./models/customCurrency'),
    import('./models/userSettings'),
    import('./models/assets'),
    import('./models/records'),
    import('./models/insights'),
    import('./models/goals'),
    import('./models/password'),
    import('./models/session'),
  ])

  sequelize = modelsModule.sequelize

  return {
    registerPlugins: registerModule.default,
    routes: routesModule.default,
  }
}

export const createApp = async (options: ServerRuntimeOptions = {}) => {
  if (fastify) {
    return fastify
  }

  if (appPromise) {
    return appPromise
  }

  appPromise = (async () => {
    const runtimeOptions = applyRuntimeOptions(options)
    const app = Fastify({ logger: true })
    const { registerPlugins, routes } = await loadServerModules()

    await connectToSqlite()
    await registerPlugins(app)
    // 注册原始路由（TCP 直连模式用，/api/*）
    routes.forEach((route: any) => app.route(route))

    // 飞牛统一网关不剥 gatewayPrefix，把 /app/wealth-tracker/api/* 整段转发给后端。
    // fastify 4 路由解析在 onRequest 之前，运行时无法改 URL 影响路由匹配，
    // 只能在注册时把所有 API 路由再以 /app/wealth-tracker 为前缀注册一遍。
    app.register(
      function (apiApp, _opts, done) {
        routes.forEach((route: any) => apiApp.route(route))
        done()
      },
      { prefix: '/app/wealth-tracker' }
    )

    setupStaticFiles(app, runtimeOptions.publicDir)
    setupNotFoundHandler(app, runtimeOptions.publicDir)

    fastify = app
    return app
  })()

  try {
    return await appPromise
  } catch (error) {
    appPromise = null
    throw error
  }
}

export const startServer = async (options: ServerRuntimeOptions = {}) => {
  const app = await createApp(options)
  const runtimeOptions = getRuntimeOptions()

  if (!app.server.listening) {
    if (runtimeOptions.gatewaySocket) {
      // 飞牛统一网关模式：监听 Unix Domain Socket。
      // 1) 删除已存在的 socket 文件，否则 listen 会报 EADDRINUSE
      // 2) 确保父目录存在
      // 3) listen 后给 socket 文件 666 权限，让飞牛网关进程能读写
      const socketPath = runtimeOptions.gatewaySocket
      try {
        await fs.unlink(socketPath)
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          app.log.warn(`Failed to remove stale socket ${socketPath}: ${err.message}`)
        }
      }
      await fs.mkdir(path.dirname(socketPath), { recursive: true })
      serverAddress = await app.listen({ path: socketPath })
      try {
        await fs.chmod(socketPath, 0o666)
      } catch (err: any) {
        app.log.warn(`Failed to chmod socket ${socketPath}: ${err.message}`)
      }
      app.log.info(`server listening on unix socket ${serverAddress}`)
    } else {
      serverAddress = await app.listen({
        host: runtimeOptions.host,
        port: runtimeOptions.port,
      })
      app.log.info(`server listening on ${serverAddress}`)
    }
  }

  return {
    address: serverAddress,
    app,
    options: runtimeOptions,
  }
}

export const stopServer = async () => {
  if (fastify) {
    await fastify.close()
  }

  if (sequelize) {
    await sequelize.close()
  }

  fastify = null
  sequelize = null
  serverAddress = ''
  appPromise = null
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
