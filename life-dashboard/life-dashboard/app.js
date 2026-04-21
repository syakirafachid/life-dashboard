// ── SUPABASE CLIENT ──────────────────────────────────────────
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── QUOTES ───────────────────────────────────────────────────
const quotes = [
  { text: "The secret of getting ahead is getting started.", author: "— Mark Twain" },
  { text: "Do something today that your future self will thank you for.", author: "— Unknown" },
  { text: "Small steps every day lead to big changes over time.", author: "— Unknown" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "— Zig Ziglar" },
  { text: "Focus on progress, not perfection.", author: "— Unknown" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "— Abraham Lincoln" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "— Chinese Proverb" },
  { text: "Consistency is more important than perfection.", author: "— Unknown" },
  { text: "You are the architect of your own life.", author: "— Unknown" },
  { text: "Done is better than perfect.", author: "— Sheryl Sandberg" },
]

let quoteIdx = Math.floor(Math.random() * quotes.length)

function newQuote() {
  quoteIdx = (quoteIdx + 1) % quotes.length
  document.getElementById('quote-text').textContent   = quotes[quoteIdx].text
  document.getElementById('quote-author').textContent = quotes[quoteIdx].author
}

// ── CLOCK ─────────────────────────────────────────────────────
function updateClock() {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  document.getElementById('clock').textContent = `${h}:${m}:${s}`

  const days   = ['SUN','MON','TUE','WED','THU','FRI','SAT']
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  document.getElementById('datestr').textContent =
    `${days[now.getDay()]}  ${String(now.getDate()).padStart(2,'0')} ${months[now.getMonth()]} ${now.getFullYear()}`
}

// ── TOAST NOTIFICATION ────────────────────────────────────────
function showToast(msg) {
  let t = document.querySelector('.toast')
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t) }
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(t._timer)
  t._timer = setTimeout(() => t.classList.remove('show'), 2000)
}

// ── HELPERS ───────────────────────────────────────────────────
function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function setDbStatus(ok) {
  const el = document.getElementById('db-status')
  el.textContent = ok ? 'SYSTEM ONLINE / DB CONNECTED' : 'DB ERROR — CHECK CONFIG'
  el.style.color  = ok ? '' : '#ff4455'
}

// ── TODOS ─────────────────────────────────────────────────────
let todos = []

async function loadTodos() {
  const { data, error } = await db
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { console.error(error); setDbStatus(false); return }
  setDbStatus(true)
  todos = data
  renderTodos()
}

async function addTodo() {
  const inp = document.getElementById('todo-input')
  const val = inp.value.trim()
  if (!val) return

  const { data, error } = await db
    .from('todos')
    .insert([{ text: val, done: false }])
    .select()

  if (error) { showToast('ERROR: ' + error.message); return }
  inp.value = ''
  todos.unshift(data[0])
  renderTodos()
  showToast('[ TASK ADDED ]')
}

async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id)
  if (!todo) return

  const { error } = await db
    .from('todos')
    .update({ done: !todo.done })
    .eq('id', id)

  if (error) { showToast('ERROR: ' + error.message); return }
  todo.done = !todo.done
  renderTodos()
}

async function deleteTodo(id) {
  const { error } = await db
    .from('todos')
    .delete()
    .eq('id', id)

  if (error) { showToast('ERROR: ' + error.message); return }
  todos = todos.filter(t => t.id !== id)
  renderTodos()
  showToast('[ TASK DELETED ]')
}

async function clearDoneTodos() {
  const doneIds = todos.filter(t => t.done).map(t => t.id)
  if (!doneIds.length) return

  const { error } = await db
    .from('todos')
    .delete()
    .in('id', doneIds)

  if (error) { showToast('ERROR: ' + error.message); return }
  todos = todos.filter(t => !t.done)
  renderTodos()
  showToast('[ DONE TASKS CLEARED ]')
}

