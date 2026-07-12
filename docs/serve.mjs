// Tiny static server for docs/  no dependencies. Usage: node docs/serve.mjs [port]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2]) || 8642;
const types = { ".html": "text/html", ".json": "application/json", ".js": "text/javascript", ".css": "text/css" };

createServer(async (req, res) => {
  const path = req.url === "/" ? "/setup-guide.html" : req.url.split("?")[0];
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(port, () => console.log(`docs served at http://localhost:${port}`));
