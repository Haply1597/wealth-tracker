import { get } from 'svelte/store'
import { sha256 } from 'js-sha256'
import { checkPassword } from './apis'
import { isAuthenticated, isLoading, isResettable, isPasswordAllowed } from '../stores'

export const initializeAuth = async () => {
  if (!get(isLoading)) {
    isLoading.set(true)
  }

  try {
    const { canBeReset, allowPassword, havePassword, needPassword } = (await checkPassword()) as any
    isResettable.set(canBeReset)
    isAuthenticated.set(!needPassword)
    isPasswordAllowed.set(allowPassword || havePassword)
  } catch (error) {
    console.error('Failed to check password status:', error)
    isAuthenticated.set(true)
  } finally {
    isLoading.set(false)
  }
}

export async function hashPassword(password: string): Promise<string> {
  try {
    let hashArray: number[]

    if (window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder()
      const data = encoder.encode(password)
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
      hashArray = Array.from(new Uint8Array(hashBuffer))
    } else {
      // 非安全上下文（HTTP + 局域网 IP）下 Web Crypto 不可用，
      // 回退到纯 JS 实现，结果与 Web Crypto 完全一致，保证 HTTP/HTTPS 下算出的哈希相同。
      console.log('Web Crypto API unavailable, falling back to js-sha256.')
      hashArray = sha256.array(password)
    }

    const passwordHash = btoa(String.fromCharCode.apply(null, hashArray))
    return JSON.stringify(passwordHash)
  } catch (error) {
    console.error('Hash Password Error:', error)
    return password
  }
}
