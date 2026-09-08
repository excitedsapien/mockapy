import { createClient } from '@supabase/supabase-js'

const baseHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null
const localMocks = new Map()

function getStoreKey(path, method, userId) {
  return `${userId || 'user-1'}:${String(method).toUpperCase()}:${path}`
}

function parseHeaders(headerValue) {
  const responseHeaders = new Headers()
  responseHeaders.set('Content-Type', 'application/json')
  responseHeaders.set('Access-Control-Allow-Origin', '*')

  if (!headerValue) return responseHeaders

  const entries = String(headerValue)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  for (const entry of entries) {
    const separatorIndex = entry.indexOf(':')
    if (separatorIndex === -1) continue

    const key = entry.slice(0, separatorIndex).trim()
    const value = entry.slice(separatorIndex + 1).trim()

    if (key) {
      responseHeaders.set(key, value)
    }
  }

  return responseHeaders
}

function getRouteParams(template, actualPath) {
  const templateParts = String(template).split('/').filter(Boolean)
  const actualParts = String(actualPath).split('/').filter(Boolean)

  if (templateParts.length !== actualParts.length) {
    return null
  }

  const params = {}

  for (let index = 0; index < templateParts.length; index += 1) {
    const templatePart = templateParts[index]
    const actualPart = actualParts[index]

    if (templatePart.startsWith(':')) {
      params[templatePart.slice(1)] = actualPart
      continue
    }

    if (templatePart !== actualPart) {
      return null
    }
  }

  return params
}

function matchesValue(expected, actual) {
  if (actual === undefined || actual === null) return false
  return String(actual) === String(expected)
}

function matchRule(rule, requestedPath, query, body) {
  if (!rule || !rule.match) return true

  const params = getRouteParams(rule.path || requestedPath, requestedPath)

  if (rule.match.params) {
    for (const [key, expectedValue] of Object.entries(rule.match.params)) {
      if (!params || !matchesValue(expectedValue, params[key])) {
        return false
      }
    }
  }

  if (rule.match.query) {
    for (const [key, expectedValue] of Object.entries(rule.match.query)) {
      if (!matchesValue(expectedValue, query.get(key))) {
        return false
      }
    }
  }

  if (rule.match.body && body && typeof body === 'object') {
    for (const [key, expectedValue] of Object.entries(rule.match.body)) {
      if (!matchesValue(expectedValue, body[key])) {
        return false
      }
    }
  }

  return true
}

function buildResponse(rawMock, requestedPath, query, body) {
  if (!rawMock || !rawMock.body) {
    return {
      status: 200,
      headers: parseHeaders('Content-Type: application/json'),
      body: { message: 'Mock endpoint is ready.' }
    }
  }

  if (Array.isArray(rawMock.rules) && rawMock.rules.length > 0) {
    for (const rule of rawMock.rules) {
      if (matchRule(rule, requestedPath, query, body)) {
        const ruleHeaders = parseHeaders(rule.response?.headers || rawMock.headers)
        return {
          status: rule.response?.status || rawMock.status || 200,
          headers: ruleHeaders,
          body: rule.response?.body || rawMock.body
        }
      }
    }
  }

  const responseHeaders = parseHeaders(rawMock.headers)

  return {
    status: rawMock.status || 200,
    headers: responseHeaders,
    body: rawMock.body
  }
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: baseHeaders })
  }

  const url = new URL(request.url)
  const requestedPath = url.searchParams.get('path') || '/api/users'
  const requestedUser = url.searchParams.get('user') || url.searchParams.get('userId') || 'user-1'

  let requestBody = {}
  if (request.method === 'POST') {
    try {
      const bodyText = await request.text()
      requestBody = bodyText ? JSON.parse(bodyText) : {}
    } catch {
      return new Response(JSON.stringify({ error: 'Request body must be valid JSON.' }), { status: 400, headers: baseHeaders })
    }
  }

  const isSaveRequest = requestBody.mode === 'save' || requestBody.action === 'save'
  const requestedMethod = (
    url.searchParams.get('method') || requestBody.method || request.method || 'GET'
  ).toUpperCase()

  if (request.method === 'POST' && isSaveRequest) {
    try {
      const mock = requestBody
      if (!mock.path || !mock.method || mock.body === undefined) {
        throw new Error('path, method, and body are required')
      }

      const savedMock = {
        status: mock.status || 200,
        headers: mock.headers || 'Content-Type: application/json',
        body: mock.body,
        rules: Array.isArray(mock.rules) ? mock.rules : [],
        userId: mock.userId || requestedUser
      }

      const key = getStoreKey(mock.path, mock.method, savedMock.userId)
      localMocks.set(key, savedMock)

      if (supabase) {
        const { error } = await supabase
          .from('mocks')
          .upsert(
            {
              path: mock.path,
              method: mock.method,
              user_id: savedMock.userId,
              status: savedMock.status,
              headers: savedMock.headers,
              body: savedMock.body,
              rules: savedMock.rules
            },
            { onConflict: 'path,method,user_id' }
          )

        if (error) throw error
      }

      return new Response(
        JSON.stringify({
          ok: true,
          path: mock.path,
          method: mock.method,
          userId: savedMock.userId,
          status: savedMock.status,
          data: mock.body,
          rules: savedMock.rules,
          persisted: Boolean(supabase)
        }),
        { status: 200, headers: baseHeaders }
      )
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: baseHeaders })
    }
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Use POST to save a mock.' }), { status: 405, headers: baseHeaders })
  }

  const localMock = localMocks.get(getStoreKey(requestedPath, requestedMethod, requestedUser))

  if (localMock) {
    const response = buildResponse(localMock, requestedPath, url.searchParams, requestBody)
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: response.headers
    })
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('mocks')
      .select('status, body, headers, rules')
      .eq('path', requestedPath)
      .eq('method', requestedMethod)
      .eq('user_id', requestedUser)
      .maybeSingle()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: baseHeaders })
    }

    if (data) {
      const response = buildResponse({
        status: data.status,
        headers: data.headers,
        body: data.body,
        rules: data.rules || []
      }, requestedPath, url.searchParams, requestBody)

      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: response.headers
      })
    }
  }

  return new Response(JSON.stringify({ message: 'Mock endpoint is ready.', path: requestedPath, userId: requestedUser }), {
    status: 200,
    headers: baseHeaders
  })
}
