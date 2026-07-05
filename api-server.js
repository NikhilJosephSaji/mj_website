/**
 * api-server.js
 * Standalone Express + Multer server on port 3001.
 * Handles all /api/* routes for the admin panel.
 * Serves uploaded images dynamically at /api/assets/* from disk.
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const cors    = require('cors');

const app  = express();
const PORT = 3001;

// ── Paths ──────────────────────────────────────────────────────────────────
const ASSETS_ROOT = path.join(__dirname, 'src', 'assets', 'images');
const DATA_FILE   = path.join(ASSETS_ROOT, 'portfolio-data.json');

// ── Clean category folder map (no spaces in web URLs) ──────────────────────
const CATEGORY_FOLDERS = {
  'wedding-films':   'wedding-films',
  'portraits':       'portraits',
  'destination':     'destination',
  'cinematic-reels': 'cinematic-reels',
};

const CATEGORY_LABELS = {
  'wedding-films':   'Wedding Films',
  'portraits':       'Portraits',
  'destination':     'Destination',
  'cinematic-reels': 'Cinematic Reels',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function readData() {
  try   { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { images: [], heroBg: '/api/assets/hero.jpg' }; }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function generateId() {
  return 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ── Ensure asset folders exist ────────────────────────────────────────────
ensureDir(ASSETS_ROOT);
Object.values(CATEGORY_FOLDERS).forEach(f => ensureDir(path.join(ASSETS_ROOT, f)));

// ── Multer — category images ──────────────────────────────────────────────
const categoryStorage = multer.diskStorage({
  destination(req, _file, cb) {
    const cat    = req.body.category || req.query.category;
    const folder = CATEGORY_FOLDERS[cat] || 'uncategorised';
    const dir    = path.join(ASSETS_ROOT, folder);
    ensureDir(dir);
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
    const base = path.basename(file.originalname, ext)
                     .replace(/[^a-z0-9_-]/gi, '_')
                     .slice(0, 40);
    cb(null, base + '_' + Date.now() + ext);
  },
});
const uploadImage = multer({
  storage: categoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

// ── Multer — hero background ──────────────────────────────────────────────
const heroStorage = multer.diskStorage({
  destination(_req, _file, cb) { cb(null, ASSETS_ROOT); },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    ['hero.png','hero.jpg','hero.jpeg','hero.webp'].forEach(f => {
      const p = path.join(ASSETS_ROOT, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
    cb(null, 'hero' + ext);
  },
});
const uploadHero = multer({
  storage: heroStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve images dynamically directly from disk — instantly available to frontend
app.use('/api/assets', express.static(ASSETS_ROOT));

// ── Routes ────────────────────────────────────────────────────────────────

// GET /api/images?category=wedding-films
app.get('/api/images', (req, res) => {
  const data     = readData();
  const { category } = req.query;
  const images   = category
    ? data.images.filter(i => i.category === category)
    : data.images;
  res.json({ images });
});

// POST /api/upload
app.post('/api/upload', uploadImage.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { category, title, description, location, videoUrl } = req.body;
  const targetFolder = CATEGORY_FOLDERS[category] || 'uncategorised';
  const targetDir    = path.join(ASSETS_ROOT, targetFolder);
  ensureDir(targetDir);

  let finalFilename = req.file.filename;

  // Move file if saved to wrong folder
  if (path.dirname(req.file.path) !== targetDir) {
    const newPath = path.join(targetDir, req.file.filename);
    try {
      fs.renameSync(req.file.path, newPath);
    } catch (e) {
      console.error('Error moving file:', e);
    }
  }

  // Dynamic API asset URL served directly from disk by Express
  const relPath = `/api/assets/${targetFolder}/${finalFilename}`;

  const entry = {
    id:            generateId(),
    filename:      finalFilename,
    path:          relPath,
    title:         (title || req.file.originalname).trim(),
    category,
    categoryLabel: CATEGORY_LABELS[category] || targetFolder,
    description:   (description || '').trim(),
    location:      (location || 'India').trim(),
    videoUrl:      videoUrl || null,
    addedAt:       Date.now(),
  };

  const data = readData();
  data.images.push(entry);
  writeData(data);

  console.log(`✅  Saved & Served: ${relPath}`);
  res.json({ success: true, image: entry });
});

// PUT /api/images/:id
app.put('/api/images/:id', (req, res) => {
  const data = readData();
  const idx  = data.images.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { title, description, location, videoUrl } = req.body;
  if (title       !== undefined) data.images[idx].title       = title;
  if (description !== undefined) data.images[idx].description = description;
  if (location    !== undefined) data.images[idx].location    = location;
  if (videoUrl    !== undefined) data.images[idx].videoUrl    = videoUrl || null;

  writeData(data);
  res.json({ success: true, image: data.images[idx] });
});

// DELETE /api/images/:id
app.delete('/api/images/:id', (req, res) => {
  const data = readData();
  const idx  = data.images.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const img      = data.images[idx];
  // Convert /api/assets/folder/file -> src/assets/images/folder/file
  const subPath  = img.path.replace(/^\/api\/assets\//, '');
  const filePath = path.join(ASSETS_ROOT, subPath);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`🗑️  Deleted: ${filePath}`);
  }

  data.images.splice(idx, 1);
  writeData(data);
  res.json({ success: true });
});

// ── Multer — about photo ──────────────────────────────────────────────
const aboutStorage = multer.diskStorage({
  destination(_req, _file, cb) { cb(null, ASSETS_ROOT); },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    ['midhun.png','midhun.jpg','midhun.jpeg','midhun.webp'].forEach(f => {
      const p = path.join(ASSETS_ROOT, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
    cb(null, 'midhun' + ext);
  },
});
const uploadAbout = multer({
  storage: aboutStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

// POST /api/hero-bg
app.post('/api/hero-bg', uploadHero.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const relPath = `/api/assets/${req.file.filename}`;
  const data    = readData();
  data.heroBg   = relPath;
  writeData(data);

  console.log(`🏠  Hero background updated: ${relPath}`);
  res.json({ success: true, heroBg: relPath });
});

// GET /api/hero-bg
app.get('/api/hero-bg', (_req, res) => {
  const data = readData();
  res.json({ heroBg: data.heroBg || '/api/assets/hero.jpg' });
});

// POST /api/about-photo
app.post('/api/about-photo', uploadAbout.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const relPath = `/api/assets/${req.file.filename}`;
  const data    = readData();
  data.aboutPhoto = relPath;
  writeData(data);

  console.log(`📸  About photo updated: ${relPath}`);
  res.json({ success: true, aboutPhoto: relPath });
});

// GET /api/about-photo
app.get('/api/about-photo', (_req, res) => {
  const data = readData();
  res.json({ aboutPhoto: data.aboutPhoto || '/api/assets/midhun.jpg' });
});

// DELETE /api/about-photo
app.delete('/api/about-photo', (_req, res) => {
  const data = readData();
  data.aboutPhoto = null;
  ['midhun.png','midhun.jpg','midhun.jpeg','midhun.webp'].forEach(f => {
    const p = path.join(ASSETS_ROOT, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });
  writeData(data);
  res.json({ success: true });
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Films by MJ — API Server`);
  console.log(`   Listening on http://localhost:${PORT}`);
  console.log(`   Serving images live at: http://localhost:${PORT}/api/assets/\n`);
});
