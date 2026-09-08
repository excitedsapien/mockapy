import { createClient } from '@supabase/supabase-js'

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null
const localMocks = new Map()

export default async (request) => {
  if (request.method === 'OPTIONS') return new Response('', { status: 204, headers })
  if (request.method === 'GET') {
    const url = new URL(request.url)
    const path = url.searchParams.get('path') || '/api/users'
    const localMock = localMocks.get(`GET:${path}`)
    if (localMock) return new Response(JSON.stringify(localMock.body), { status: localMock.status, headers })
    if (supabase) {
      const { data, error } = await supabase.from('mocks').select('status, body').eq('path', path).eq('method', 'GET').maybeSingle()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
      if (data) return new Response(JSON.stringify(data.body), { status: data.status, headers })
    }
    return new Response(JSON.stringify({ message: 'Mock endpoint is ready.', path }), { status: 200, headers })
  }
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Use POST to save a mock.' }), { status: 405, headers })
  try {
    const mock = await request.json()
    if (!mock.path || !mock.method || mock.body === undefined) throw new Error('path, method, and body are required')
    const savedMock = { status: mock.status || 200, headers: mock.headers || '', body: mock.body }
    localMocks.set(`${mock.method}:${mock.path}`, savedMock)
    if (supabase) {
      const { error } = await supabase.from('mocks').upsert({ path: mock.path, method: mock.method, ...savedMock }, { onConflict: 'path,method' })
      if (error) throw error
    }
    return new Response(JSON.stringify({ ok: true, path: mock.path, method: mock.method, status: mock.status || 200, data: mock.body, persisted: Boolean(supabase) }), { status: 200, headers })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers })
  }
}
