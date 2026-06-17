import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const DEFAULT_INCLUDE = [
  'src/**/*.jsx',
  'public/portfolio/**/*.json',
  'public/clients/**/*.json',
  'public/artifacts/**/*.json',
  'public/prds/**/*.json',
];

const DEFAULT_EXCLUDE_PARTS = ['node_modules', 'dist', '.git'];
const QUANTIFIED_CLAIM_RE = /(?:\b\d+(?:\.\d+)?\s?%\b|\b\d+(?:\.\d+)?\+?\s+(?:hours?|days?|weeks?|months?|years?|clients?|customers?|stores?|sites?|websites?|pages?|brands?|apps?|agents?|automations?|reports?|builds?|deployments?|projects?|artifacts?|wins?|blockers?|minutes?|seconds?)\b|\b\d+x\b)/i;
const CLIENT_HINT_RE = /\b(?:ACME|GBAutomation|RevStar|Mall|Sylvan|Jason Diaz|Loren Piretra|Pbauer|JID5274)\b/i;
const CLIENT_CLAIM_CONTEXT_RE = /\b(?:accepted|automated|built|closed|completed|connected|deployed|diffed|enabled|generated|improved|launched|live|moved|onboarded|promoted|published|reduced|resolved|rolled|saved|shipped|streamlined|synced|validated|verified|went live|is the template|are live)\b/i;
const GENERIC_SKIP_KEYS = new Set(['id', 'slug', 'href', 'url', 'path', 'app_path', 'asset_url', 'source', 'sourcePath', 'sourceQuote', 'schema_version', 'version', 'repository', 'client']);

function normalizeRel(path) {
  return path.split(sep).join('/');
}

function hashClaim(file, text, jsonPath = '') {
  return crypto.createHash('sha256').update(`${file}\n${jsonPath}\n${text}`).digest('hex').slice(0, 16);
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(pattern) {
  let out = '^';
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    const next = pattern[i + 1];
    if (char === '*' && next === '*') {
      out += '.*';
      i += 1;
    } else if (char === '*') {
      out += '[^/]*';
    } else if (char === '?') {
      out += '[^/]';
    } else {
      out += escapeRegex(char);
    }
  }
  return new RegExp(`${out}$`);
}

function listFiles(rootDir) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (DEFAULT_EXCLUDE_PARTS.includes(entry.name)) continue;
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
  };
  walk(rootDir);
  return files;
}

function matchesInclude(relPath, include) {
  return include.some((pattern) => globToRegex(pattern).test(relPath));
}

function buildClientRegex(clientRoots = []) {
  const terms = [];
  for (const root of clientRoots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
      terms.push(entry.name.replace(/-/g, ' '));
      for (const part of entry.name.split('-')) {
        if (part.length > 3) terms.push(part);
      }
      const profilePath = resolve(root, entry.name, 'profile.md');
      if (existsSync(profilePath)) {
        const profile = readFileSync(profilePath, 'utf8');
        for (const match of profile.matchAll(/^(?:name|client|company|title):\s*(.+)$/gim)) {
          const value = match[1].replace(/^['"]|['"]$/g, '').trim();
          if (value.length > 2 && value.length < 80) terms.push(value);
        }
      }
    }
  }
  if (!terms.length) return CLIENT_HINT_RE;
  const unique = [...new Set([...terms, 'GBAutomation', 'RevStar'])]
    .filter((term) => term && term.length > 2)
    .sort((a, b) => b.length - a.length);
  return new RegExp(`\\b(?:${unique.map(escapeRegex).join('|')})\\b`, 'i');
}

export function detectClaimText(text, options = {}) {
  if (typeof text !== 'string') return false;
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length < 12) return false;
  const clientRegex = options.clientRegex ?? CLIENT_HINT_RE;
  return QUANTIFIED_CLAIM_RE.test(normalized) || (clientRegex.test(normalized) && CLIENT_CLAIM_CONTEXT_RE.test(normalized));
}

function lineForText(content, text) {
  const idx = content.indexOf(text);
  if (idx < 0) return 1;
  return content.slice(0, idx).split('\n').length;
}

function extractStringsFromJsx(content) {
  const claims = [];
  for (const match of content.matchAll(/>([^<>{}\n][^<>{}]*)</g)) {
    claims.push({ text: match[1].replace(/\s+/g, ' ').trim(), index: match.index });
  }
  return claims;
}

function hasFileLevelProof(content, rootDir, evidenceRoots) {
  const sourcePathMatch = content.match(/sourcePath\s*:\s*['"]([^'"]+)['"]/);
  const sourceQuoteMatch = content.match(/sourceQuote\s*:\s*['"]([^'"]{8,})['"]/);
  if (!sourcePathMatch || !sourceQuoteMatch) return false;
  return evidenceContainsQuote(sourcePathMatch[1], sourceQuoteMatch[1], rootDir, evidenceRoots);
}

