#!/usr/bin/env node
/**
 * Simple HTTP server for StakTrakrApi data (redundancy endpoint)
 * Serves static files from /tmp/staktrakr-api-export
 */

import { createServer } from "http";
import { readFile, stat } from "fs/promises";
import { join, extname } from "path";

const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.API_EXPORT_DIR || "/tmp/staktrakr-api-export";

const MIME_TYPES = {
  ".json": "application/json",
  ".db": "application/x-sqlite3",
  ".html": "text/html",
  ".txt": "text/plain",
};

const server = createServer(async (req, res) => {
  // CORS headers for API access
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  // Remove query string and decode URI
  const url = decodeURIComponent(req.url.split("?")[0]);

  // Security: prevent directory traversal
  if (url.includes("..")) {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  // Map URL to file path
  const filePath = join(DATA_DIR, url);

  try {
    const stats = await stat(filePath);

    if (!stats.isFile()) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = await readFile(filePath);

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": content.length,
      "Cache-Control": "public, max-age=300", // 5 min cache
    });
    res.end(content);

  } catch (err) {
    if (err.code === "ENOENT") {
      res.writeHead(404);
      res.end("Not Found");
    } else {
      console.error(`Error serving ${url}:`, err);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`StakTrakrApi HTTP server listening on 0.0.0.0:${PORT}`);
  console.log(`Serving files from ${DATA_DIR}`);
});
