import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  getPublicDir,
  getSqliteDbPath,
  parseBooleanEnv,
} from './constant'

export interface ServerRuntimeOptions {
  host?: string
  port?: number
  publicDir?: string
  dbPath?: string
  allowPassword?: boolean
  canBeReset?: boolean
  gatewaySocket?: string
}

export interface ResolvedServerRuntimeOptions {
  host: string
  port: number
  publicDir: string
  dbPath: string
  allowPassword: boolean
  canBeReset: boolean
  gatewaySocket: string
}

let runtimeOptions: ResolvedServerRuntimeOptions = {
  host: process.env.HOST || DEFAULT_HOST,
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT,
  publicDir: getPublicDir(),
  dbPath: getSqliteDbPath(),
  allowPassword: parseBooleanEnv(process.env.ALLOW_PASSWORD, false),
  canBeReset: parseBooleanEnv(process.env.CAN_BE_RESET, false),
  gatewaySocket: process.env.GATEWAY_SOCKET || '',
}

const setEnvValue = (key: string, value: string | number | boolean) => {
  process.env[key] = String(value)
}

export const resolveRuntimeOptions = (
  options: ServerRuntimeOptions = {},
): ResolvedServerRuntimeOptions => {
  return {
    host: options.host || process.env.HOST || DEFAULT_HOST,
    port:
      options.port ??
      (process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT),
    publicDir: options.publicDir || process.env.PUBLIC_DIR || getPublicDir(),
    dbPath: options.dbPath || process.env.SQLITE_DB_PATH || getSqliteDbPath(),
    allowPassword:
      options.allowPassword ?? parseBooleanEnv(process.env.ALLOW_PASSWORD, false),
    canBeReset: options.canBeReset ?? parseBooleanEnv(process.env.CAN_BE_RESET, false),
    gatewaySocket: options.gatewaySocket || process.env.GATEWAY_SOCKET || '',
  }
}

export const applyRuntimeOptions = (
  options: ServerRuntimeOptions = {},
): ResolvedServerRuntimeOptions => {
  runtimeOptions = resolveRuntimeOptions(options)

  setEnvValue('HOST', runtimeOptions.host)
  setEnvValue('PORT', runtimeOptions.port)
  setEnvValue('PUBLIC_DIR', runtimeOptions.publicDir)
  setEnvValue('SQLITE_DB_PATH', runtimeOptions.dbPath)
  setEnvValue('ALLOW_PASSWORD', runtimeOptions.allowPassword)
  setEnvValue('CAN_BE_RESET', runtimeOptions.canBeReset)
  setEnvValue('GATEWAY_SOCKET', runtimeOptions.gatewaySocket)

  return runtimeOptions
}

export const getRuntimeOptions = () => {
  return runtimeOptions
}
