const API_BASE = '/api/notes';

const form = document.getElementById('note-form');
const titleInput = document.getElementById('title');
const bodyInput = document.getElementById('body');
const imageInput = document.getElementById('image');
const formError = document.getElementById('form-error');
const notesList = document.getElementById('notes-list');

async function fetchNotes() {
  notesList.innerHTML = '<p class="loading">Loading notes...</p>';
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('Failed to load notes');
    const notes = await res.json();
    renderNotes(notes);
  } catch (err) {
    notesList.innerHTML = `<p class="error">Could not load notes: ${err.message}</p>`;
  }
}

function renderNotes(notes) {
  if (notes.length === 0) {
    notesList.innerHTML = '<p class="empty">No notes yet. Add one above!</p>';
    return;
  }

  notesList.innerHTML = notes
    .map(
      (note) => `
    <div class="note-card" data-id="${note.id}">
      ${note.image_url ? `<img src="${note.image_url}" alt="${escapeHtml(note.title)}" />` : ''}
      <h3>${escapeHtml(note.title)}</h3>
      ${note.body ? `<p>${escapeHtml(note.body)}</p>` : ''}
      <div class="note-meta">
        <span>${new Date(note.created_at).toLocaleString()}</span>
        <button class="delete-btn" onclick="deleteNote(${note.id})">Delete</button>
      </div>
    </div>
  `
    )
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

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
  }
});

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete note');
    await fetchNotes();
  } catch (err) {
    alert(err.message);
  }
}

fetchNotes();
