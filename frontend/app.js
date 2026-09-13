const API_BASE = '/api/notes';
 
const form = document.getElementById('note-form');
const titleInput = document.getElementById('title');
const bodyInput = document.getElementById('body');
const imageInput = document.getElementById('image');
const formError = document.getElementById('form-error');
const notesList = document.getElementById('notes-list');
const archiveCount = document.getElementById('archive-count');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
 
async function checkStatus() {
  try {
    const res = await fetch('/health');
    if (!res.ok) throw new Error();
    statusDot.className = 'status-dot online';
    statusText.textContent = 'Connected';
  } catch {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Disconnected';
  }
}
 
async function fetchNotes() {
  notesList.innerHTML = '<p class="system-message">Loading notes&hellip;</p>';
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('Failed to load notes');
    const notes = await res.json();
    renderNotes(notes);
  } catch (err) {
    notesList.innerHTML = `<p class="system-message">Could not load notes: ${escapeHtml(err.message)}</p>`;
  }
}
 
function renderNotes(notes) {
  archiveCount.textContent = notes.length;
 
  if (notes.length === 0) {
    notesList.innerHTML = '<p class="system-message">No notes yet. Use the form to add the first one.</p>';
    return;
  }
 
  notesList.innerHTML = notes
    .map(
      (note) => `
    <article class="note-card" data-id="${note.id}">
      ${note.image_url ? `<img src="${note.image_url}" alt="${escapeHtml(note.title)}" />` : ''}
      <h3>${escapeHtml(note.title)}</h3>
      ${note.body ? `<p>${escapeHtml(note.body)}</p>` : ''}
      <div class="note-meta">
        <span>${formatTimestamp(note.created_at)}</span>
        <button class="delete-btn" onclick="deleteNote(${note.id})">Delete</button>
      </div>
    </article>
  `
    )
    .join('');
}
 
function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}
 
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
 
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';
 
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving\u2026';
 
  try {
    const formData = new FormData();
    formData.append('title', titleInput.value);
    formData.append('body', bodyInput.value);
    if (imageInput.files[0]) {
      formData.append('image', imageInput.files[0]);
    }
 
    const res = await fetch(API_BASE, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create note');
    }
 
    form.reset();
    await fetchNotes();
  } catch (err) {
    formError.textContent = err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add note';
  }
});
 
async function deleteNote(id) {
  if (!confirm('Delete this note? This cannot be undone.')) return;
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete note');
    await fetchNotes();
  } catch (err) {
    alert(err.message);
  }
}
 
checkStatus();
fetchNotes();
 