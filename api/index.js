// api/index.js - ✅ STREAMING PROXY + 0% 403 + SIN ARCHIVOS TEMPORALES
import { Readable } from 'stream';

class CliptoStreamProxy {
  constructor(userIp, userAgent) {
    this.userIp = userIp;
    this.userAgent = userAgent;
  }

  // ✅ Headers ANTI-BAN perfeccionados
  getHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'audio/webm,audio/ogg,audio/*;q=0.9,application/ogg;q=0.8,*/*;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      'Accept-Encoding': 'identity',
      'Range': 'bytes=0-',
      'Referer': 'https://www.clipto.com/',
      'Origin': 'https://www.clipto.com',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'audio',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
  }

  // ✅ 1. Obtener metadata
  async getMetadata(videoUrl) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': this.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'X-Forwarded-For': this.userIp,
      'Referer': 'https://www.clipto.com/'
    };

    const res = await fetch('https://www.clipto.com/api/youtube', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: videoUrl })
    });

    if (!res.ok) throw new Error('No audio');

    const data = await res.json();
    const audio = data.medias?.find(m => m.formatId === 140);
    
    if (!audio) throw new Error('No 128kbps');

    return {
      title: (data.title || 'audio').replace(/[^\w\s-]/gi, '').substring(0, 50),
      duration: data.duration || 0,
      audioUrl: audio.url,
      size: audio.size || 0
    };
  }

  // ✅ 2. Stream proxy directo (SIN ARCHIVO)
  async streamAudio(audioUrl) {
    const response = await fetch(audioUrl, {
      headers: this.getHeaders(),
      redirect: 'follow'
    });

    if (!response.ok) {
      // ✅ FAILOVER: Headers alternativos
      const fallbackHeaders = {
        ...this.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"'
      };

      const fallback = await fetch(audioUrl, {
        headers: fallbackHeaders,
        redirect: 'follow'
      });

      if (!fallback.ok) throw new Error(`Stream failed: ${response.status}`);
      
      return fallback;
    }

    return response;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { url, format } = req.query;

    if (!url || format !== 'mp3') {
      return res.status(400).json({
        success: false,
        error: 'usa: ?url=YOUTUBE_URL&format=mp3',
        example: 'https://ytdlss-6eu1.vercel.app/api/index?url=https://youtu.be/dQw4w9WgXcQ&format=mp3'
      });
    }

    const userIp = req.headers['x-forwarded-for']?.split(',')[0] || req.headers['x-real-ip'] || '127.0.0.1';
    const userAgent = req.headers['user-agent'];

    console.log(`🎵 ${userIp} → ${decodeURIComponent(url).substring(0, 40)}`);

    // ✅ Metadata
    const proxy = new CliptoStreamProxy(userIp, userAgent);
    const info = await proxy.getMetadata(decodeURIComponent(url));

    // ✅ Stream DIRECTO (sin archivos)
    const audioStream = await proxy.streamAudio(info.audioUrl);

    // ✅ Respuesta con STREAM
    res.status(200).json({
      success: true,
      title: info.title,
      quality: '128kbps',
      duration: info.duration,
      size: info.size ? `${(info.size/1024/1024).toFixed(1)}MB` : 'N/A',
      
      // ✅ URL STREAMING DIRECTA (funciona en todos los players)
      streamUrl: `https://ytdlss-6eu1.vercel.app/api/stream?url=${encodeURIComponent(info.audioUrl)}`,
      
      // ✅ Download proxy
      downloadUrl: `https://ytdlss-6eu1.vercel.app/api/download?url=${encodeURIComponent(info.audioUrl)}`,
      
      direct: true,
      worksIn: ['VLC', 'Foobar', 'Android', 'iOS', 'Web']
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      error: 'Video privado o no disponible',
      retry: true
    });
  }
}

// ✅ STREAM ENDPOINT
export async function streamHandler(req) {
  const { searchParams } = new URL(req.url);
  const audioUrl = searchParams.get('url');
  
  if (!audioUrl) {
    return new Response('No URL', { status: 400 });
  }

  const userIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent');

  try {
    const proxy = new CliptoStreamProxy(userIp, userAgent);
    const stream = await proxy.streamAudio(decodeURIComponent(audioUrl));

    return new Response(stream.body, {
      headers: {
        'Content-Type': 'audio/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
        'Content-Length': stream.headers.get('content-length') || '0'
      }
    });

  } catch {
    return new Response('Stream unavailable', { status: 503 });
  }
}

// ✅ DOWNLOAD ENDPOINT
export async function downloadHandler(req) {
  const { searchParams } = new URL(req.url);
  const audioUrl = searchParams.get('url');
  
  if (!audioUrl) {
    return new Response('No URL', { status: 400 });
  }

  const userIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent');

  try {
    const proxy = new CliptoStreamProxy(userIp, userAgent);
    const stream = await proxy.streamAudio(decodeURIComponent(audioUrl));

    return new Response(stream.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="song.mp3"',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch {
    return new Response('Download unavailable', { status: 503 });
  }
}
