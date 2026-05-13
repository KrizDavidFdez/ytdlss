// api/download.js
import axios from "axios";
import { createWriteStream, mkdirSync, rmSync, createReadStream, promises as fs } from "fs";
import { pipeline } from "stream/promises";
import { finished } from "stream/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

class UltraFastDownloader {
  constructor(concurrentChunks = 5) {
    this.concurrentChunks = concurrentChunks;
    this.activeDownloads = new Map();
  }

  async downloadAudio(url, options = {}) {
    const {
      chunkSize = 1024 * 1024 * 2,
      showProgress = false
    } = options;

    try {
      console.log("🚀 Iniciando descarga ultra rápida...");

      const metadata = await this._fetchMetadata(url);
      
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

  async _fetchMetadata(url) {
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
      console.log("No se pudo obtener tamaño, continuando...");
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

  async _parallelDownload(url, filename, totalSize, chunkSize, showProgress) {
    const startTime = Date.now();
    // Usar /tmp en Vercel
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

      let downloadedBytes = 0;
      
      for (let i = 0; i < chunks.length; i += this.concurrentChunks) {
        const batch = chunks.slice(i, i + this.concurrentChunks);
        const batchPromises = batch.map(chunk => 
          this._downloadChunk(url, tempDir, chunk)
            .then(result => {
              downloadedBytes += chunk.end - chunk.start + 1;
              return result;
            })
        );
        await Promise.all(batchPromises);
      }

      console.log("🔧 Combinando chunks...");
      // Guardar en /tmp
      const outputPath = join(tmpdir(), filename);
      await this._mergeChunks(tempDir, outputPath, chunks.length);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      const speed = (totalSize / ((endTime - startTime) / 1000) / 1024 / 1024).toFixed(2);

      return { duration, speed: `${speed} MB/s`, outputPath };

    } finally {
      // Limpiar archivos temporales
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  async _downloadChunk(url, tempDir, chunk) {
    const { start, end, index } = chunk;
    
    try {
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Range": `bytes=${start}-${end}`
        },
        timeout: 30000
      });

      const chunkFile = join(tempDir, `chunk_${index}`);
      const writer = createWriteStream(chunkFile);
      
      response.data.pipe(writer);
      await finished(writer);

      return { index, file: chunkFile };
    } catch (error) {
      console.error(`Error en chunk ${index}:`, error.message);
      throw error;
    }
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
    
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 60000
    });

    await pipeline(response.data, createWriteStream(outputPath));
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const stats = await fs.stat(outputPath);
    const speed = (stats.size / ((Date.now() - startTime) / 1000) / 1024 / 1024).toFixed(2);

    return { duration, speed: `${speed} MB/s`, outputPath };
  }
}

// Almacenamiento temporal de archivos
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

  const { url, chunks = "5" } = req.query;

  if (!url) {
    return res.status(400).json({ 
      error: "Se requiere el parámetro 'url' con el link de YouTube" 
    });
  }

  try {
    const downloader = new UltraFastDownloader(parseInt(chunks));
    
    const result = await downloader.downloadAudio(url, {
      concurrentChunks: Math.min(parseInt(chunks), 10), // Máximo 10 chunks
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
        downloadTime: `${result.downloadTime}s`
      },
      expiresIn: 3600 // segundos
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
