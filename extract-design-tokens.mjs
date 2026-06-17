import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Extract design tokens
const design = {
  colors: {
    background: new Set(),
    text: new Set(),
    border: new Set()
  },
  typography: {
    fonts: new Set(),
    weights: new Set(),
    sizes: new Set()
  },
  spacing: new Set(),
  shadows: new Set()
};

function extractFromFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  
  // Extract colors
  text.matchAll(/bg-\[#([A-Fa-f0-9]{6})\]/g).forEach(m => design.colors.background.add(`#${m[1]}`));
  text.matchAll(/text-\[#([A-Fa-f0-9]{6})\]/g).forEach(m => design.colors.text.add(`#${m[1]}`));
  text.matchAll(/border-\[#([A-Fa-f0-9]{6})\]/g).forEach(m => design.colors.border.add(`#${m[1]}`));
  
  // Extract typography
  text.matchAll(/font-(serif|sans|mono)/g).forEach(m => design.typography.fonts.add(m[1]));
  text.matchAll(/font-(normal|medium|semibold|bold|light)/g).forEach(m => design.typography.weights.add(m[1]));
  text.matchAll(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl)/g).forEach(m => design.typography.sizes.add(m[1]));
  
  // Extract specific size values
  text.matchAll(/text-\[([0-9]+(?:px|rem))\]/g).forEach(m => design.typography.sizes.add(m[1]));
  
  // Extract spacing
  text.matchAll(/(?:px|py|pt|pb|pl|pr|p)-(\d+)/g).forEach(m => design.spacing.add(m[1]));
  
  // Extract shadows
  text.matchAll(/shadow-(sm|md|lg|xl|2xl|none)/g).forEach(m => design.shadows.add(m[1]));
}

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

// Output results
console.log('=== GB AUTOMATION DESIGN TOKENS ===\n');

console.log('COLORS:');
console.log('Background:', Array.from(design.colors.background).sort());
console.log('Text:', Array.from(design.colors.text).sort());
console.log('Border:', Array.from(design.colors.border).sort());

console.log('\nTYPOGRAPHY:');
console.log('Font Families:', Array.from(design.typography.fonts));
console.log('Weights:', Array.from(design.typography.weights).sort());
console.log('Sizes:', Array.from(design.typography.sizes).sort());

console.log('\nSPACING SCALE:', Array.from(design.spacing).sort((a,b) => a-b));
console.log('\nSHADOWS:', Array.from(design.shadows));

// Find the actual font stack
const indexHtml = fs.readFileSync('./index.html', 'utf8');
const fontLink = indexHtml.match(/fonts\.googleapis\.com[^"]+/);
console.log('\nFONT IMPORT:', fontLink ? fontLink[0] : 'None found');
