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
 * 生成邮件图标像素数据
 */
function generateIconPixels(width, height) {
  const data = [];
  const padding = Math.floor(width * 0.08);
  const rectHeight = Math.floor(height * 0.6);
  const cornerRadius = Math.floor(width * 0.06);
  
  // 品牌色 (RGB)
  const bgR = 0, bgG = 102, bgB = 204;
  const foldR = 255, foldG = 255, foldB = 255;
  
  for (let y = 0; y < height; y++) {
    data.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // 计算矩形区域
      const inRect = x >= padding && x < width - padding && 
                     y >= padding && y < padding + rectHeight;
      
      // 计算圆角裁剪
      let alpha = 255;
      let r = 0, g = 0, b = 0;
      
      if (inRect) {
        // 背景色
        r = bgR; g = bgG; b = bgB;
        
        // 折痕线 (V 形)
        const cx = width / 2;
        const lineWidth = Math.max(2, width * 0.03);
        
        // 下折痕
        const foldY = padding + rectHeight - (x - padding);
        if (Math.abs(y - foldY) < lineWidth && x >= padding && x <= width - padding) {
          r = foldR; g = foldG; b = foldB;
        }
        
        // 上折痕（浅色）
        const topFoldY = padding + (x - padding);
        if (Math.abs(y - topFoldY) < lineWidth * 0.6 && x >= padding && x <= width - padding) {
          r = foldR; g = foldG; b = foldB;
        }
        
        // 闪电图标
        const lx = width * 0.7;
        const ly = height * 0.7;
        if (isInLightning(x, y, lx, ly, width * 0.15)) {
          r = 255; g = 215; b = 0;
        }
        
      } else if (y < padding || y >= padding + rectHeight) {
        // 透明背景
        alpha = 0;
      }
      
      data.push(r, g, b, alpha);
    }
  }
  
  return Buffer.from(data);
}

/**
 * 判断点是否在闪电形状内
 */
function isInLightning(x, y, cx, cy, size) {
  const dx = Math.abs(x - cx) / size;
  const dy = Math.abs(y - cy) / size;
  return dx < 0.5 && dy < 0.8 && (dx < 0.15 || dy < 0.3);
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
