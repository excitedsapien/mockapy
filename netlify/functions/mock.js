import { createClient } from '@supabase/supabase-js'

const baseHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null
const localMocks = new Map()
const crudStore = new Map()

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

function isObjectLike(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function getCrudStoreKey(userId, path) {
  return `${userId || 'user-1'}:crud:${path}`
}

function getResourceInfo(requestedPath) {
  const normalizedPath = String(requestedPath || '/').replace(/\/+$/, '') || '/'
  const segments = normalizedPath.split('/').filter(Boolean)

  if (segments.length <= 2) {
    return {
      collectionPath: normalizedPath,
      itemId: null
    }
  }

  return {
    collectionPath: `/${segments.slice(0, -1).join('/')}`,
    itemId: segments[segments.length - 1]
  }
}

function getCrudCollection(userId, path) {
  const key = getCrudStoreKey(userId, path)

  if (!crudStore.has(key)) {
    crudStore.set(key, [])
  }

  return crudStore.get(key)
}

function normalizeCrudItem(body, id) {
  const item = isObjectLike(body) ? { ...body } : { value: body }

  if (!item.id && id) {
    item.id = id
  }

  return item
}

function handleCrudRequest(requestedPath, requestMethod, requestBody, requestedUser) {
  const resourceInfo = getResourceInfo(requestedPath)

  if (!resourceInfo.collectionPath || !resourceInfo.collectionPath.startsWith('/')) {
    return null
  }

  const collectionPath = resourceInfo.collectionPath
  const collection = getCrudCollection(requestedUser, collectionPath)
  const requestItemId = resourceInfo.itemId || (isObjectLike(requestBody) ? requestBody.id : null)

  if (requestMethod === 'GET' && !resourceInfo.itemId) {
    return new Response(JSON.stringify(collection), {
      status: 200,
      headers: baseHeaders
    })
  }

  if (requestMethod === 'POST' && !resourceInfo.itemId) {
    const nextItem = normalizeCrudItem(requestBody, requestBody?.id || `item-${Date.now()}`)
    collection.push(nextItem)
    return new Response(JSON.stringify(nextItem), {
      status: 201,
      headers: baseHeaders
    })
  }

  if (!requestItemId) {
    return new Response(JSON.stringify({
      error: 'Resource id is required for this operation. Include it in the URL path (for example /api/users/1) or in the request body.'
    }), {
      status: 400,
      headers: baseHeaders
    })
  }

  const itemIndex = collection.findIndex((item) => String(item.id) === String(requestItemId))

  if (requestMethod === 'GET') {
    if (itemIndex === -1) {
      return new Response(JSON.stringify({ error: 'Resource not found.' }), {
        status: 404,
        headers: baseHeaders
      })
    }

    return new Response(JSON.stringify(collection[itemIndex]), {
      status: 200,
      headers: baseHeaders
    })
  }

  if (requestMethod === 'DELETE') {
    if (itemIndex === -1) {
      return new Response(JSON.stringify({ error: 'Resource not found.' }), {
        status: 404,
        headers: baseHeaders
      })
    }

    const [deletedItem] = collection.splice(itemIndex, 1)
    return new Response(JSON.stringify({ deleted: true, item: deletedItem }), {
      status: 200,
      headers: baseHeaders
    })
  }

  if (requestMethod === 'PUT') {
    if (itemIndex === -1) {
      return new Response(JSON.stringify({ error: 'Resource not found.' }), {
        status: 404,
        headers: baseHeaders
      })
    }

    const updatedItem = normalizeCrudItem(requestBody, requestItemId)
    collection.splice(itemIndex, 1, updatedItem)
    return new Response(JSON.stringify(updatedItem), {
      status: 200,
      headers: baseHeaders
    })
  }

  if (requestMethod === 'PATCH') {
    if (itemIndex === -1) {
      return new Response(JSON.stringify({ error: 'Resource not found.' }), {
        status: 404,
        headers: baseHeaders
      })
    }

    const existingItem = collection[itemIndex]
    const patchedItem = normalizeCrudItem(
      {
        ...existingItem,
        ...(isObjectLike(requestBody) ? requestBody : { value: requestBody })
      },
      requestItemId
    )

    collection.splice(itemIndex, 1, patchedItem)
    return new Response(JSON.stringify(patchedItem), {
      status: 200,
      headers: baseHeaders
    })
  }

  return null
}

function isSchemaMismatchError(error) {
  const message = (error && error.message) || ''
  return message.includes('does not exist') || message.includes('column') || message.includes('Could not find')
}

async function readPersistedMock(path, method, userId) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('mocks')
      .select('status, body, headers, rules, user_id')
      .eq('path', path)
      .eq('method', method)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    if (!isSchemaMismatchError(error)) {
      throw error
    }

    const { data, legacyError } = await supabase
      .from('mocks')
      .select('status, body, headers')
      .eq('path', path)
      .eq('method', method)
      .maybeSingle()

    if (legacyError) throw legacyError
    return data ? { status: data.status, body: data.body, headers: data.headers, rules: [] } : null
  }
}

async function persistMock(savedMock) {
  if (!supabase) return

  try {
    const { error } = await supabase
      .from('mocks')
      .upsert(
        {
          path: savedMock.path,
          method: savedMock.method,
          user_id: savedMock.userId,
          status: savedMock.status,
          headers: savedMock.headers,
          body: savedMock.body,
          rules: savedMock.rules
        },
        { onConflict: 'path,method,user_id' }
      )

    if (error) throw error
  } catch (error) {
    if (!isSchemaMismatchError(error)) throw error

    const { error: fallbackError } = await supabase
      .from('mocks')
      .upsert(
        {
          path: savedMock.path,
          method: savedMock.method,
          status: savedMock.status,
          headers: savedMock.headers,
          body: savedMock.body
        },
        { onConflict: 'path,method' }
      )

    if (fallbackError) throw fallbackError
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
  if (request.method !== 'GET') {
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

      await persistMock(savedMock)

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

  const localMock = localMocks.get(getStoreKey(requestedPath, requestedMethod, requestedUser))

  if (localMock) {
    const response = buildResponse(localMock, requestedPath, url.searchParams, requestBody)
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: response.headers
    })
  }

  if (supabase) {
    try {
      const data = await readPersistedMock(requestedPath, requestedMethod, requestedUser)

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
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: baseHeaders })
    }
  }

  const crudResponse = handleCrudRequest(requestedPath, requestedMethod, requestBody, requestedUser)

  if (crudResponse) {
    return crudResponse
  }

  return new Response(JSON.stringify({ message: 'Mock endpoint is ready.', path: requestedPath, userId: requestedUser }), {
    status: 200,
    headers: baseHeaders
  })
}
