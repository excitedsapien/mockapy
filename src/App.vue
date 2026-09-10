<script setup>
import { computed, onMounted, ref } from 'vue'

const method = ref('GET')
const endpoint = ref('/api/users')
const responseBody = ref(`{
  "users": [
    { "id": 1, "name": "Ada Lovelace", "role": "admin" },
    { "id": 2, "name": "Alan Turing", "role": "member" }
  ]
}`)
const status = ref(200)
const headers = ref('Content-Type: application/json')
const isSaving = ref(false)
const notice = ref('')
const response = ref(null)
const theme = ref('light')
const activeUser = ref('user-1')
const testQuery = ref('')
const testBody = ref('')
const testResult = ref(null)
const isTesting = ref(false)
const userSlots = Array.from({ length: 5 }, (_, index) => `user-${index + 1}`)
const advancedRules = ref(`[
  {
    "name": "Return a specific user by query",
    "match": {
      "query": { "id": "1" }
    },
    "response": {
      "status": 200,
      "body": {
        "id": 1,
        "name": "Ada Lovelace",
        "role": "admin"
      }
    }
  },
  {
    "name": "Return a specific user by params",
    "match": {
      "params": { "id": "2" }
    },
    "response": {
      "status": 200,
      "body": {
        "id": 2,
        "name": "Alan Turing",
        "role": "member"
      }
    }
  }
]`)
const savedMocks = ref([])

const savedMocksForActiveUser = computed(() => {
  return savedMocks.value
    .filter((mock) => mock.userId === activeUser.value)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
})

const curlCommand = computed(() => {
  const url = new URL(`${window.location.origin}/.netlify/functions/mock`)
  url.searchParams.set('path', endpoint.value)
  url.searchParams.set('user', activeUser.value)

  if (testQuery.value.trim()) {
    const queryParams = new URLSearchParams(testQuery.value.replace(/^\?/, ''))
    queryParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
  }

  if (method.value !== 'GET') {
    url.searchParams.set('method', method.value)
  }

  return `curl -X ${method.value} "${url.toString()}"`
})

const testUrl = computed(() => {
  const url = new URL(`${window.location.origin}/.netlify/functions/mock`)
  url.searchParams.set('path', endpoint.value)
  url.searchParams.set('user', activeUser.value)

  if (testQuery.value.trim()) {
    const queryParams = new URLSearchParams(testQuery.value.replace(/^\?/, ''))
    queryParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
  }

  return url.toString()
})

const requestBaseUrl = computed(() => {
  const url = new URL(`${window.location.origin}/.netlify/functions/mock`)
  url.searchParams.set('path', endpoint.value)
  url.searchParams.set('user', activeUser.value)
  return url.toString()
})

const standardMockApiExamples = computed(() => [
  {
    title: 'Basic GET request',
    helper: 'Open this URL in the browser or paste it into Postman to receive the saved mock for the selected user slot.',
    value: requestBaseUrl.value
  },
  {
    title: 'Query-matched request',
    helper: 'Append query values such as id=1 to trigger a rule that checks query params.',
    value: `${requestBaseUrl.value}&id=1`
  },
  {
    title: 'Path param request',
    helper: 'For route-based rules, use a URL like /api/users/2 and swap the path as needed.',
    value: `${window.location.origin}/.netlify/functions/mock?path=${encodeURIComponent('/api/users/2')}&user=${encodeURIComponent(activeUser.value)}`
  },
  {
    title: 'Body-aware request',
    helper: 'Use this cURL when your rule compares request JSON fields.',
    value: `curl -X POST "${requestBaseUrl.value}" -H "Content-Type: application/json" -d '{"id":1,"role":"admin"}'`
  }
])

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'contrast', label: 'High contrast' }
]

const featureCards = [
  {
    icon: '🧩',
    title: 'User slots',
    text: 'Keep separate mock datasets for each user slot without changing the base request flow.'
  },
  {
    icon: '🧪',
    title: 'Live request tester',
    text: 'Preview any mock endpoint instantly and inspect the response before wiring it into an app.'
  },
  {
    icon: '⚙️',
    title: 'Matching rules',
    text: 'Return different responses for the same route using query, params, or payload-based matching.'
  },
  {
    icon: '💾',
    title: 'Local persistence',
    text: 'Save your mock configuration in the browser so it stays available across refreshes.'
  },
  {
    icon: '🔁',
    title: 'Copy-ready examples',
    text: 'Generate cURL and URL examples for common GET, POST, PUT, PATCH, and DELETE flows.'
  },
  {
    icon: '🎨',
    title: 'Theme switching',
    text: 'Move between light, dark, and high-contrast modes without touching the mock logic.'
  }
]

