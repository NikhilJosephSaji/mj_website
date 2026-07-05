import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express, { Request, Response } from 'express';
import multer from 'multer';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, extname, basename } from 'node:path';
import fs from 'node:fs';
import bootstrap from './src/main.server';

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  const prodAssetsRoot = join(browserDistFolder, 'assets', 'images');
  const srcAssetsRoot  = resolve(serverDistFolder, '../../src/assets/images');
  const ASSETS_ROOT    = fs.existsSync(prodAssetsRoot) ? prodAssetsRoot : srcAssetsRoot;
  const DATA_FILE      = join(ASSETS_ROOT, 'portfolio-data.json');

  const CATEGORY_FOLDERS: Record<string, string> = {
    'wedding-films':   'wedding-films',
    'portraits':       'portraits',
    'destination':     'destination',
    'cinematic-reels': 'cinematic-reels',
  };

  const CATEGORY_LABELS: Record<string, string> = {
    'wedding-films':   'Wedding Films',
    'portraits':       'Portraits',
    'destination':     'Destination',
    'cinematic-reels': 'Cinematic Reels',
  };

  function readData() {
    try   { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
    catch { return { images: [], heroBg: '/api/assets/hero.jpg' }; }
  }

  function writeData(data: any) {
    if (!fs.existsSync(ASSETS_ROOT)) fs.mkdirSync(ASSETS_ROOT, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  }

  function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  function generateId() {
    return 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  ensureDir(ASSETS_ROOT);
  Object.values(CATEGORY_FOLDERS).forEach(f => ensureDir(join(ASSETS_ROOT, f)));

  const categoryStorage = multer.diskStorage({
    destination(req, file, cb) {
      const category = req.body.category || (req.query['category'] as string) || '';
      const folder   = CATEGORY_FOLDERS[category] || 'uncategorised';
      const dir      = join(ASSETS_ROOT, folder);
      ensureDir(dir);
      cb(null, dir);
    },
    filename(_req, file, cb) {
      const ext  = extname(file.originalname).toLowerCase() || '.jpg';
      const base = basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_').slice(0, 40);
      cb(null, base + '_' + Date.now() + ext);
    },
  });
  const uploadImage = multer({ storage: categoryStorage, limits: { fileSize: 10 * 1024 * 1024 } });

  const heroStorage = multer.diskStorage({
    destination(_req, _file, cb) { cb(null, ASSETS_ROOT); },
    filename(_req, file, cb) {
      const ext = extname(file.originalname).toLowerCase() || '.jpg';
      ['hero.png','hero.jpg','hero.jpeg','hero.webp'].forEach(f => {
        const p = join(ASSETS_ROOT, f);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
      cb(null, 'hero' + ext);
    },
  });
  const uploadHero = multer({ storage: heroStorage, limits: { fileSize: 15 * 1024 * 1024 } });

  server.use(cors());
  server.use(express.json());

  // Serve image assets dynamically directly from disk
  server.use('/api/assets', express.static(ASSETS_ROOT));

  server.get('/api/images', (req: Request, res: Response): void => {
    const data = readData();
    const category = req.query['category'] as string;
    const images = category
      ? data.images.filter((i: any) => i.category === category)
      : data.images;
    res.json({ images });
  });

  server.post('/api/upload', uploadImage.single('image'), (req: Request, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const { category, title, description, location, videoUrl } = req.body;
    const targetFolder = CATEGORY_FOLDERS[category] || 'uncategorised';
    const targetDir    = join(ASSETS_ROOT, targetFolder);
    ensureDir(targetDir);

    let finalFilename = req.file.filename;

    if (dirname(req.file.path) !== targetDir) {
      const newPath = join(targetDir, req.file.filename);
      try {
        fs.renameSync(req.file.path, newPath);
      } catch (e) {
        console.error('Error moving file:', e);
      }
    }

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
    res.json({ success: true, image: entry });
  });

  server.put('/api/images/:id', (req: Request, res: Response): void => {
    const data = readData();
    const targetId = req.params['id'];
    const idx  = data.images.findIndex((i: any) => i.id === targetId);
    if (idx === -1) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const { title, description, location, videoUrl } = req.body;
    if (title       !== undefined) data.images[idx].title       = title;
    if (description !== undefined) data.images[idx].description = description;
    if (location    !== undefined) data.images[idx].location    = location;
    if (videoUrl    !== undefined) data.images[idx].videoUrl    = videoUrl || null;

    writeData(data);
    res.json({ success: true, image: data.images[idx] });
  });

  server.delete('/api/images/:id', (req: Request, res: Response): void => {
    const data = readData();
    const targetId = req.params['id'];
    const idx  = data.images.findIndex((i: any) => i.id === targetId);
    if (idx === -1) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const img = data.images[idx];
    const subPath  = img.path.replace(/^\/api\/assets\//, '');
    const filePath = join(ASSETS_ROOT, subPath);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    data.images.splice(idx, 1);
    writeData(data);
    res.json({ success: true });
  });

  server.post('/api/hero-bg', uploadHero.single('image'), (req: Request, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const relPath = `/api/assets/${req.file.filename}`;
    const data    = readData();
    data.heroBg   = relPath;
    writeData(data);
    res.json({ success: true, heroBg: relPath });
  });

  server.get('/api/hero-bg', (_req: Request, res: Response): void => {
    const data = readData();
    res.json({ heroBg: data.heroBg || '/api/assets/hero.jpg' });
  });

  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
