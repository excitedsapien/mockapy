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
const isDark = ref(false)
const activeUser = ref('user-1')
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

const curlCommand = computed(() => {
  const url = new URL(`${window.location.origin}/.netlify/functions/mock`)
  url.searchParams.set('path', endpoint.value)
  url.searchParams.set('user', activeUser.value)
  if (method.value !== 'GET') {
    url.searchParams.set('method', method.value)
  }

  return `curl -X ${method.value} "${url.toString()}"`
})

const exampleResponse = `{
  "message": "Hello from Mockapy",
  "success": true
}`

onMounted(() => {
  isDark.value = localStorage.getItem('mockapy-theme') === 'dark'
  const storedUser = localStorage.getItem('mockapy-active-user')

  if (storedUser && userSlots.includes(storedUser)) {
    activeUser.value = storedUser
  }
})

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('mockapy-theme', isDark.value ? 'dark' : 'light')
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

async function copy(value, message) {
  await navigator.clipboard.writeText(value)
  notice.value = message
}
</script>

<template>
  <main class="shell" :class="{ dark: isDark }">
    <header class="topbar"><a class="brand" href="/" aria-label="Mockapy home"><span class="brand-mark">M</span><span>mockapy</span></a><div class="topbar-meta"><span class="status-dot"></span> workspace / personal <button class="theme-toggle" type="button" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme"><span aria-hidden="true">{{ isDark ? 'sun' : 'moon' }}</span></button><span class="avatar">MP</span></div></header>
    <section class="intro"><div><p class="eyebrow">API playground</p><h1>Shape the response<br /><em>before</em> you ship it.</h1><p class="lede">A tiny, calm place to design mock endpoints and share a contract with your team.</p></div><div class="intro-note"><span>01</span><p>Draft an endpoint<br />in a few seconds.</p></div></section>
    <section class="workspace">
      <div class="section-heading"><div><span class="kicker">01 / endpoint</span><h2>Define your route</h2></div><span class="pill">Unsaved draft</span></div>
      <div class="request-line"><select v-model="method" aria-label="HTTP method"><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select><input v-model="endpoint" aria-label="Endpoint path" spellcheck="false" /><button class="ghost-button" type="button" @click="copy(endpoint, 'Endpoint copied to clipboard')">Copy path</button></div>
      <div class="section-heading response-heading"><div><span class="kicker">02 / response</span><h2>Make it real</h2></div><span class="helper">JSON is validated before saving</span></div>
      <div class="editor-grid"><div class="editor-panel"><div class="panel-label"><span>Custom API response <small>Editable JSON</small></span><div><button class="tiny-button" type="button" @click="useExample">Use example</button><button class="tiny-button" type="button" @click="copy(responseBody, 'Response copied to clipboard')">Copy JSON</button></div></div><textarea v-model="responseBody" aria-label="Custom API response JSON" placeholder="Enter the JSON your endpoint should return..." spellcheck="false"></textarea></div><div class="settings-panel"><label>Status code <input v-model.number="status" type="number" min="100" max="599" /></label><label>Headers <input v-model="headers" aria-label="Response headers" /></label><label>Active user slot
          <select :value="activeUser" @change="setActiveUser" aria-label="Active user slot">
            <option v-for="slot in userSlots" :key="slot" :value="slot">{{ slot }}</option>
          </select>
        </label><div class="hint"><span class="hint-icon">i</span><p>Each user slot keeps its own set of mocks. This lets up to five people work on different mock responses at the same time.</p></div></div></div>
      <div class="section-heading response-heading"><div><span class="kicker">03 / advanced</span><h2>Advanced mock features</h2></div><span class="helper">Match by query params, path params, or rule-specific payloads</span></div>
      <div class="editor-grid">
        <div class="editor-panel">
          <div class="panel-label"><span>Matching rules <small>JSON</small></span><div><button class="tiny-button" type="button" @click="copy(advancedRules, 'Rules copied to clipboard')">Copy rules</button></div></div>
          <textarea v-model="advancedRules" aria-label="Advanced mock rules JSON" placeholder='[{ "name": "Specific response", "match": { "query": { "id": "1" } }, "response": { "status": 200, "body": { "ok": true } } }]' spellcheck="false"></textarea>
        </div>
        <div class="settings-panel">
          <div class="hint advanced-hint"><span class="hint-icon">i</span><p>Use the rules below to return a different response whenever a request matches the same endpoint but carries different query params, URL params, or request data.</p></div>
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
      <div class="action-row"><button class="primary-button" type="button" :disabled="isSaving" @click="saveMock">{{ isSaving ? 'Saving...' : 'Save mock' }} <span>→</span></button><span class="notice" :class="{ error: notice.includes('valid') || notice.includes('Could') }">{{ notice }}</span></div>
      <div v-if="response" class="result-panel"><div class="result-head"><span><span class="success-dot"></span> Function response</span><button class="tiny-button" type="button" @click="copy(JSON.stringify(response, null, 2), 'Result copied to clipboard')">Copy result</button></div><pre>{{ JSON.stringify(response, null, 2) }}</pre></div>
      <div class="share-strip"><div><span class="kicker">Quick share</span><strong>Hand this contract to your frontend.</strong></div><code>{{ curlCommand }}</code><button class="ghost-button" type="button" @click="copy(curlCommand, 'cURL command copied to clipboard')">Copy cURL</button></div>
    </section>
    <footer><span>mockapy / 2026</span><span>Powered by Vue + Netlify + Supabase</span></footer>
  </main>
</template>