const advancedCrudExamples = computed(() => [
  {
    title: 'Create a resource',
    helper: 'Use POST to create a new mock record in a typical REST-style collection.',
    value: `curl -X POST "${window.location.origin}/.netlify/functions/mock?path=${encodeURIComponent('/api/users')}&user=${encodeURIComponent(activeUser.value)}" -H "Content-Type: application/json" -d '{"id":1,"name":"Alice","role":"admin"}'`
  },
  {
    title: 'List resources',
    helper: 'Use GET on the collection path to retrieve all stored items for that resource.',
    value: `${window.location.origin}/.netlify/functions/mock?path=${encodeURIComponent('/api/users')}&user=${encodeURIComponent(activeUser.value)}`
  },
  {
    title: 'Read one resource',
    helper: 'Use GET with an item id to fetch one stored object.',
    value: `${window.location.origin}/.netlify/functions/mock?path=${encodeURIComponent('/api/users/1')}&user=${encodeURIComponent(activeUser.value)}`
  },
  {
    title: 'Update a resource',
    helper: 'Use PUT or PATCH to replace or partially update an existing item.',
    value: `curl -X PUT "${window.location.origin}/.netlify/functions/mock?path=${encodeURIComponent('/api/users/1')}&user=${encodeURIComponent(activeUser.value)}" -H "Content-Type: application/json" -d '{"name":"Alice Updated","role":"owner"}'`
  },
  {
    title: 'Delete a resource',
    helper: 'Use DELETE to remove one stored object from the mock data set.',
    value: `curl -X DELETE "${window.location.origin}/.netlify/functions/mock?path=${encodeURIComponent('/api/users/1')}&user=${encodeURIComponent(activeUser.value)}"`
  }
])

const beginnerGuides = computed(() => [
  {
    title: '1. Pick a user slot',
    summary: 'Keep every teammate or environment separated with its own mock data.',
    detail: 'Use the active user slot selector in the side panel. Each slot stores its own saved mocks and advanced mock data records.',
    example: 'user-1'
  },
  {
    title: '2. Save a mock endpoint',
    summary: 'Define the endpoint, method, status, and JSON response you want to return.',
    detail: 'This is the main flow for creating a reusable mock route that you can call from your frontend, Postman, or browser.',
    example: `POST /.netlify/functions/mock
Content-Type: application/json

{
  "mode": "save",
  "path": "/api/users",
  "method": "GET",
  "userId": "user-1",
  "status": 200,
  "body": {
    "users": [{ "id": 1, "name": "Ada Lovelace" }]
  }
}`
  },
  {
    title: '3. Test a live request',
    summary: 'Preview the exact URL and response before wiring it into your app.',
    detail: 'Use the tester panel to add query params and JSON body values, then run the request live and inspect the result.',
    example: `GET /.netlify/functions/mock?path=${encodeURIComponent('/api/users')}&user=${encodeURIComponent(activeUser.value)}&id=1`
  },
  {
    title: '4. Build a standard REST resource',
    summary: 'Create a normal resource-based mock API that follows common industry patterns.',
    detail: 'Use collection paths like /api/users for list/create requests, then append an id such as /api/users/1 for read, update, and delete calls.',
    example: `POST /.netlify/functions/mock?path=${encodeURIComponent('/api/users')}&user=${encodeURIComponent(activeUser.value)}
Content-Type: application/json

{
  "id": 1,
  "name": "Alice",
  "role": "admin"
}

GET /.netlify/functions/mock?path=${encodeURIComponent('/api/users/1')}&user=${encodeURIComponent(activeUser.value)}`
  },
  {
    title: '5. Add matching rules',
    summary: 'Return different responses for the same route when query, params, or body match.',
    detail: 'Rules let you keep one endpoint but vary the response based on request details such as id=1, a path param, or JSON payload keys.',
    example: `[
  {
    "name": "Return admin user by query",
    "match": { "query": { "id": "1" } },
    "response": {
      "status": 200,
      "body": { "id": 1, "role": "admin" }
    }
  }
]`
  }
])

const exampleResponse = `{
  "message": "Hello from Mockapy",
  "success": true
}`

