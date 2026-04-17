/**
 * 全局 API 请求客户端
 * 所有主题共享此文件，避免重复造轮子
 */
const McApi = (() => {
  let baseURL = '/api'

  function setBaseURL(url) {
    baseURL = url.replace(/\/$/, '')
  }

  async function request(endpoint, options = {}) {
    const url = baseURL + endpoint
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }

      return data
    } catch (err) {
      console.error(`[API] ${endpoint} 请求失败:`, err.message)
      throw err
    }
  }

  function get(endpoint, params = {}) {
    const query = Object.entries(params)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    const url = query ? `${endpoint}?${query}` : endpoint
    return request(url)
  }

  function post(endpoint, body = {}) {
    return request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  return { setBaseURL, get, post }
})()

if (typeof window !== 'undefined') {
  window.McApi = McApi
}
