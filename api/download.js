// api/download.js
import axios from "axios";
import { createWriteStream, mkdirSync, rmSync, createReadStream, promises as fs } from "fs";
import { pipeline } from "stream/promises";
import { finished } from "stream/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";

// ⚡ Proxies rápidas
const PROXIES = [
  'http://141.95.55.160:3128',
  'socks5://94.131.118.39:1082',
  'socks4://164.132.168.87:50161',
  'socks4://130.61.119.46:3128'
];

// ✅ Función para obtener proxy aleatorio
function getProxyAgent() {
  const proxy = PROXIES[Math.floor(Math.random() * PROXIES.length)];
  
  if (proxy.startsWith('socks')) {
    return new SocksProxyAgent(proxy);
  }
  
  return new HttpsProxyAgent(proxy);
}

// Función para obtener metadatos con Clipto API (usa proxies)
async function fetchMetadataWithClipto(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const agent = getProxyAgent();
      
      const response = await fetch('https://www.clipto.com/api/youtube', {
        method: 'POST',
        agent: agent,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.clipto.com/',
          'Origin': 'https://www.clipto.com'
        },
        body: JSON.stringify({
          url: decodeURIComponent(url)
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Buscar audio en 128kbps (formatId 140)
      const audio = data.medias?.find(v => v.formatId === 140);
      
      // Buscar video en 360p como fallback
      let video = data.medias?.find(v => v.quality === '360p');
      if (!video) {
        video = data.medias?.find(v => v.extension === 'mp4');
      }

      if (!audio || !audio.url) {
        throw new Error("No se encontró audio disponible");
      }

      return {
        audioUrl: audio.url,
        title: data.title || "audio",
        filename: `${data.title.replace(/[\\/:*?"<>|]/g, "_")}.mp3`,
        size: audio.size || 0,
        duration: data.duration || 0,
        thumbnail: data.thumbnail,
        audioInfo: {
          quality: '128kbps',
          mime: 'audio/mp4'
        }
      };
      
    } catch (error) {
      console.error(`Intento ${attempt + 1} falló:`, error.message);
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

// Función de respaldo con la API anterior
async function fetchMetadataBackup(url) {
  const { data } = await axios.get(
    `https://ytdlss-7l8w.vercel.app/api/index?url=${encodeURIComponent(url)}`,
    { timeout: 15000 }
  );

  if (!data?.success || !data?.audio?.url) {
    throw new Error("No se encontró audio");
  }

  try {
    const headRes = await axios.head(data.audio.url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000
    });
    var size = Number(headRes.headers["content-length"] || 0);
  } catch (error) {
    var size = 0;
  }

  return {
    audioUrl: data.audio.url,
    title: data.title || "audio",
    filename: data.audio.filename || `${data.title.replace(/[\\/:*?"<>|]/g, "_")}.mp3`,
    size,
    duration: data.duration || 0
  };
}

class UltraFastDownloader {
  constructor(concurrentChunks = 5, useProxies = true) {
    this.concurrentChunks = concurrentChunks;
    this.useProxies = useProxies;
    this.activeDownloads = new Map();
  }

  async downloadAudio(url, options = {}) {
    const {
      chunkSize = 1024 * 1024 * 2,
      showProgress = false
    } = options;

    try {
      console.log("🚀 Iniciando descarga ultra rápida...");
      
      // Intentar con Clipto API primero (usa proxies)
      let metadata;
      try {
        if (this.useProxies) {
          console.log("📡 Usando Clipto API con proxies...");
          metadata = await fetchMetadataWithClipto(url);
        } else {
          throw new Error("Proxies deshabilitados");
        }
      } catch (cliptoError) {
        console.log("⚠️ Clipto API falló, usando backup:", cliptoError.message);
        metadata = await fetchMetadataBackup(url);
      }
      
      const result = await this._parallelDownload(
        metadata.audioUrl,
        metadata.filename,
        metadata.size,
        chunkSize,
        showProgress
      );

      console.log("✅ Descarga completada en", result.duration, "segundos");
      
      return {
        ...metadata,
        path: result.outputPath,
        speed: result.speed,
        downloadTime: result.duration
      };

    } catch (error) {
      console.error("❌ Error:", error.message);
      throw error;
    }
  }

  async _parallelDownload(url, filename, totalSize, chunkSize, showProgress) {
    const startTime = Date.now();
    const tempDir = join(tmpdir(), `ytdl_${Date.now()}_${randomBytes(4).toString("hex")}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      if (totalSize === 0 || totalSize < chunkSize) {
        return await this._streamDownload(url, filename, showProgress);
      }

      const chunks = [];
      for (let start = 0; start < totalSize; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, totalSize - 1);
        chunks.push({ start, end, index: chunks.length });
      }

      console.log(`📦 Descargando en ${chunks.length} chunks paralelos...`);

      for (let i = 0; i < chunks.length; i += this.concurrentChunks) {
        const batch = chunks.slice(i, i + this.concurrentChunks);
        const batchPromises = batch.map(chunk => 
          this._downloadChunk(url, tempDir, chunk)
        );
        await Promise.all(batchPromises);
      }

      console.log("🔧 Combinando chunks...");
      const outputPath = join(tmpdir(), filename);
      await this._mergeChunks(tempDir, outputPath, chunks.length);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      const speed = (totalSize / ((endTime - startTime) / 1000) / 1024 / 1024).toFixed(2);

      return { duration, speed: `${speed} MB/s`, outputPath };

    } finally {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  async _downloadChunk(url, tempDir, chunk) {
    const { start, end, index } = chunk;
    
    const config = {
      url,
      method: "GET",
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Range": `bytes=${start}-${end}`
      },
      timeout: 30000
    };

    // Usar proxy si está habilitado
    if (this.useProxies) {
      try {
        config.httpsAgent = getProxyAgent();
      } catch (e) {
        console.log("Proxy no disponible para chunk");
      }
    }
    
    const response = await axios(config);
    const chunkFile = join(tempDir, `chunk_${index}`);
    const writer = createWriteStream(chunkFile);
    
    response.data.pipe(writer);
    await finished(writer);

    return { index, file: chunkFile };
  }

  async _mergeChunks(tempDir, outputFile, totalChunks) {
    const writer = createWriteStream(outputFile);
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkFile = join(tempDir, `chunk_${i}`);
      const reader = createReadStream(chunkFile);
      reader.pipe(writer, { end: false });
      await finished(reader);
    }
    
    writer.end();
    await finished(writer);
  }

  async _streamDownload(url, filename, showProgress) {
    const startTime = Date.now();
    const outputPath = join(tmpdir(), filename);
    
    const config = {
      url,
      method: "GET",
      responseType: "stream",
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 60000
    };

    if (this.useProxies) {
      try {
        config.httpsAgent = getProxyAgent();
      } catch (e) {}
    }
    
    const response = await axios(config);
    await pipeline(response.data, createWriteStream(outputPath));
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const stats = await fs.stat(outputPath);
    const speed = (stats.size / ((Date.now() - startTime) / 1000) / 1024 / 1024).toFixed(2);

    return { duration, speed: `${speed} MB/s`, outputPath };
  }
}

// Almacenamiento temporal
const fileStore = new Map();

// Limpiar archivos viejos cada 30 minutos
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of fileStore.entries()) {
    if (data.expires < now) {
      try {
        rmSync(data.path, { force: true });
        fileStore.delete(id);
        console.log(`🗑️ Limpiado archivo expirado: ${id}`);
      } catch (e) {}
    }
  }
}, 30 * 60 * 1000);

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { url, chunks = "5", useProxies = "true" } = req.query;

  if (!url) {
    return res.status(400).json({ 
      error: "Se requiere el parámetro 'url' con el link de YouTube" 
    });
  }

  try {
    const useProxyFlag = useProxies === "true";
    const downloader = new UltraFastDownloader(
      Math.min(parseInt(chunks), 10),
      useProxyFlag
    );
    
    const result = await downloader.downloadAudio(url, {
      concurrentChunks: Math.min(parseInt(chunks), 10),
      chunkSize: 1024 * 1024 * 2,
      showProgress: false
    });

    // Generar ID único para el archivo
    const fileId = randomBytes(16).toString("hex");
    const filePath = result.path;
    
    // Guardar metadata
    fileStore.set(fileId, {
      path: filePath,
      filename: result.filename,
      title: result.title,
      size: result.size,
      expires: Date.now() + 3600000 // Expira en 1 hora
    });

    // Obtener la URL base
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.URL || `http://localhost:3000`;

    return res.status(200).json({
      success: true,
      streamUrl: `${baseUrl}/api/stream?id=${fileId}`,
      metadata: {
        title: result.title,
        filename: result.filename,
        size: result.size,
        duration: result.duration,
        downloadSpeed: result.speed,
        downloadTime: `${result.downloadTime}s`,
        thumbnail: result.thumbnail,
        audioQuality: result.audioInfo?.quality || '128kbps'
      },
      expiresIn: 3600
    });

  } catch (error) {
    console.error("Error detallado:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}