onMounted(() => {
  const storedTheme = localStorage.getItem('mockapy-theme')
  if (storedTheme && themeOptions.some((option) => option.value === storedTheme)) {
    theme.value = storedTheme
  }

  const storedUser = localStorage.getItem('mockapy-active-user')

  if (storedUser && userSlots.includes(storedUser)) {
    activeUser.value = storedUser
  }

  savedMocks.value = loadSavedMocksFromStorage()
})

function setTheme(nextTheme) {
  theme.value = nextTheme
  localStorage.setItem('mockapy-theme', nextTheme)
}

function setActiveUser(event) {
  activeUser.value = event.target.value
  localStorage.setItem('mockapy-active-user', activeUser.value)
}

function useExample() {
  responseBody.value = exampleResponse
  advancedRules.value = `[
  {
    "name": "Handle a custom request",
    "match": {
      "query": { "scenario": "success" }
    },
    "response": {
      "status": 200,
      "body": {
        "message": "Hello from Mockapy",
        "success": true
      }
    }
  }
]`
  notice.value = 'Example response and matching rules loaded. Edit them before saving.'
}

function loadSavedMocksFromStorage() {
  if (typeof localStorage === 'undefined') {
    return []
  }

  try {
    const raw = localStorage.getItem('mockapy-saved-mocks')
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistSavedMocks() {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem('mockapy-saved-mocks', JSON.stringify(savedMocks.value))
}

function upsertSavedMock(savedMock) {
  const existingIndex = savedMocks.value.findIndex(
    (item) => item.userId === savedMock.userId && item.path === savedMock.path && item.method === savedMock.method
  )

  if (existingIndex === -1) {
    savedMocks.value.unshift(savedMock)
  } else {
    savedMocks.value.splice(existingIndex, 1, savedMock)
  }

  persistSavedMocks()
}

function loadSavedMock(entry) {
  endpoint.value = entry.path
  method.value = entry.method
  status.value = entry.status
  headers.value = entry.headers || 'Content-Type: application/json'
  responseBody.value = typeof entry.body === 'string'
    ? entry.body
    : JSON.stringify(entry.body ?? {}, null, 2)
  advancedRules.value = JSON.stringify(entry.rules ?? [], null, 2)
  activeUser.value = entry.userId
  localStorage.setItem('mockapy-active-user', entry.userId)
  notice.value = `Loaded saved mock for ${entry.path}.`
}

function deleteSavedMock(id) {
  savedMocks.value = savedMocks.value.filter((mock) => mock.id !== id)
  persistSavedMocks()
  notice.value = 'Saved mock deleted.'
}

async function saveMock() {
  notice.value = ''

  let body
  try {
    body = JSON.parse(responseBody.value)
  } catch {
    notice.value = 'Response body must be valid JSON.'
    return
  }

  let parsedRules = []
  if (advancedRules.value.trim()) {
    try {
      parsedRules = JSON.parse(advancedRules.value)
      if (!Array.isArray(parsedRules)) {
        throw new Error('Rules must be a JSON array.')
      }
    } catch {
      notice.value = 'Advanced rules must be valid JSON.'
      return
    }
  }

  isSaving.value = true

  const savedMock = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    path: endpoint.value,
    method: method.value,
    status: status.value,
    headers: headers.value,
    body,
    rules: parsedRules,
    userId: activeUser.value,
    updatedAt: new Date().toISOString()
  }

  upsertSavedMock(savedMock)

  try {
    const result = await fetch('/.netlify/functions/mock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'save',
        path: endpoint.value,
        method: method.value,
        status: status.value,
        headers: headers.value,
        body,
        rules: parsedRules,
        userId: activeUser.value
      })
    })

    response.value = await result.json()
    notice.value = result.ok ? 'Mock saved and ready to call.' : 'Could not save this mock.'
  } catch {
    response.value = { ok: true, mode: 'local-preview', data: body, userId: activeUser.value }
    notice.value = 'Preview saved locally. Deploy to activate the Netlify function.'
  } finally {
    isSaving.value = false
  }
}

