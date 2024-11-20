const express = require('express');
const client = require('./db');
const router = express.Router();

function buildConditions(filters) {
  const conditions = [];
  const params = [];

  if (filters.month) {
    conditions.push(`EXTRACT(MONTH FROM date) = $${conditions.length + 1}`);
    params.push(filters.month);
  }

  if (filters.subjects) {
    conditions.push(`e.id IN (
      SELECT es.episode_id
      FROM episodes_subjects es
      JOIN subjects s ON es.subject_id = s.id
      WHERE s.subject_matter = ANY($${conditions.length + 1})
    )`);
    params.push(filters.subjects);
  }

  if (filters.colors) {
    conditions.push(`e.id IN (
      SELECT ec.episode_id
      FROM episodes_colors ec
      JOIN colors c ON ec.color_id = c.id
      WHERE c.name = ANY($${conditions.length + 1})
    )`);
    params.push(filters.colors);
  }

  return { conditions, params };
}

router.get('/episodes', async (req, res) => {
  try {
    const { month, subjects, colors, mode } = req.query;

    const filters = {
      month: month ? parseInt(month, 10) : null,
      subjects: subjects ? subjects.split(',') : [],
      colors: colors ? colors.split(',') : [],
    };

    const { conditions, params } = buildConditions(filters);
    let sqlQuery = 'SELECT e.* FROM episodes e';

    if (conditions.length > 0) {
      sqlQuery += ` WHERE ${conditions.join(mode === 'or' ? ' OR ' : ' AND ')}`;
    }

    const { rows } = await client.query(sqlQuery, params);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching episodes:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
