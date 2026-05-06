// api/index.js - ✅ Vercel Serverless + MP3 Temporal
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio temporal de Vercel (más confiable que /tmp)
const TEMP_DIR = path.join(tmpdir(), 'ytdlss-audio');
const FILE_TTL = 45 * 1000; // 45 segundos TTL

class CliptoScraper {
  constructor(userIp, userAgent) {
    this.baseUrl = 'https://www.clipto.com';
    this.headers = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      
      // ✅ PROXY DEL USUARIO
      'X-Forwarded-For': userIp,
      'X-Real-IP': userIp,
      'X-Client-IP': userIp,
      'CF-Connecting-IP': userIp,
      'True-Client-IP': userIp
    };
  }

  async getMp3Url(videoUrl) {
    try {
      const response = await fetch(`${this.baseUrl}/api/youtube`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ url: videoUrl })
      });

      const data = await response.json();
      const audioFormat = data.medias?.find(m => m.formatId === 140);
      
      if (!audioFormat) return null;

      return {
        quality: '128kbps',
        url: audioFormat.url,
        title: (data.title || 'audio').replace(/[^\w\s-]/gi, '').substring(0, 40),
        duration: data.duration || 0
      };
    } catch {
      return null;
    }
  }
}

// ✅ Inicializar directorio temporal
async function initTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch {}
}

// ✅ Generar nombre único
function generateFilename(title) {
  const timestamp = Date.now();
  const safeTitle = title.replace(/[^\w\s-]/gi, '').substring(0, 30);
  return `mp3_${safeTitle}_${timestamp}.m4a`;
}

// ✅ Cleanup inteligente
async function cleanupOldFiles() {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtimeMs > FILE_TTL) {
        await fs.unlink(filePath);
      }
    }
  } catch {}
}

// ✅ Descargar y guardar
async function downloadTempFile(url, filename) {
  const response = await fetch(url, { 
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const buffer = await response.arrayBuffer();
  const tempPath = path.join(TEMP_DIR, filename);
  
  await fs.writeFile(tempPath, Buffer.from(buffer));
  return tempPath;
}

export default async function handler(req, res) {
  // ✅ CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // ✅ Inicializar
    await initTempDir();
    await cleanupOldFiles();

    const { url, format } = req.query;
    
    // ✅ Validar parámetros
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: '❌ Requiere ?url=VIDEO_URL&format=mp3',
        usage: 'https://ytdlss-6eu1.vercel.app/api/index?url=YOUTUBE_URL&format=mp3'
      });
    }

    if (format !== 'mp3') {
      return res.status(400).json({ 
        success: false, 
        error: '❌ Solo format=mp3 es soportado'
      });
    }

    // ✅ IP y User-Agent del usuario
    const userIp = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress;
    
    const userAgent = req.headers['user-agent'];

    console.log(`🌐 ${userIp} → ${url.substring(0, 50)}...`);

    // ✅ 1. Obtener URL de Clipto
    const scraper = new CliptoScraper(userIp, userAgent);
    const audioInfo = await scraper.getMp3Url(decodeURIComponent(url));
    
    if (!audioInfo) {
      return res.status(404).json({
        success: false,
        error: '❌ No hay audio disponible para este video'
      });
    }

    // ✅ 2. Descargar temporalmente
    const filename = generateFilename(audioInfo.title);
    const tempPath = await downloadTempFile(audioInfo.url, filename);

    // ✅ 3. URL de descarga directa (Vercel compatible)
    const baseUrl = `https://ytdlss-6eu1.vercel.app`;
    const downloadUrl = `${baseUrl}/api/audio/${filename}?t=${Date.now()}`;

    console.log(`✅ MP3 listo: ${filename} → ${downloadUrl}`);

    res.status(200).json({
      success: true,
      title: audioInfo.title,
      quality: audioInfo.quality,
      duration: audioInfo.duration,
      size: '≈3-5MB',
      downloadUrl, // ✅ Copiar esta URL
      expiresIn: 45,
      apiUrl: `https://ytdlss-6eu1.vercel.app/api/index?url=${encodeURIComponent(url)}&format=mp3`
    });

  } catch (error) {
    console.error('❌', error.message);
    res.status(500).json({
      success: false,
      error: 'Error del servidor',
      message: error.message
    });
  }
}

// ✅ ENDPOINT para descargar MP3 (Vercel routing)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('file');
  const timestamp = searchParams.get('t');
  
  if (!filename || !timestamp) {
    return new Response(JSON.stringify({ error: 'Parámetros inválidos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const tempPath = path.join(TEMP_DIR, decodeURIComponent(filename));
  
  try {
    // ✅ Verificar archivo y expiración
    const stats = await fs.stat(tempPath);
    const age = Date.now() - parseInt(timestamp);
    
    if (age > FILE_TTL) {
      await fs.unlink(tempPath).catch(() => {});
      throw new Error('Expirado');
    }

    // ✅ Leer y servir
    const fileBuffer = await fs.readFile(tempPath);
    
    // ✅ Eliminar inmediatamente
    fs.unlink(tempPath).catch(() => {});

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg', // MP3 compatible
        'Content-Disposition': `attachment; filename="song.mp3"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch {
    return new Response('Archivo no encontrado o expirado', { status: 404 });
  }
}