async function runRequestTest() {
  isTesting.value = true
  testResult.value = null
  notice.value = ''

  try {
    const url = new URL(`${window.location.origin}/.netlify/functions/mock`)
    url.searchParams.set('path', endpoint.value)
    url.searchParams.set('user', activeUser.value)

    if (testQuery.value.trim()) {
      const queryParams = new URLSearchParams(testQuery.value.replace(/^\?/, ''))
      queryParams.forEach((value, key) => {
        url.searchParams.set(key, value)
      })
    }

    const options = {
      method: method.value,
      headers: { 'Content-Type': 'application/json' }
    }

    if (method.value !== 'GET') {
      const trimmedBody = testBody.value.trim()
      options.body = JSON.stringify(trimmedBody ? JSON.parse(trimmedBody) : {})
    }

    const result = await fetch(url, options)
    const body = await result.text()

    testResult.value = {
      status: result.status,
      body: body ? JSON.parse(body) : null
    }

    notice.value = result.ok ? 'Request test completed.' : 'Request returned an error.'
  } catch (error) {
    testResult.value = {
      status: 0,
      error: error.message || 'Request failed.'
    }
    notice.value = 'Request test failed. Check your query/body values.'
  } finally {
    isTesting.value = false
  }
}

async function copy(value, message) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value)
    } else {
      const fallback = document.createElement('textarea')
      fallback.value = value
      fallback.setAttribute('readonly', '')
      fallback.style.position = 'fixed'
      fallback.style.top = '-9999px'
      document.body.appendChild(fallback)
      fallback.select()
      document.execCommand('copy')
      document.body.removeChild(fallback)
    }

    notice.value = message
  } catch {
    notice.value = 'Copy failed. Please copy the example manually.'
  }
}
</script>