function extractJsonClaims(value, relFile, rootDir, evidenceRoots, options, pathParts = [], inheritedProof = null) {
  const claims = [];
  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      claims.push(...extractJsonClaims(item, relFile, rootDir, evidenceRoots, options, [...pathParts, String(idx)], inheritedProof));
    });
    return claims;
  }
  if (value && typeof value === 'object') {
    const currentProof = value.sourcePath && value.sourceQuote
      ? { sourcePath: value.sourcePath, sourceQuote: value.sourceQuote }
      : inheritedProof;
    for (const [key, child] of Object.entries(value)) {
      if (GENERIC_SKIP_KEYS.has(key)) continue;
      claims.push(...extractJsonClaims(child, relFile, rootDir, evidenceRoots, options, [...pathParts, key], currentProof));
    }
    return claims;
  }
  if (typeof value === 'string' && detectClaimText(value, options)) {
    const jsonPath = pathParts.join('.');
    claims.push({
      file: relFile,
      line: 1,
      text: value.replace(/\s+/g, ' ').trim(),
      jsonPath,
      supported: inheritedProof ? evidenceContainsQuote(inheritedProof.sourcePath, inheritedProof.sourceQuote, rootDir, evidenceRoots) : false,
      sourcePath: inheritedProof?.sourcePath,
      sourceQuote: inheritedProof?.sourceQuote,
    });
  }
  return claims;
}

export function extractClaimsFromFile(filePath, rootDir = process.cwd(), options = {}) {
  const relFile = normalizeRel(relative(rootDir, filePath));
  const content = readFileSync(filePath, 'utf8');
  const evidenceRoots = options.evidenceRoots ?? [];
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(content);
    return extractJsonClaims(parsed, relFile, rootDir, evidenceRoots, options);
  }
  const fileProof = hasFileLevelProof(content, rootDir, evidenceRoots);
  return extractStringsFromJsx(content)
    .filter((claim) => detectClaimText(claim.text, options))
    .map((claim) => ({
      file: relFile,
      line: lineForText(content, claim.text),
      text: claim.text,
      supported: fileProof,
    }));
}

function evidenceContainsQuote(sourcePath, sourceQuote, rootDir, evidenceRoots) {
  const candidates = [resolve(rootDir, sourcePath)];
  for (const evidenceRoot of evidenceRoots) {
    candidates.push(resolve(evidenceRoot, sourcePath));
    candidates.push(resolve(evidenceRoot, relative(evidenceRoot, resolve(rootDir, sourcePath))));
  }
  const existing = [...new Set(candidates)].find((path) => existsSync(path) && statSync(path).isFile());
  if (!existing) return false;
  const content = readFileSync(existing, 'utf8');
  return content.includes(sourceQuote);
}

function loadAllowlist(rootDir, allowlistPath) {
  const resolved = resolve(rootDir, allowlistPath ?? 'docs/proof-vetting-allowlist.json');
  if (!existsSync(resolved)) return new Set();
  const parsed = JSON.parse(readFileSync(resolved, 'utf8'));
  const entries = Array.isArray(parsed) ? parsed : parsed.allowedClaims ?? [];
  return new Set(entries.map((entry) => typeof entry === 'string' ? entry : entry.id));
}

export function validateProofClaims({
  rootDir = process.cwd(),
  evidenceRoots = [],
  clientRoots = [],
  include = DEFAULT_INCLUDE,
  allowlistPath = 'docs/proof-vetting-allowlist.json',
} = {}) {
  const clientRegex = buildClientRegex(clientRoots);
  const allowlist = loadAllowlist(rootDir, allowlistPath);
  const claimFiles = listFiles(rootDir).filter((path) => matchesInclude(normalizeRel(relative(rootDir, path)), include));
  const claims = claimFiles.flatMap((path) => extractClaimsFromFile(path, rootDir, { evidenceRoots, clientRegex }));
  const failures = claims
    .map((claim) => ({ ...claim, id: hashClaim(claim.file, claim.text, claim.jsonPath ?? '') }))
    .filter((claim) => !claim.supported && !allowlist.has(claim.id))
    .map((claim) => ({
      id: claim.id,
      file: claim.file,
      line: claim.line,
      jsonPath: claim.jsonPath,
      claimText: claim.text,
      reason: 'missing sourcePath/sourceQuote or quote not found in source evidence',
    }));
  return { ok: failures.length === 0, checkedFiles: claimFiles.length, claimsFound: claims.length, failures };
}

function printResult(result) {
  if (result.ok) {
    console.log(`Proof claim validation passed: ${result.claimsFound} claims checked across ${result.checkedFiles} files.`);
    return;
  }
  console.error(`Proof claim validation failed: ${result.failures.length} unsupported claims.`);
  for (const failure of result.failures) {
    const location = failure.jsonPath ? `${failure.file}:${failure.jsonPath}` : `${failure.file}:${failure.line}`;
    console.error(`- [${failure.id}] ${location} — ${failure.claimText}`);
  }
}

function parseArgs(argv) {
  const args = { evidenceRoots: [], clientRoots: [], include: DEFAULT_INCLUDE };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root') args.rootDir = resolve(argv[++i]);
    else if (arg === '--evidence-root') args.evidenceRoots.push(resolve(argv[++i]));
    else if (arg === '--client-root') args.clientRoots.push(resolve(argv[++i]));
    else if (arg === '--allowlist') args.allowlistPath = argv[++i];
    else if (arg === '--include') args.include = argv[++i].split(',').map((item) => item.trim()).filter(Boolean);
  }
  return args;
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const result = validateProofClaims(parseArgs(process.argv.slice(2)));
  printResult(result);
  process.exit(result.ok ? 0 : 1);
}
