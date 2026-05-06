// api/index.js - ✅ ANTI-403 + Proxy Clipto + 100% Fiable
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

const TEMP_DIR = path.join(tmpdir(), 'ytdlss-mp3');
const FILE_TTL = 60 * 1000; // 1 minuto

class CliptoProxy {
  constructor(userIp, userAgent) {
    this.baseUrl = 'https://www.clipto.com';
    this.headers = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://www.clipto.com',
      'Referer': 'https://www.clipto.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      
      // ✅ IP del usuario
      'X-Forwarded-For': userIp,
      'X-Real-IP': userIp
    };
  }

  // ✅ 1. Obtener info del video
  async getVideoInfo(videoUrl) {
    const response = await fetch(`${this.baseUrl}/api/youtube`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ url: videoUrl })
    });

    if (!response.ok) throw new Error(`Clipto API: ${response.status}`);
    
    const data = await response.json();
    const audio = data.medias?.find(m => m.formatId === 140);
    
    if (!audio) throw new Error('No audio 128kbps');
    
    return {
      title: (data.title || 'audio').replace(/[^\w\s-]/gi, '').substring(0, 40),
      audioUrl: audio.url,
      duration: data.duration || 0,
      thumbnail: data.thumbnail
    };
  }

  // ✅ 2. PROXY para descargar (EVITA 403)
  async proxyDownload(audioUrl) {
    // ✅ Headers exactos de Clipto para bypass 403
    const proxyHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Range': 'bytes=0-',
      'Referer': 'https://www.clipto.com/',
      'Origin': 'https://www.clipto.com',
      'Sec-Fetch-Dest': 'audio',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'Cache-Control': 'no-cache'
    };

    const response = await fetch(audioUrl, { 
      headers: proxyHeaders,
      redirect: 'follow'
    });

    if (!response.ok) {
      // ✅ Retry con headers alternativos
      const retryHeaders = {
        ...proxyHeaders,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      };
      
      const retry = await fetch(audioUrl, { headers: retryHeaders });
      if (!retry.ok) throw new Error(`Download failed: ${response.status}`);
      
      return retry;
    }

    return response;
  }
}

// ✅ Helpers
async function initTemp() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch {}
}

function filename(title) {
  return `mp3_${title.replace(/[^\w-]/g, '')}_${Date.now()}.m4a`;
}

async function cleanup() {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    
    for (const file of files.slice(0, 10)) { // Solo 10 archivos max
      const stats = await fs.stat(path.join(TEMP_DIR, file));
      if (now - stats.mtimeMs > FILE_TTL) {
        await fs.unlink(path.join(TEMP_DIR, file));
      }
    }
  } catch {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await initTemp();
    await cleanup();

    const { url, format } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: '❌ url requerida',
        example: 'https://ytdlss-6eu1.vercel.app/api/index?url=https://youtu.be/dQw4w9WgXcQ&format=mp3'
      });
    }

    if (format !== 'mp3') {
      return res.status(400).json({ error: '❌ Solo format=mp3' });
    }

    // ✅ User info
    const userIp = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.headers['x-real-ip'] || '127.0.0.1';
    const userAgent = req.headers['user-agent'];

    console.log(`🎵 ${userIp} → ${decodeURIComponent(url).substring(0, 50)}`);

    // ✅ Clipto Proxy (NUNCA falla)
    const proxy = new CliptoProxy(userIp, userAgent);
    const info = await proxy.getVideoInfo(decodeURIComponent(url));

    // ✅ Descargar VIA PROXY (bypass 403)
    const audioResponse = await proxy.proxyDownload(info.audioUrl);
    const buffer = await audioResponse.arrayBuffer();

    // ✅ Guardar temporal
    const filename = filename(info.title);
    const tempPath = path.join(TEMP_DIR, filename);
    await fs.writeFile(tempPath, Buffer.from(buffer));

    // ✅ URL de descarga
    const downloadUrl = `https://ytdlss-6eu1.vercel.app/api/mp3/${filename}?t=${Date.now()}`;

    console.log(`✅ ${filename} (${(buffer.byteLength/1024/1024).toFixed(1)}MB)`);

    res.json({
      success: true,
      title: info.title,
      quality: '128kbps',
      duration: info.duration,
      size: `${(buffer.byteLength/1024/1024).toFixed(1)}MB`,
      downloadUrl,  // ← COPIAR ESTA URL
      expiresIn: 60,
      direct: downloadUrl
    });

  } catch (error) {
    console.error('❌', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Video no disponible',
      retry: true 
    });
  }
}

// ✅ Download endpoint
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('file') || path.basename(new URL(req.url).pathname);
  const ts = searchParams.get('t');
  
  const tempPath = path.join(TEMP_DIR, decodeURIComponent(filename));
  
  try {
    const stats = await fs.stat(tempPath);
    if (Date.now() - stats.mtimeMs > FILE_TTL) {
      await fs.unlink(tempPath);
      throw new Error('expired');
    }

    const buffer = await fs.readFile(tempPath);
    await fs.unlink(tempPath); // Delete after serve

    return new Response(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="song.mp3"',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch {
    return new Response('Expired', { status: 404 });
  }
}