<template>
  <main class="shell" :class="theme">
    <header class="topbar">
      <a class="brand" href="/" aria-label="Mockapy home">
        <span class="brand-mark">M</span>
        <span>mockapy</span>
      </a>

      <div class="topbar-meta">
        <div class="theme-switcher" aria-label="Theme switcher">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            type="button"
            class="theme-option"
            :class="{ active: theme === option.value }"
            @click="setTheme(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <span class="status-chip"><span class="status-dot"></span> workspace / personal</span>
        <span class="avatar">MP</span>
      </div>
    </header>

    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">API playground</p>
        <h1>Shape the response<br /><span>before</span> you ship it.</h1>
        <p class="lede">A calm place to design mock endpoints, test request flows, and share a frontend-ready contract with your team.</p>

        <div class="hero-actions">
          <button class="primary-button" type="button" :disabled="isSaving" @click="saveMock">
            {{ isSaving ? 'Saving...' : 'Save mock' }}
          </button>
          <button class="ghost-button" type="button" :disabled="isTesting" @click="runRequestTest">
            {{ isTesting ? 'Testing...' : 'Run live test' }}
          </button>
        </div>
      </div>

      <div class="panel hero-panel">
        <div class="panel-head">
          <span>Quick stats</span>
          <span class="panel-tag">live</span>
        </div>

        <div class="stats-grid">
          <div class="mini-stat">
            <span>slots</span>
            <strong>5</strong>
          </div>
          <div class="mini-stat">
            <span>routes</span>
            <strong>{{ savedMocksForActiveUser.length }}</strong>
          </div>
          <div class="mini-stat">
            <span>status</span>
            <strong>{{ status }}</strong>
          </div>
        </div>

        <div class="code-block">
          <pre>{{ curlCommand }}</pre>
        </div>
      </div>
    </section>

    <section class="feature-section">
      <div class="section-heading">
        <div>
          <span class="kicker">00 / features</span>
          <h2>Included capabilities</h2>
        </div>
      </div>

      <div class="feature-grid">
        <article v-for="feature in featureCards" :key="feature.title" class="feature-card panel">
          <div class="feature-icon">{{ feature.icon }}</div>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.text }}</p>
        </article>
      </div>
    </section>

    <section class="how-to-use">
      <div class="section-heading">
        <div>
          <span class="kicker">01 / how to use</span>
          <h2>Beginner guide</h2>
        </div>
      </div>

      <div class="guide-accordion-list">
        <details v-for="(guide, index) in beginnerGuides" :key="guide.title" class="guide-accordion panel" :open="index === 0">
          <summary>
            <div class="guide-summary-content">
              <span class="guide-index">{{ index + 1 }}</span>
              <div class="guide-text">
                <strong>{{ guide.title }}</strong>
                <small>{{ guide.summary }}</small>
              </div>
            </div>
            <button class="tiny-button" type="button" @click.stop="copy(guide.example, `${guide.title} example copied to clipboard`)">Copy example</button>
          </summary>
          <div class="guide-content">
            <p>{{ guide.detail }}</p>
            <div class="guide-example">
              <code>{{ guide.example }}</code>
            </div>
          </div>
        </details>
      </div>
    </section>

    <section class="workspace">
      <div class="section-heading">
        <div>
          <span class="kicker">01 / endpoint</span>
          <h2>Define your route</h2>
        </div>
        <span class="pill">Unsaved draft</span>
      </div>

      <div class="panel request-panel">
        <div class="request-line">
          <select v-model="method" aria-label="HTTP method">
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
          <input v-model="endpoint" aria-label="Endpoint path" spellcheck="false" />
          <button class="ghost-button" type="button" @click="copy(endpoint, 'Endpoint copied to clipboard')">Copy path</button>
        </div>
      </div>

      <div class="section-heading response-heading">
        <div>
          <span class="kicker">02 / response</span>
          <h2>Make it real</h2>
        </div>
        <span class="helper">JSON is validated before saving</span>
      </div>

      <div class="content-grid">
        <div class="panel editor-panel">
          <div class="panel-label">
            <span>Custom API response <small>Editable JSON</small></span>
            <div>
              <button class="tiny-button" type="button" @click="useExample">Use example</button>
              <button class="tiny-button" type="button" @click="copy(responseBody, 'Response copied to clipboard')">Copy JSON</button>
            </div>
          </div>
          <textarea v-model="responseBody" aria-label="Custom API response JSON" placeholder="Enter the JSON your endpoint should return..." spellcheck="false"></textarea>
        </div>

        <aside class="panel side-panel">
          <label>
            Status code
            <input v-model.number="status" type="number" min="100" max="599" />
          </label>

          <label>
            Headers
            <input v-model="headers" aria-label="Response headers" />
          </label>

          <label>
            Active user slot
            <select :value="activeUser" @change="setActiveUser" aria-label="Active user slot">
              <option v-for="slot in userSlots" :key="slot" :value="slot">{{ slot }}</option>
            </select>
          </label>

          <div class="saved-mocks">
            <div class="panel-label saved-label">
              <span>Saved for this slot <small>local</small></span>
            </div>

            <div v-if="savedMocksForActiveUser.length" class="saved-mock-list">
              <div v-for="savedMock in savedMocksForActiveUser" :key="savedMock.id" class="saved-mock-item">
                <div class="saved-mock-meta">
                  <strong>{{ savedMock.method }}</strong>
                  <span>{{ savedMock.path }}</span>
                </div>
                <div class="saved-mock-actions">
                  <button class="tiny-button" type="button" @click="loadSavedMock(savedMock)">Load</button>
                  <button class="tiny-button danger" type="button" @click="deleteSavedMock(savedMock.id)">Delete</button>
                </div>
              </div>
            </div>

            <p v-else class="empty-state">No saved mocks yet for this slot. Save one and it will stay here on refresh.</p>
          </div>

          <div class="hint">
            <span class="hint-icon">i</span>
            <p>Each user slot keeps its own set of mocks, so up to five people can work on different response contracts at the same time.</p>
          </div>
        </aside>
      </div>

      <div class="section-heading response-heading">
        <div>
          <span class="kicker">03 / advanced</span>
          <h2>Advanced mock features</h2>
        </div>
        <span class="helper">Match by query params, path params, or request payloads</span>
      </div>

      <div class="content-grid">
        <div class="panel editor-panel">
          <div class="panel-label">
            <span>Matching rules <small>JSON</small></span>
            <div>
              <button class="tiny-button" type="button" @click="copy(advancedRules, 'Rules copied to clipboard')">Copy rules</button>
            </div>
          </div>
          <textarea v-model="advancedRules" aria-label="Advanced mock rules JSON" placeholder='[{ "name": "Specific response", "match": { "query": { "id": "1" } }, "response": { "status": 200, "body": { "ok": true } } }]' spellcheck="false"></textarea>
        </div>

        <div class="panel side-panel">
          <div class="hint advanced-hint">
            <span class="hint-icon">i</span>
            <p>Use these rules to return different responses for the same endpoint when the request carries different query params, URL params, or payload data.</p>
          </div>

          <div class="advanced-example">
            <strong>Example rule shape</strong>
            <code>{
  "match": {
    "query": { "id": "1" },
    "params": { "id": "2" }
  },
  "response": {
    "status": 200,
    "body": { "message": "matched" }
  }
}</code>
          </div>
        </div>
      </div>

      <div class="usage-examples">
        <div class="section-heading">
          <div>
            <span class="kicker">04 / copy-ready</span>
            <h2>Copy a ready-to-use request</h2>
          </div>
        </div>

        <div class="usage-sections">
          <div class="usage-group">
            <div class="usage-group-head">
              <h3>Generic mock API features</h3>
              <span class="pill">Standard use</span>
            </div>

            <div class="usage-grid">
              <div v-for="example in standardMockApiExamples" :key="example.title" class="usage-card panel">
                <div class="usage-head">
                  <h3>{{ example.title }}</h3>
                  <button class="tiny-button" type="button" @click="copy(example.value, `${example.title} copied to clipboard`)">Copy</button>
                </div>
                <p>{{ example.helper }}</p>
                <code>{{ example.value }}</code>
              </div>
            </div>
          </div>

          <div class="usage-group">
            <div class="usage-group-head">
              <h3>Advanced CRUD data store</h3>
              <span class="pill">create / read / update / delete</span>
            </div>

            <div class="usage-grid">
              <div v-for="example in advancedCrudExamples" :key="example.title" class="usage-card panel">
                <div class="usage-head">
                  <h3>{{ example.title }}</h3>
                  <button class="tiny-button" type="button" @click="copy(example.value, `${example.title} copied to clipboard`)">Copy</button>
                </div>
                <p>{{ example.helper }}</p>
                <code>{{ example.value }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="action-row">
        <button class="primary-button" type="button" :disabled="isSaving" @click="saveMock">
          {{ isSaving ? 'Saving...' : 'Save mock' }}
        </button>
        <span class="notice" :class="{ error: notice.includes('valid') || notice.includes('Could') }">{{ notice }}</span>
      </div>

      <div v-if="response" class="panel result-panel">
        <div class="result-head">
          <span><span class="success-dot"></span> Function response</span>
          <button class="tiny-button" type="button" @click="copy(JSON.stringify(response, null, 2), 'Result copied to clipboard')">Copy result</button>
        </div>
        <pre>{{ JSON.stringify(response, null, 2) }}</pre>
      </div>

      <div class="share-strip panel">
        <div>
          <span class="kicker">Quick share</span>
          <strong>Hand this contract to your frontend.</strong>
        </div>
        <code>{{ curlCommand }}</code>
        <button class="ghost-button" type="button" @click="copy(curlCommand, 'cURL command copied to clipboard')">Copy cURL</button>
      </div>

      <div class="section-heading response-heading">
        <div>
          <span class="kicker">05 / tester</span>
          <h2>Try the mock live</h2>
        </div>
        <span class="helper">Preview the exact URL and returned response</span>
      </div>

      <div class="content-grid">
        <div class="panel editor-panel tester-panel">
          <div class="panel-label">
            <span>Request tester <small>Live</small></span>
            <div>
              <button class="tiny-button" type="button" :disabled="isTesting" @click="runRequestTest">
                {{ isTesting ? 'Testing...' : 'Run test' }}
              </button>
            </div>
          </div>

          <div class="tester-grid">
            <label>
              Query params
              <input v-model="testQuery" aria-label="Query params for mock tester" placeholder="id=1&scenario=success" spellcheck="false" />
            </label>

            <label>
              Request body
              <textarea v-model="testBody" aria-label="Request body for mock tester" placeholder='{"id": 1, "role": "admin"}' spellcheck="false"></textarea>
            </label>
          </div>
        </div>

        <div class="panel side-panel">
          <div class="hint">
            <span class="hint-icon">i</span>
            <p>Use the URL below to copy the exact request for the current endpoint, selected user slot, and query parameters.</p>
          </div>

          <div class="advanced-example url-example">
            <strong>Copyable mock URL</strong>
            <code>{{ testUrl }}</code>
          </div>

          <button class="ghost-button" type="button" @click="copy(testUrl, 'Mock URL copied to clipboard')">Copy mock URL</button>

          <div v-if="testResult" class="result-panel compact-result">
            <div class="result-head">
              <span><span class="success-dot"></span> Test response</span>
            </div>
            <pre>{{ testResult.error ? testResult.error : JSON.stringify(testResult.body, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </section>

    <footer>
      <span>mockapy / 2026</span>
      <span>Powered by Vue + Netlify + Supabase</span>
    </footer>
  </main>
</template>
