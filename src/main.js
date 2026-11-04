import "./style.css"
import { api } from "./api/http.js"

const postsEl = document.querySelector("#posts")
const listStatus = document.querySelector("#list-status")
const filter = document.querySelector("#user-filter")
const form = document.querySelector("#post-form")
const statusEl = document.querySelector("#form-status")

let posts = []

function escapeHTML(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

function render() {
  if (posts.length === 0) {
    postsEl.innerHTML = ""
    listStatus.textContent = "No posts found."
    return
  }
  listStatus.textContent = ""
  postsEl.innerHTML = posts.map((p) => `
    <article class="rounded bg-white p-4 shadow" data-id="${p.id}">
      <h2 class="font-semibold text-lg">${escapeHTML(p.title)}</h2>
      <p class="mt-1 text-gray-600">${escapeHTML(p.body ?? "")}</p>
      <div class="mt-3 flex gap-2">
        <button data-action="edit" class="rounded bg-amber-500 px-3 py-1 text-white">Edit</button>
        <button data-action="delete" class="rounded bg-red-600 px-3 py-1 text-white">Delete</button>
      </div>
    </article>`).join("")
}

async function loadPosts(userId = "") {
  listStatus.textContent = "Loading…"
  postsEl.innerHTML = ""
  try {
    let data
    if (userId) {
      data = await api.get(`/posts/user/${userId}`)       
    } else {
      const params = new URLSearchParams({ limit: 10 })    
      data = await api.get(`/posts?${params}`)
    }
    posts = data.posts                                     
    render()
  } catch (err) {
    listStatus.textContent = err.name === "TimeoutError"
      ? "The request took too long. Try again."
      : `Could not load posts: ${err.message}`
  }
}

// Filter by user
for (let i = 1; i <= 10; i++) {
  filter.insertAdjacentHTML("beforeend", `<option value="${i}">User ${i}</option>`)
}
filter.addEventListener("change", () => loadPosts(filter.value))

// Create (POST)
form.addEventListener("submit", async (e) => {
  e.preventDefault()
  const button = form.querySelector("button")
  const data = Object.fromEntries(new FormData(form))

  button.disabled = true
  statusEl.textContent = "Publishing…"
  try {
    const created = await api.post("/posts/add", { ...data, userId: 1 })
    posts.unshift({ ...data, userId: 1, ...created })      
    render()
    statusEl.textContent = `Published! New id: ${created.id}`
    form.reset()
  } catch (err) {
    statusEl.textContent = `Could not publish: ${err.message}`
  } finally {
    button.disabled = false
  }
})

postsEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]")
  if (!btn) return
  const id = Number(btn.closest("article").dataset.id)
  const post = posts.find((p) => p.id === id)

  if (btn.dataset.action === "edit") {
    const newTitle = prompt("New title:", post.title)
    if (!newTitle || newTitle === post.title) return
    try {
      const updated = await api.patch(`/posts/${id}`, { title: newTitle })
      post.title = updated.title
      render()
    } catch (err) {
      alert(`Could not update: ${err.message}`)
    }
  }

  if (btn.dataset.action === "delete") {
    if (!confirm("Delete this post?")) return
    try {
      await api.del(`/posts/${id}`)
      posts = posts.filter((p) => p.id !== id)
      render()
    } catch (err) {
      alert(`Could not delete: ${err.message}`)
    }
  }
})

loadPosts()