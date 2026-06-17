const fs = require('fs');
const path = require('path');

// Extract all color values from the codebase
const colors = new Set();
const fonts = new Set();
const sizes = new Set();
const content = [];

function extractFromFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  
  // Colors
  const colorMatches = text.matchAll(/(?:text-\[#|bg-\[#|border-\[#)([A-Fa-f0-9]{6})\]/g);
  for (const match of colorMatches) {
    colors.add(`#${match[1]}`);
  }
  
  // Font classes
  const fontMatches = text.matchAll(/font-(serif|sans|mono|normal|medium|semibold|bold)/g);
  for (const match of fontMatches) {
    fonts.add(match[0]);
  }
  
  // Text sizes
  const sizeMatches = text.matchAll(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|\[[^\]]+\])/g);
  for (const match of sizeMatches) {
    sizes.add(match[0]);
  }
}

// Process all JSX and CSS files
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath);
    } else if (file.endsWith('.jsx') || file.endsWith('.css')) {
      extractFromFile(filePath);
    }
  }
}

walkDir('./src');

console.log('=== COLORS ===');
console.log(Array.from(colors).sort().join('\n'));
console.log('\n=== FONTS ===');
console.log(Array.from(fonts).sort().join('\n'));
console.log('\n=== TEXT SIZES ===');
console.log(Array.from(sizes).sort().join('\n'));
