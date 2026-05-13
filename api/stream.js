// api/stream.js
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Mismo store que en download.js (en producción usa Redis)
const fileStore = new Map();

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Se requiere el parámetro 'id'" });
  }

  const fileInfo = fileStore.get(id);
  
  if (!fileInfo) {
    return res.status(404).json({ error: "Archivo no encontrado o expirado" });
  }

  // Verificar si el archivo expiró
  if (fileInfo.expires < Date.now()) {
    fileStore.delete(id);
    try {
      const fs = await import('fs');
      fs.unlinkSync(fileInfo.path);
    } catch (e) {}
    return res.status(404).json({ error: "Archivo expirado" });
  }

  try {
    const stats = await stat(fileInfo.path);
    const fileSize = stats.size;
    const range = req.headers.range;

    // Configurar headers para streaming
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileInfo.filename)}"`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600");

    if (range) {
      // Soporte para streaming con range requests
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      res.statusCode = 206;
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", chunksize);

      const stream = createReadStream(fileInfo.path, { start, end });
      stream.pipe(res);
      
      // Manejar errores del stream
      stream.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error al transmitir" });
        }
      });
    } else {
      // Stream completo
      res.setHeader("Content-Length", fileSize);
      const stream = createReadStream(fileInfo.path);
      stream.pipe(res);
      
      stream.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error al transmitir" });
        }
      });
    }
  } catch (error) {
    console.error("Error en streaming:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error al transmitir el audio" });
    }
  }
}
