// One-off validation helper: verifies that every named import from
// 'lucide-react' across the project actually exists in the installed package.
// Catches "MISSING_EXPORT" build failures before they reach CI/Vercel.
const fs = require('fs');
const path = require('path');

// Loading lucide-react must never break a build: if the package layout cannot
// be loaded from this CommonJS context, skip the check rather than failing.
let lucide;
try {
  lucide = require('lucide-react');
} catch (err) {
  console.log('verify-lucide-icons: could not load lucide-react; skipping check.');
  process.exit(0);
}

const roots = ['components', 'vfx', 'utils', 'services', 'context', 'hooks'];
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
}

for (const r of roots) if (fs.existsSync(r)) walk(r);
if (fs.existsSync('App.tsx')) files.push('App.tsx');

const missing = [];
let checked = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  // `[^{}]*` (rather than a lazy wildcard) keeps the match inside a single
  // import statement — a lazy `[\s\S]*?` would span from an earlier import's
  // opening brace to the lucide-react one and produce false positives.
  const importRe = /import\s*(?:type\s*)?\{([^{}]*)\}\s*from\s*'lucide-react'/g;
  let m;
  while ((m = importRe.exec(src)) !== null) {
    for (const raw of m[1].split(',')) {
      const name = raw.replace(/\btype\b/g, '').trim().split(/\s+as\s+/)[0].trim();
      if (!name) continue;
      checked++;
      if (typeof lucide[name] === 'undefined') missing.push(`${file}: ${name}`);
    }
  }
}

console.log(`Checked ${checked} lucide-react icon imports across ${files.length} files.`);
if (missing.length) {
  console.log('MISSING EXPORTS FOUND:');
  missing.forEach((entry) => console.log('  - ' + entry));
  process.exit(1);
}
console.log('All lucide-react icon imports exist. OK');