function renderTodos() {
  const list = document.getElementById('todo-list')

  if (todos.length === 0) {
    list.innerHTML = '<div class="empty-state">[ NO TASKS — ADD ONE ABOVE ]</div>'
  } else {
    list.innerHTML = todos.map(t => `
      <div class="todo-item">
        <div class="todo-check ${t.done ? 'done' : ''}" onclick="toggleTodo('${t.id}')">${t.done ? '✓' : ''}</div>
        <div class="todo-text ${t.done ? 'done' : ''}">${esc(t.text)}</div>
        <div class="todo-del" onclick="deleteTodo('${t.id}')" title="remove">×</div>
      </div>
    `).join('')
  }

  const done = todos.filter(t => t.done).length
  const pct  = todos.length ? Math.round(done / todos.length * 100) : 0
  document.getElementById('tasks-done').textContent     = done
  document.getElementById('task-progress').style.width  = pct + '%'
  document.getElementById('task-pct-label').textContent = pct + '%'
  updateStats()
}

// ── HABITS ────────────────────────────────────────────────────
const DEFAULT_HABITS = [
  { icon: '💧', name: 'Drink Water' },
  { icon: '🏋️', name: 'Workout' },
  { icon: '📖', name: 'Read' },
  { icon: '🧘', name: 'Meditate' },
  { icon: '🌙', name: 'Sleep 8hr' },
  { icon: '🥗', name: 'Eat Clean' },
]

let habits = []

async function loadHabits() {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await db
    .from('habits')
    .select('*')
    .eq('date', today)

  if (error) { console.error(error); return }

  // If no habits for today yet, seed them
  if (data.length === 0) {
    const rows = DEFAULT_HABITS.map(h => ({ name: h.name, icon: h.icon, done: false, date: today }))
    const { data: inserted, error: insertError } = await db
      .from('habits')
      .insert(rows)
      .select()
    if (insertError) { console.error(insertError); return }
    habits = inserted

    // Check yesterday to calculate streak
    await updateStreak()
  } else {
    habits = data
  }

  renderHabits()
}

async function toggleHabit(id) {
  const habit = habits.find(h => h.id === id)
  if (!habit) return

  const { error } = await db
    .from('habits')
    .update({ done: !habit.done })
    .eq('id', id)

  if (error) { showToast('ERROR: ' + error.message); return }
  habit.done = !habit.done
  renderHabits()

  // Check if all done to update streak
  if (habits.every(h => h.done)) {
    await updateStreak(true)
    showToast('[ ALL HABITS DONE! 🔥 ]')
  }
}

async function updateStreak(allDoneToday = false) {
  const today     = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const { data: streakData } = await db
    .from('streaks')
    .select('*')
    .eq('id', 1)
    .single()

  let streak = streakData?.count || 0

  if (allDoneToday) {
    // Only increment if we haven't already counted today
    if (streakData?.last_date !== today) {
      streak = streakData?.last_date === yesterday ? streak + 1 : 1
      await db.from('streaks').upsert({ id: 1, count: streak, last_date: today })
    }
  } else if (streakData?.last_date !== today && streakData?.last_date !== yesterday) {
    // Streak broken
    streak = 0
    await db.from('streaks').upsert({ id: 1, count: 0, last_date: today })
  }

  document.getElementById('streak-val').textContent     = streak
  document.getElementById('streak-display').textContent = streak + ' day' + (streak !== 1 ? 's' : '')
}

function renderHabits() {
  const grid = document.getElementById('habit-grid')
  grid.innerHTML = habits.map(h => `
    <div class="habit-item ${h.done ? 'active' : ''}" onclick="toggleHabit('${h.id}')">
      <div class="habit-icon">${h.icon}</div>
      <div class="habit-name">${h.name}</div>
      <div class="habit-status">${h.done ? '[ DONE ]' : '[ pending ]'}</div>
    </div>
  `).join('')

  const done = habits.filter(h => h.done).length
  const pct  = Math.round(done / habits.length * 100)
  document.getElementById('habits-done').textContent     = done
  document.getElementById('habit-progress').style.width  = pct + '%'
  document.getElementById('habit-pct-label').textContent = pct + '%'
  updateStats()
}

function updateStats() {
  // streak is handled by updateStreak()
}

// ── INIT ──────────────────────────────────────────────────────
newQuote()
updateClock()
setInterval(updateClock, 1000)
loadTodos()
loadHabits()
