// api/stream.js
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { join } from "path";

// En producción, usa una base de datos real
const fileStore = new Map();

export default async function handler(req, res) {
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
    } else {
      // Stream completo
      res.setHeader("Content-Length", fileSize);
      const stream = createReadStream(fileInfo.path);
      stream.pipe(res);
    }
  } catch (error) {
    console.error("Error en streaming:", error);
    res.status(500).json({ error: "Error al transmitir el audio" });
  }
}
