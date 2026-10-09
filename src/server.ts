import express from 'express';
import cors from 'cors';
import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { parseProblemHtml } from './extractor';
import { executeCode, type TestRequest } from './runner';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const ROOT = process.cwd();
const PROBLEMS_DIR = join(ROOT, 'data', 'problems');

if (!existsSync(PROBLEMS_DIR)) {
  mkdirSync(PROBLEMS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(ROOT));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', runtime: 'bun', port: PORT });
});

app.get('/api/problem', async (req, res) => {
  try {
    let id = String(req.query.id || '').trim();
    let url = String(req.query.url || '').trim();

    if (!id && !url) {
      return res.status(400).json({ error: 'Missing problem id or url' });
    }

    if (!id && url) {
      const match = url.match(/\/problems\/([a-zA-Z0-9_-]+)/);
      id = match ? match[1] : 'problem';
    }

    if (!url && id) {
      url = `https://www.fastprep.io/problems/${id}`;
    }

    // 1. Check local cache
    const cachePath = join(PROBLEMS_DIR, `${id}.json`);
    if (existsSync(cachePath)) {
      try {
        const cached = await readFile(cachePath, 'utf-8');
        return res.json(JSON.parse(cached));
      } catch (_) {}
    }

    // 2. Fetch from FastPrep
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `FastPrep returned HTTP ${response.status}` });
    }

    const html = await response.text();
    const parsed = parseProblemHtml(id, html);

    // 3. Cache problem JSON
    await writeFile(cachePath, JSON.stringify(parsed, null, 2), 'utf-8');

    return res.json(parsed);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch problem' });
  }
});

app.post('/api/run', async (req, res) => {
  try {
    const payload = req.body as TestRequest;
    if (!payload || !payload.code) {
      return res.status(400).json({ error: 'Missing code in request body' });
    }

    const result = await executeCode(payload);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Execution failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
