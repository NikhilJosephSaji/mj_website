/**
 * proxy.conf.js
 * Custom Express middleware injected into `ng serve`.
 * Handles all /api/* routes for the admin panel.
 * Saves images directly to src/assets/images/{category}/
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const ASSETS_ROOT    = path.join(__dirname, 'src', 'assets', 'images');
const DATA_FILE      = path.join(ASSETS_ROOT, 'portfolio-data.json');

// ── Category folder map ────────────────────────────────────────────────────
const CATEGORY_FOLDERS = {
  'wedding-films':   'Wedding Films',
  'portraits':       'Portraits',
  'destination':     'Destination',
  'cinematic-reels': 'Cinematic Reels',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { images: [], heroBg: 'assets/images/hero.png' };
  }
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

// ── Multer storage for category images ────────────────────────────────────
const categoryStorage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = CATEGORY_FOLDERS[req.body.category] || 'Uncategorised';
    const dir = path.join(ASSETS_ROOT, folder);
    ensureDir(dir);
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safe = file.originalname.replace(/[^a-z0-9._-]/gi, '_').replace(ext, '');
    cb(null, safe + '_' + Date.now() + ext);
  },
});
const uploadImage = multer({ storage: categoryStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// ── Multer storage for hero background ────────────────────────────────────
const heroStorage = multer.diskStorage({
  destination(_req, _file, cb) { cb(null, ASSETS_ROOT); },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, 'hero' + ext);         // always hero.jpg / hero.png etc.
  },
});
const uploadHero = multer({ storage: heroStorage, limits: { fileSize: 15 * 1024 * 1024 } });

// ── Express middleware factory (called by Angular CLI) ────────────────────
module.exports = function (middlewares, devServer) {
  const app = devServer.app;

  // Parse JSON bodies
  app.use('/api', require('express').json());

  // ── GET /api/images  ──────────────────────────────────────────────────
  app.get('/api/images', (req, res) => {
    const data = readData();
    const { category } = req.query;
    const images = category
      ? data.images.filter(i => i.category === category)
      : data.images;
    res.json({ images });
  });

  // ── POST /api/upload  ─────────────────────────────────────────────────
  app.post('/api/upload', uploadImage.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { category, title, description, location, videoUrl } = req.body;
    const folder  = CATEGORY_FOLDERS[category] || 'Uncategorised';
    const relPath = `assets/images/${folder}/${req.file.filename}`;

    const entry = {
      id:            generateId(),
      filename:      req.file.filename,
      path:          relPath,
      title:         title || req.file.originalname,
      category:      category,
      categoryLabel: folder,
      description:   description || '',
      location:      location || '',
      videoUrl:      videoUrl || null,
      addedAt:       Date.now(),
    };

    const data = readData();
    data.images.push(entry);
    writeData(data);

    res.json({ success: true, image: entry });
  });

  // ── PUT /api/images/:id  ──────────────────────────────────────────────
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

  // ── DELETE /api/images/:id  ───────────────────────────────────────────
  app.delete('/api/images/:id', (req, res) => {
    const data = readData();
    const idx  = data.images.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });

    const img      = data.images[idx];
    const filePath = path.join(__dirname, 'src', img.path.replace('assets/', 'assets/'));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    data.images.splice(idx, 1);
    writeData(data);
    res.json({ success: true });
  });

  // ── POST /api/hero-bg  ────────────────────────────────────────────────
  app.post('/api/hero-bg', uploadHero.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const relPath = `assets/images/${req.file.filename}`;
    const data    = readData();
    data.heroBg   = relPath;
    writeData(data);

    res.json({ success: true, heroBg: relPath });
  });

  // ── GET /api/hero-bg  ─────────────────────────────────────────────────
  app.get('/api/hero-bg', (_req, res) => {
    const data = readData();
    res.json({ heroBg: data.heroBg || 'assets/images/hero.png' });
  });

  return middlewares;
};
