import $ajax from './ajax'

// vite 的 BASE_URL = base 配置（默认 '/'，飞牛网关模式下为 '/app/wealth-tracker/'）。
// 飞牛网关只把 gatewayPrefix 下的请求转发给容器，所以 API 请求也要带这个前缀，
// 否则飞牛会把 /api/* 当成系统自己的接口处理掉。
const API_PREFIX = import.meta.env.BASE_URL.replace(/\/$/, '')

const genApiPath = (path) => {
  return `${API_PREFIX}/api/${path}`
}

export const createAssets = (data) => {
  return $ajax.post(genApiPath('assets'), data)
}

export const getAssets = (data = {}) => {
  return $ajax.get(genApiPath('assets'), data)
}

export const updateAssets = (data) => {
  return $ajax.put(genApiPath('assets'), data)
}

export const destroyAssets = (data) => {
  return $ajax.delete(genApiPath('assets'), data)
}

export const checkPassword = (data = {}) => {
  return $ajax.get(genApiPath('password/check'), data)
}

export const verifyPassword = (password: string) => {
  return $ajax.post(genApiPath('password/verify'), { password })
}

export const setPassword = (password: string) => {
  return $ajax.post(genApiPath('password/set'), { password })
}

export const getRecords = (data = {}) => {
  return $ajax.get(genApiPath('records'), data)
}

export const updateRecords = (data) => {
  return $ajax.post(genApiPath('records'), data)
}

export const destroyRecords = (data) => {
  return $ajax.delete(genApiPath('records'), data)
}

export const createInsights = (data) => {
  return $ajax.post(genApiPath('insights'), data)
}

export const getInsights = (data = {}) => {
  return $ajax.get(genApiPath('insights'), data)
}

export const updateInsights = (data) => {
  return $ajax.put(genApiPath('insights'), data)
}

export const destroyInsights = (data) => {
  return $ajax.delete(genApiPath('insights'), data)
}

export const getInsightsCalendarData = (data) => {
  return $ajax.get(genApiPath('insights/calendar'), data)
}

export const createGoal = (data) => {
  return $ajax.post(genApiPath('goals'), data)
}

export const getGoals = () => {
  return $ajax.get(genApiPath('goals'), {})
}

export const updateGoal = (data) => {
  return $ajax.put(genApiPath('goals'), data)
}

export const destroyGoal = (data) => {
  return $ajax.delete(genApiPath('goals'), data)
}

export const exportBackup = () => {
  return $ajax.get(genApiPath('backup/export'), {})
}

export const importBackup = (data) => {
  return $ajax.post(genApiPath('backup/import'), data)
}

export const resetDatabase = () => {
  return $ajax.post(genApiPath('reset'), {})
}

export const generateAdvice = (data) => {
  return $ajax.post(genApiPath('generate-advice'), data)
}

export const getUserSettings = () => {
  return $ajax.get(genApiPath('settings'), {})
}

export const updateUserSettings = (data) => {
  return $ajax.put(genApiPath('settings'), data)
}

export const getCustomCurrencies = () => {
  return $ajax.get(genApiPath('currencies'), {})
}

export const getAllCustomCurrencies = () => {
  return $ajax.get(genApiPath('currencies/all'), {})
}

export const createCustomCurrency = (data) => {
  return $ajax.post(genApiPath('currencies'), data)
}

export const updateCustomCurrency = (id, data) => {
  return $ajax.put(genApiPath(`currencies/${id}`), data)
}

export const deleteCustomCurrency = (id) => {
  return $ajax.delete(genApiPath(`currencies/${id}`), {})
}
