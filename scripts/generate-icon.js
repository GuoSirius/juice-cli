/**
 * 生成 juice CLI 的自定义图标（纯 Node.js，无需额外依赖）
 *
 * 运行此脚本生成图标文件：
 *   node scripts/generate-icon.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const outputDir = path.join(__dirname, '..', 'icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ─── 创建 PNG 图标 ────────────────────────────────────────────────────────────

function createPngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  const table = makeCrcTable();
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

function generateIconPixels(width, height) {
  const data = [];
  const bgColor = { r: 30, g: 100, b: 220 };
  const foldColor = { r: 255, g: 255, b: 255 };
  const boltColor = { r: 255, g: 210, b: 0 };

  for (let y = 0; y < height; y++) {
    data.push(0);
    for (let x = 0; x < width; x++) {
      let alpha = 0;
      let r = 0, g = 0, b = 0;

      const inMain = x >= 1 && x < width - 1 && y >= 1 && y < height - 1;

      if (inMain) {
        alpha = 255;
        r = bgColor.r; g = bgColor.g; b = bgColor.b;

        const midX = width / 2;
        const topY = height * 0.65;
        const leftX = width * 0.1;
        const rightX = width * 0.9;

        if (y >= topY && y <= height * 0.85) {
          const progress = (y - topY) / (height * 0.2);
          const lineX = leftX + (midX - leftX) * progress;
          if (Math.abs(x - lineX) < 1.5) {
            r = foldColor.r; g = foldColor.g; b = foldColor.b;
          }
        }

        if (y >= topY && y <= height * 0.85) {
          const progress = (y - topY) / (height * 0.2);
          const lineX = rightX - (rightX - midX) * progress;
          if (Math.abs(x - lineX) < 1.5) {
            r = foldColor.r; g = foldColor.g; b = foldColor.b;
          }
        }

        const boltX = width * 0.72;
        const boltY = height * 0.6;
        const boltW = width * 0.12;
        const boltH = height * 0.2;

        const inBolt = (
          (x >= boltX - boltW / 2 && x <= boltX + boltW / 2 && y >= boltY && y <= boltY + boltH) ||
          (x >= boltX - boltW * 0.1 && x <= boltX + boltW * 0.3 && y >= boltY - boltH * 0.4 && y <= boltY + boltH * 0.1)
        );

        if (inBolt) {
          const isEdge = (
            (x >= boltX - boltW / 2 && x <= boltX - boltW / 4 && y >= boltY + boltH * 0.7 && y <= boltY + boltH) ||
            (x >= boltX + boltW / 4 && x <= boltX + boltW / 2 && y >= boltY - boltH * 0.3 && y <= boltY)
          );
          if (isEdge) {
            r = 20; g = 20; b = 20;
          } else {
            r = boltColor.r; g = boltColor.g; b = boltColor.b;
          }
        }
      }

      const cr = Math.floor(width * 0.08);
      if (cr > 0) {
        const corners = [
          [cr, cr], [width - cr, cr], [cr, height - cr], [width - cr, height - cr]
        ];
        for (const [cx, cy] of corners) {
          if (
            (x < cr && y < cr && (x - cx) * (x - cx) + (y - cy) * (y - cy) > cr * cr) ||
            (x >= width - cr && y < cr && (x - cx) * (x - cx) + (y - cy) * (y - cy) > cr * cr) ||
            (x < cr && y >= height - cr && (x - cx) * (x - cx) + (y - cy) * (y - cy) > cr * cr) ||
            (x >= width - cr && y >= height - cr && (x - cx) * (x - cx) + (y - cy) * (y - cy) > cr * cr)
          ) {
            alpha = 0;
          }
        }
      }

      data.push(r, g, b, alpha);
    }
  }

  return Buffer.from(data);
}

function createSimplePng(size) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = createPngChunk('IHDR', ihdrData);
  const rawData = generateIconPixels(size, size);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createPngChunk('IDAT', compressed);
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createIco(pngBuffers) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngBuffers.length, 4);

  const entries = [];
  let offset = 6 + pngBuffers.length * 16;

  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.data)]);
}

// ─── 主程序 ──────────────────────────────────────────────────────────────────

console.log('\n  生成 juice CLI 自定义图标...\n');

const sizes = [16, 32, 48, 256];
const pngBuffers = [];

for (const size of sizes) {
  const png = createSimplePng(size);
  const filename = `juice-icon-${size}.png`;
  fs.writeFileSync(path.join(outputDir, filename), png);
  console.log(`  ✓ 生成 ${filename}`);
  pngBuffers.push({ size, data: png });
}

const ico = createIco(pngBuffers);
fs.writeFileSync(path.join(outputDir, 'juice-icon.ico'), ico);
console.log('  ✓ 生成 juice-icon.ico');

console.log(`\n  图标目录：${outputDir}`);
console.log('\n  生成完成！运行以下命令重新注册右键菜单：');
console.log('    juice --install\n');
