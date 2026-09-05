import { access, readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIRECTORY = fileURLToPath(new URL('../', import.meta.url));
const DIST_DIRECTORY = join(ROOT_DIRECTORY, 'dist');
const DRACO_WRAPPER_PATH = join(DIST_DIRECTORY, 'draco', 'draco_wasm_wrapper.js');
const DRACO_WASM_PATH = join(DIST_DIRECTORY, 'draco', 'draco_decoder.wasm');
const DRACO_PACKAGE_DIRECTORY = join(ROOT_DIRECTORY, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf');
const SECURITY_TEXT_PATH = join(DIST_DIRECTORY, '.well-known', 'security.txt');
const IS_MAINTENANCE_BUILD = process.argv.includes('--maintenance');

const PUBLIC_HTML_DOCUMENTS = [
  'index.html',
  '404.html',
  'leistungsnachweise/index.html',
  'portfolio/index.html',
  'ueber-mich/index.html',
  'zertifikate/index.html'
];

const MAINTENANCE_HTML_DOCUMENTS = [
  'index.html',
  '404.html',
  'rechtliches.html'
];

const HTML_DOCUMENTS = IS_MAINTENANCE_BUILD
  ? MAINTENANCE_HTML_DOCUMENTS
  : PUBLIC_HTML_DOCUMENTS;

const SOURCE_ONLY_HTML_DOCUMENTS = [
  ['maintenance/index.html', join(ROOT_DIRECTORY, 'maintenance', 'index.html')],
  ['maintenance/rechtliches.html', join(ROOT_DIRECTORY, 'maintenance', 'rechtliches.html')]
];

const COMMON_CSP_DIRECTIVES = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'none'"
];

const TRACKER_PATTERNS = [
  /googletagmanager\.com/i,
  /google-analytics\.com/i,
  /doubleclick\.net/i,
  /connect\.facebook\.net/i,
  /clarity\.ms/i,
  /hotjar\.com/i,
  /plausible\.io/i,
  /matomo(?:\.cloud)?/i,
  /cdn\.segment\.com/i,
  /browser\.sentry-cdn\.com/i,
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i
];

const PDF_METADATA_PATTERN = /\/(?:Info|Metadata|Author|Creator|Producer|CreationDate|ModDate|Subject|Keywords)\b/;
const DOCUMENT_PREVIEW_PATTERN = /^(?:public\/assets\/leistungsnachweise|public\/zertifikate\/nachweise)\/.*\.png$/i;
const FORBIDDEN_PNG_METADATA_CHUNKS = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf']);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function decodeHtmlAttribute(value) {
  return value
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&');
}

function getPngChunkTypes(contents, displayPath) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(contents.subarray(0, signature.length).equals(signature), `${displayPath} is not a valid PNG file.`);
  const chunkTypes = [];
  let offset = signature.length;
  while (offset < contents.length) {
    assert(offset + 12 <= contents.length, `${displayPath} has a truncated PNG chunk.`);
    const length = contents.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    assert(chunkEnd <= contents.length, `${displayPath} has an invalid PNG chunk length.`);
    chunkTypes.push(contents.toString('ascii', offset + 4, offset + 8));
    offset = chunkEnd;
  }
  return chunkTypes;
}

