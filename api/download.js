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
  }

  async downloadAudio(url, options = {}) {
    const {
      chunkSize = 1024 * 1024 * 2,
      showProgress = false
    } = options;

    try {
      console.log("🚀 Iniciando descarga ultra rápida...");

      const metadata = await this._fetchMetadata(url);
      
      // Si el audio ya está disponible
      if (metadata.audioUrl) {
        const result = await this._parallelDownload(
          metadata.audioUrl,
          metadata.filename,
          metadata.size,
          chunkSize,
          showProgress
        );

        console.log("✅ Descarga completada");
        
        return {
          ...metadata,
          path: result.outputPath,
          speed: result.speed,
          downloadTime: result.duration
        };
      } else {
        throw new Error("No se pudo obtener la URL del audio");
      }

    } catch (error) {
      console.error("❌ Error:", error.message);
      throw error;
    }
  }

  async _fetchMetadata(url) {
    try {
      const response = await axios.get(
        `https://ytdlss-7l8w.vercel.app/api/index?url=${encodeURIComponent(url)}`,
        { timeout: 15000 }
      );

      const data = response.data;

      // Verificar diferentes estructuras de respuesta
      let audioUrl = null;
      let filename = "audio.mp3";
      let title = "Audio";
      let size = 0;
      let duration = 0;

      // Estructura 1: data.audio.url
      if (data?.audio?.url) {
        audioUrl = data.audio.url;
        filename = data.audio.filename || `${data.title || "audio"}.mp3`;
        title = data.title || "Audio";
        duration = data.duration || 0;
        size = data.audio.size !== "N/A" ? parseInt(data.audio.size) : 0;
      }
      // Estructura 2: data.url directa
      else if (data?.url) {
        audioUrl = data.url;
        filename = data.filename || `${data.title || "audio"}.mp3`;
        title = data.title || "Audio";
        duration = data.duration || 0;
      }
      // Estructura 3: data.success con audio
      else if (data?.success && data?.audio?.url) {
        audioUrl = data.audio.url;
        filename = data.audio.filename || `${data.title || "audio"}.mp3`;
        title = data.title || "Audio";
        duration = data.duration || 0;
      }
      else {
        throw new Error("No se encontró URL de audio en la respuesta");
      }

      // Limpiar nombre de archivo
      filename = filename.replace(/[\\/:*?"<>|]/g, "_");
      
      // Intentar obtener el tamaño real del archivo
      try {
        const headRes = await axios.head(audioUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 10000
        });
        size = Number(headRes.headers["content-length"] || 0);
        console.log(`📊 Tamaño del archivo: ${(size / 1024 / 1024).toFixed(2)} MB`);
      } catch (error) {
        console.log("⚠️ No se pudo obtener el tamaño del archivo, se usará descarga normal");
        size = 0;
      }

      return {
        audioUrl,
        title,
        filename,
        size,
        duration
      };

    } catch (error) {
      console.error("Error fetching metadata:", error.message);
      throw new Error(`Error al obtener metadatos: ${error.message}`);
    }
  }

  async _parallelDownload(url, filename, totalSize, chunkSize, showProgress) {
    const startTime = Date.now();
    const tempDir = join(tmpdir(), `ytdl_${Date.now()}_${randomBytes(4).toString("hex")}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      // Si el tamaño es desconocido o muy pequeño, usar stream normal
      if (totalSize === 0 || totalSize < chunkSize) {
        console.log("📥 Usando descarga directa (tamaño desconocido o pequeño)");
        return await this._streamDownload(url, filename, showProgress);
      }

      // Calcular número de chunks
      const chunks = [];
      for (let start = 0; start < totalSize; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, totalSize - 1);
        chunks.push({ start, end, index: chunks.length });
      }

      console.log(`📦 Descargando en ${chunks.length} chunks paralelos (${this.concurrentChunks} concurrentes)...`);

      // Descargar chunks en lotes
      for (let i = 0; i < chunks.length; i += this.concurrentChunks) {
        const batch = chunks.slice(i, i + this.concurrentChunks);
        const batchPromises = batch.map(chunk => 
          this._downloadChunk(url, tempDir, chunk)
        );
        await Promise.all(batchPromises);
        
        if (showProgress) {
          const progress = ((i + batch.length) / chunks.length * 100).toFixed(1);
          console.log(`📊 Progreso: ${progress}%`);
        }
      }

      console.log("🔧 Combinando chunks...");
      const outputPath = join(tmpdir(), filename);
      await this._mergeChunks(tempDir, outputPath, chunks.length);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      const speed = (totalSize / ((endTime - startTime) / 1000) / 1024 / 1024).toFixed(2);

      console.log(`✅ Descarga completada: ${(totalSize / 1024 / 1024).toFixed(2)} MB en ${duration}s (${speed} MB/s)`);
      
      return { duration, speed: `${speed} MB/s`, outputPath };

    } finally {
      // Limpiar carpeta temporal
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.log("⚠️ No se pudo limpiar carpeta temporal:", e.message);
      }
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
        timeout: 60000 // 60 segundos timeout
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
    
    console.log("📥 Iniciando descarga directa...");
    
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 120000 // 2 minutos timeout
    });

    let downloaded = 0;
    if (showProgress) {
      response.data.on("data", chunk => {
        downloaded += chunk.length;
        if (downloaded % (1024 * 1024) < chunk.length) {
          const percent = ((downloaded / (response.headers["content-length"] || 1)) * 100).toFixed(1);
          process.stdout.write(`\r📥 Descargando: ${(downloaded / 1024 / 1024).toFixed(1)} MB (${percent}%)`);
        }
      });
    }

    await pipeline(response.data, createWriteStream(outputPath));
    
    if (showProgress) {
      process.stdout.write('\n');
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const stats = await fs.stat(outputPath);
    const speed = (stats.size / ((Date.now() - startTime) / 1000) / 1024 / 1024).toFixed(2);

    console.log(`✅ Descarga completada: ${(stats.size / 1024 / 1024).toFixed(2)} MB en ${duration}s (${speed} MB/s)`);
    
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
      success: false,
      error: "Se requiere el parámetro 'url' con el link de YouTube" 
    });
  }

  try {
    const downloader = new UltraFastDownloader(Math.min(parseInt(chunks), 8));
    
    const result = await downloader.downloadAudio(url, {
      concurrentChunks: Math.min(parseInt(chunks), 8),
      chunkSize: 1024 * 1024 * 2,
      showProgress: false
    });

    // Verificar que el archivo se descargó
    if (!result.path || !result.filename) {
      throw new Error("No se pudo descargar el audio");
    }

    // Generar ID único para el archivo
    const fileId = randomBytes(16).toString("hex");
    
    // Guardar metadata
    fileStore.set(fileId, {
      path: result.path,
      filename: result.filename,
      title: result.title,
      size: result.size,
      expires: Date.now() + 3600000 // Expira en 1 hora
    });

    // Obtener la URL base
   // const baseUrl = process.env.VERCEL_URL 
     // ? `https://ytdlss-7l8w.vercel.app`
    //  : `https://ytdlss-7l8w.vercel.app`  || `http://localhost:3000`;

    return res.status(200).json({
      success: true,
      streamUrl: `https://ytdlss-7l8w.vercel.app/api/stream?id=${fileId}`,
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
