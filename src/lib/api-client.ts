/**
 * 统一 API 客户端
 * 提供统一的请求配置、错误处理和响应解析
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

/**
 * 基础 API 请求函数
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...init } = options

  // 构建完整 URL
  let url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }

  // 默认 headers
  const headers: HeadersInit = {
    ...init.headers,
  }

  // 如果是 JSON body，设置 Content-Type
  if (init.body && typeof init.body === 'string') {
    headers['Content-Type'] = 'application/json'
  }

  // 发送请求
  const response = await fetch(url, {
    ...init,
    headers,
  })

  // 解析响应
  const data = response.status !== 204 ? await response.json().catch(() => null) : null

  // 错误处理
  if (!response.ok) {
    const message = data?.error || data?.message || `HTTP Error: ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  return data
}

/**
 * API 客户端对象
 */
export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  // 文件上传
  upload: <T>(endpoint: string, formData: FormData, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
    }),
}

/**
 * 辅助函数：创建带前缀的 API 客户端
 */
export function createApiClient(prefix: string) {
  return {
    get: <T>(path: string, options?: RequestOptions) =>
      api.get<T>(`${prefix}${path}`, options),

    post: <T>(path: string, body?: any, options?: RequestOptions) =>
      api.post<T>(`${prefix}${path}`, body, options),

    put: <T>(path: string, body?: any, options?: RequestOptions) =>
      api.put<T>(`${prefix}${path}`, body, options),

    patch: <T>(path: string, body?: any, options?: RequestOptions) =>
      api.patch<T>(`${prefix}${path}`, body, options),

    delete: <T>(path: string, options?: RequestOptions) =>
      api.delete<T>(`${prefix}${path}`, options),

    upload: <T>(path: string, formData: FormData, options?: RequestOptions) =>
      api.upload<T>(`${prefix}${path}`, formData, options),
  }
}

// 预定义的 API 客户端
export const projectsApi = createApiClient('/api/projects')
export const experimentsApi = createApiClient('/api/experiments')
export const usersApi = createApiClient('/api/users')
export const authApi = createApiClient('/api/auth')