function parseContentSecurityPolicy(documentPath, html) {
  const meta = html.match(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i)?.[0];
  assert(meta, `${documentPath} is missing a Content Security Policy meta element.`);

  const policy = decodeHtmlAttribute(meta.match(/\bcontent=(["'])([\s\S]*?)\1/i)?.[2] ?? '');
  assert(policy, `${documentPath} has an empty Content Security Policy.`);

  const directives = new Map();
  for (const segment of policy.split(';')) {
    const tokens = segment.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    directives.set(tokens[0].toLowerCase(), tokens.slice(1));
  }

  return { policy, directives };
}

function normalizeTextLineEndings(contents) {
  return contents.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

function hashInlineContent(contents) {
  const normalizedContents = normalizeTextLineEndings(contents);
  return `'sha256-${createHash('sha256').update(normalizedContents).digest('base64')}'`;
}

async function collectFiles(directoryPath) {
  const entries = await readdir(directoryPath);
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry);
    const entryStat = await stat(entryPath);
    if (entryStat.isDirectory()) {
      files.push(...await collectFiles(entryPath));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}

function assertDocumentPolicies(documentPath, html) {
  const normalizedHtml = decodeHtmlAttribute(html);
  const markupOnly = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
  const { policy, directives } = parseContentSecurityPolicy(documentPath, html);
  assert(
    /<meta\s+name=["']referrer["']\s+content=["']no-referrer["']/i.test(html),
    `${documentPath} must use the no-referrer policy.`
  );
  for (const directive of COMMON_CSP_DIRECTIVES) {
    assert(
      normalizedHtml.includes(directive),
      `${documentPath} is missing CSP directive: ${directive}`
    );
  }

  for (const requiredDirective of ['script-src', 'style-src', 'img-src', 'connect-src', 'worker-src', 'frame-src', 'media-src']) {
    assert(directives.has(requiredDirective), `${documentPath} is missing CSP directive: ${requiredDirective}`);
  }

  for (const [directiveName, tokens] of directives) {
    assert(!tokens.includes('*'), `${documentPath} allows a wildcard in ${directiveName}.`);
    assert(
      !tokens.some(token => /^(?:https?:|\/\/)/i.test(token)),
      `${documentPath} allows a remote source in ${directiveName}.`
    );
  }

  assert(
    !directives.get('script-src')?.includes("'unsafe-inline'"),
    `${documentPath} permits unsafe-inline JavaScript.`
  );
  assert(
    !directives.get('script-src')?.includes("'unsafe-eval'"),
    `${documentPath} permits unsafe-eval JavaScript.`
  );
  assert(
    !directives.get('style-src')?.includes("'unsafe-inline'"),
    `${documentPath} permits unrestricted inline styles.`
  );

  assert(!/<form\b/i.test(html), `${documentPath} unexpectedly contains a form.`);
  assert(!/\son[a-z]+\s*=/i.test(markupOnly), `${documentPath} contains an inline event handler.`);
  assert(!/\sstyle\s*=/i.test(markupOnly), `${documentPath} contains an inline style attribute.`);

  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    const requiredHash = hashInlineContent(match[1]);
    assert(
      directives.get('script-src')?.includes(requiredHash),
      `${documentPath} contains inline JavaScript without the exact CSP hash ${requiredHash}.`
    );
  }

  for (const match of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const requiredHash = hashInlineContent(match[1]);
    assert(
      directives.get('style-src')?.includes(requiredHash),
      `${documentPath} contains an inline style block without the exact CSP hash ${requiredHash}.`
    );
  }

  for (const match of html.matchAll(/<(?:script|link|img|iframe|audio|video|source|object|embed)\b[^>]*\b(?:src|href|data)=["']([^"']+)["']/gi)) {
    const resourceUrl = decodeHtmlAttribute(match[1]).trim();
    assert(
      !/^(?:https?:)?\/\//i.test(resourceUrl),
      `${documentPath} loads a remote runtime resource: ${resourceUrl}`
    );
  }

  for (const match of html.matchAll(/<a\b([^>]*\btarget=["']_blank["'][^>]*)>/gi)) {
    const attributes = match[1];
    const rel = attributes.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? '';
    assert(
      rel.split(/\s+/).includes('noopener') && rel.split(/\s+/).includes('noreferrer'),
      `${documentPath} has a target=_blank link without noopener noreferrer.`
    );
  }
}

await Promise.all([
  access(SECURITY_TEXT_PATH),
  ...(IS_MAINTENANCE_BUILD ? [] : [access(DRACO_WRAPPER_PATH), access(DRACO_WASM_PATH)])
]);

if (!IS_MAINTENANCE_BUILD) {
  const dracoPairs = [
    [DRACO_WRAPPER_PATH, join(DRACO_PACKAGE_DIRECTORY, 'draco_wasm_wrapper.js'), true],
    [DRACO_WASM_PATH, join(DRACO_PACKAGE_DIRECTORY, 'draco_decoder.wasm'), false]
  ];

  for (const [distPath, packagePath, normalizeLineEndings] of dracoPairs) {
    const [distContents, packageContents] = await Promise.all([
      readFile(distPath),
      readFile(packagePath)
    ]);
    const matchesPackage = normalizeLineEndings
      ? normalizeTextLineEndings(distContents.toString('utf8'))
        === normalizeTextLineEndings(packageContents.toString('utf8'))
      : distContents.equals(packageContents);
    assert(
      matchesPackage,
      `${relative(DIST_DIRECTORY, distPath)} does not match the lockfile-bound Three.js Draco decoder.`
    );
  }
}

const htmlDocuments = await Promise.all(
  HTML_DOCUMENTS.map(async documentPath => [
    documentPath,
    await readFile(join(DIST_DIRECTORY, documentPath), 'utf8')
  ])
);

if (!IS_MAINTENANCE_BUILD) {
  for (const [documentPath, sourcePath] of SOURCE_ONLY_HTML_DOCUMENTS) {
    htmlDocuments.push([documentPath, await readFile(sourcePath, 'utf8')]);
  }
}

for (const [documentPath, html] of htmlDocuments) {
  assertDocumentPolicies(documentPath, html);
}

const securityText = await readFile(SECURITY_TEXT_PATH, 'utf8');
assert(/^Contact:\s*mailto:/mi.test(securityText), 'security.txt is missing a mail contact.');
assert(/^Expires:\s*\d{4}-\d{2}-\d{2}T/mi.test(securityText), 'security.txt is missing an expiry date.');
assert(/^Canonical:\s*https:\/\//mi.test(securityText), 'security.txt is missing its HTTPS canonical URL.');

const distFiles = await collectFiles(DIST_DIRECTORY);
const discoveredHtmlDocuments = distFiles
  .filter(file => /\.html$/i.test(file))
  .map(file => relative(DIST_DIRECTORY, file).replaceAll('\\', '/'))
  .sort();
const expectedHtmlDocuments = [...HTML_DOCUMENTS].sort();
assert(
  JSON.stringify(discoveredHtmlDocuments) === JSON.stringify(expectedHtmlDocuments),
  `Unexpected HTML output. Expected ${expectedHtmlDocuments.join(', ')}, found ${discoveredHtmlDocuments.join(', ')}.`
);
assert(
  !distFiles.some(file => /\.map$/i.test(file)),
  'Production output contains source maps.'
);

const textFiles = distFiles.filter(file => /\.(?:css|html|js|json|txt)$/i.test(file));
for (const file of textFiles) {
  const contents = await readFile(file, 'utf8');
  const displayPath = relative(DIST_DIRECTORY, file);

  assert(
    !/https?:\/\/www\.gstatic\.com\/draco/i.test(contents),
    `Third-party Draco URL found in built output: ${displayPath}`
  );

  for (const trackerPattern of TRACKER_PATTERNS) {
    assert(
      !trackerPattern.test(contents),
      `Tracking or remote-font endpoint found in built output: ${displayPath}`
    );
  }

  if (/\.css$/i.test(file)) {
    assert(
      !/url\(\s*["']?(?:https?:)?\/\//i.test(contents),
      `Remote CSS asset found in built output: ${displayPath}`
    );
  }
}

const publicFiles = await collectFiles(join(ROOT_DIRECTORY, 'public'));
for (const file of publicFiles) {
  const contents = await readFile(file);
  const displayPath = relative(ROOT_DIRECTORY, file).replaceAll('\\', '/');
  assert(
    !contents.includes(Buffer.from('C:\\Users\\')),
    `Public asset leaks a local Windows user path: ${displayPath}`
  );
  if (/\.pdf$/i.test(file)) {
    assert(
      !PDF_METADATA_PATTERN.test(contents.toString('latin1')),
      `Published PDF contains document metadata: ${displayPath}`
    );
  }
  if (DOCUMENT_PREVIEW_PATTERN.test(displayPath)) {
    const chunkTypes = getPngChunkTypes(contents, displayPath);
    const forbiddenChunk = chunkTypes.find(type => FORBIDDEN_PNG_METADATA_CHUNKS.has(type));
    assert(!forbiddenChunk, `Published document preview contains ${forbiddenChunk} metadata: ${displayPath}`);
  }
}

const privacySensitiveSources = [
  join(ROOT_DIRECTORY, 'src'),
  join(ROOT_DIRECTORY, 'public')
];

for (const sourceDirectory of privacySensitiveSources) {
  const sourceFiles = (await collectFiles(sourceDirectory)).filter(file => {
    if (!/\.(?:html|js|ts)$/i.test(file)) return false;
    return !relative(ROOT_DIRECTORY, file).replaceAll('\\', '/').startsWith('public/draco/');
  });
  for (const file of sourceFiles) {
    const contents = await readFile(file, 'utf8');
    const displayPath = relative(ROOT_DIRECTORY, file);
    assert(
      !/\b(?:localStorage|sessionStorage|indexedDB|sendBeacon)\b|document\.cookie/i.test(contents),
      `Persistent client storage or beacon API found without a privacy review: ${displayPath}`
    );
    assert(
      !/(?:fetch\s*\(|new\s+(?:WebSocket|EventSource)\s*\()\s*["'`](?:https?:)?\/\//i.test(contents),
      `External runtime network API found without a privacy review: ${displayPath}`
    );
  }
}

console.log(
  `Static security checks passed for ${htmlDocuments.length} documents: strict CSP, exact inline hashes, no-referrer, local runtime assets, no trackers, no forms, no client storage, no source maps, sanitized published documents, no local path leaks${IS_MAINTENANCE_BUILD ? '' : ', self-hosted Draco'} and security.txt.`
);
