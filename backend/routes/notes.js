const express = require('express');
const router = express.Router();
const db = require('../db');
const { upload, deleteObject, publicUrlFor } = require('../s3');

// GET /api/notes - list all notes, newest first
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, title, body, image_key, created_at FROM notes ORDER BY created_at DESC'
    );
    const notes = result.rows.map((n) => ({
      ...n,
      image_url: publicUrlFor(n.image_key),
    }));
    res.json(notes);
  } catch (err) {
    console.error('[notes] Failed to list notes', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/notes - create a note, optionally with an image attachment
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const imageKey = req.file ? req.file.key : null;

    const result = await db.query(
      `INSERT INTO notes (title, body, image_key, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, title, body, image_key, created_at`,
      [title.trim(), body || '', imageKey]
    );

    const note = result.rows[0];
    res.status(201).json({ ...note, image_url: publicUrlFor(note.image_key) });
  } catch (err) {
    console.error('[notes] Failed to create note', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// DELETE /api/notes/:id - delete a note and its image (if any)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT image_key FROM notes WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await db.query('DELETE FROM notes WHERE id = $1', [id]);

    const imageKey = existing.rows[0].image_key;
    if (imageKey) {
      await deleteObject(imageKey);
    }

    console.log(`[notes] Deleted note ${id}`);
    res.status(204).send();
  } catch (err) {
    console.error('[notes] Failed to delete note', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
