/**
 * 生成 juice CLI 的自定义图标（纯 Node.js，无需额外依赖）
 * 
 * 运行此脚本生成图标文件：
 *   node scripts/generate-icon.js
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'icons');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ─── 创建 PNG 图标（使用纯 JS）───────────────────────────────────────────────

/**
 * 创建一个简单的 PNG 图标
 * 使用预定义的像素数据创建邮件图标
 */
function createSimplePng(size) {
  // PNG 文件头
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk (图像头)
  const width = size;
  const height = size;
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdrChunk = createPngChunk('IHDR', ihdrData);
  
  // 生成像素数据
  const rawData = generateIconPixels(width, height);
  
  // IDAT chunk (图像数据，压缩后)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createPngChunk('IDAT', compressed);
  
  // IEND chunk (图像结束)
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * 创建 PNG chunk
 */
function createPngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

/**
 * CRC32 计算
 */
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

/**
 * 生成邮件图标像素数据（简洁信封 + 闪电设计）
 */
function generateIconPixels(width, height) {
  const data = [];
  
  // 颜色定义
  const bgColor = { r: 30, g: 100, b: 220 };     // 蓝色背景
  const foldColor = { r: 255, g: 255, b: 255 }; // 折痕白色
  const boltColor = { r: 255, g: 210, b: 0 };    // 闪电金色
  
  for (let y = 0; y < height; y++) {
    data.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      let alpha = 0;
      let r = 0, g = 0, b = 0;
      
      // 画一个简单的矩形信封（占满整个图标）
      const inMain = x >= 1 && x < width - 1 && y >= 1 && y < height - 1;
      
      if (inMain) {
        alpha = 255;
        r = bgColor.r;
        g = bgColor.g;
        b = bgColor.b;
        
        // 画倒 V 形折痕（信封折线）
        const midX = width / 2;
        const topY = height * 0.65;
        const leftX = width * 0.1;
        const rightX = width * 0.9;
        
        // 左上到中间
        if (y >= topY && y <= height * 0.85) {
          const progress = (y - topY) / (height * 0.2);
          const lineX = leftX + (midX - leftX) * progress;
          if (Math.abs(x - lineX) < 1.5) {
            r = foldColor.r; g = foldColor.g; b = foldColor.b;
          }
        }
        
        // 右上到中间
        if (y >= topY && y <= height * 0.85) {
          const progress = (y - topY) / (height * 0.2);
          const lineX = rightX - (rightX - midX) * progress;
          if (Math.abs(x - lineX) < 1.5) {
            r = foldColor.r; g = foldColor.g; b = foldColor.b;
          }
        }
        
        // 画闪电符号（右下角）
        const boltX = width * 0.72;
        const boltY = height * 0.6;
        const boltW = width * 0.12;
        const boltH = height * 0.2;
        
        // 闪电主干（斜矩形）
        const inBolt = (
          // 主干
          (x >= boltX - boltW/2 && x <= boltX + boltW/2 && 
           y >= boltY && y <= boltY + boltH) ||
          // 上斜
          (x >= boltX - boltW * 0.1 && x <= boltX + boltW * 0.3 &&
           y >= boltY - boltH * 0.4 && y <= boltY + boltH * 0.1)
        );
        
        if (inBolt) {
          // 描边
          const isEdge = (
            (x >= boltX - boltW/2 && x <= boltX - boltW/4 && y >= boltY + boltH * 0.7 && y <= boltY + boltH) ||
            (x >= boltX + boltW/4 && x <= boltX + boltW/2 && y >= boltY - boltH * 0.3 && y <= boltY)
          );
          if (isEdge) {
            r = 20; g = 20; b = 20; // 黑色描边
          } else {
            r = boltColor.r;
            g = boltColor.g;
            b = boltColor.b;
          }
        }
      }
      
      // 圆角裁剪
      const cr = Math.floor(width * 0.08);
      if (cr > 0) {
        const corners = [
          [cr, cr],           // 左上
          [width - cr, cr],   // 右上
          [cr, height - cr], // 左下
          [width - cr, height - cr] // 右下
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

// ─── 创建 ICO 文件 ─────────────────────────────────────────────────────────────

function createIco(pngBuffers) {
  // ICO 格式头
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // Reserved
  header.writeUInt16LE(1, 2);      // Type (1 = ICO)
  header.writeUInt16LE(pngBuffers.length, 4); // Number of images
  
  // 目录条目
  const entries = [];
  let offset = 6 + pngBuffers.length * 16;
  
  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);  // Width
    entry.writeUInt8(size === 256 ? 0 : size, 1);  // Height
    entry.writeUInt8(0, 2);                          // Color palette
    entry.writeUInt8(0, 3);                          // Reserved
    entry.writeUInt16LE(1, 4);                       // Color planes
    entry.writeUInt16LE(32, 6);                      // Bits per pixel
    entry.writeUInt32LE(data.length, 8);             // Size of image data
    entry.writeUInt32LE(offset, 12);                // Offset of image data
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
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, png);
  console.log(`  ✓ 生成 ${filename}`);
  pngBuffers.push({ size, data: png });
}

// 生成 ICO 文件
const ico = createIco(pngBuffers);
const icoPath = path.join(outputDir, 'juice-icon.ico');
fs.writeFileSync(icoPath, ico);
console.log(`  ✓ 生成 juice-icon.ico`);

console.log(`\n  图标目录：${outputDir}`);
console.log('\n  生成完成！运行以下命令重新注册右键菜单：');
console.log('    juice --install\n');
