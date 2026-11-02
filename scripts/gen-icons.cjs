const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([t, data]));
  crc.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, t, data, crc]);
}

function createPNG(width, height, r, g, b, a = 255) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rowBytes = width * 4 + 1;
  const rawData = Buffer.alloc(rowBytes * height);
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.42;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter 0
    for (let x = 0; x < width; x++) {
      const p = rowOffset + 1 + x * 4;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius) {
        // Inner circle icon
        rawData[p] = r;
        rawData[p + 1] = g;
        rawData[p + 2] = b;
        rawData[p + 3] = a;
      } else {
        // Background rounded box or transparent
        rawData[p] = 18;
        rawData[p + 1] = 18;
        rawData[p + 2] = 24;
        rawData[p + 3] = dist <= radius + 2 ? 180 : 0;
      }
    }
  }

  const idat = zlib.deflateSync(rawData);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

const iconsDir = path.resolve(__dirname, '../extension/icons');
fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon16.png'), createPNG(16, 16, 99, 102, 241));
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), createPNG(48, 48, 99, 102, 241));
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), createPNG(128, 128, 99, 102, 241));

console.log('Generated extension icons successfully!');
