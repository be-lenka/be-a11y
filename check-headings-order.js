const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const allowedExtensions = ['.latte', '.html', '.php'];
const excludedDirs = ['node_modules', 'vendor', 'dist', 'build', 'temp', '.idea', 'nuton', 'belenka'];

function findFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludedDirs.includes(entry.name)) return [];
      return findFiles(fullPath);
    }
    if (allowedExtensions.includes(path.extname(entry.name))) return [fullPath];
    return [];
  });
}

function getLineNumber(content, tagIndex) {
  return content.slice(0, tagIndex).split('\n').length;
}

function checkHeadingOrder(content, file) {
  const $ = cheerio.load(content);
  let lastLevel = 0;
  const errors = [];

  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = parseInt(el.name.substring(1));
    const html = $.html(el);
    const tagIndex = content.indexOf(html); // rough but works
    const lineNumber = getLineNumber(content, tagIndex);

    if (lastLevel && level - lastLevel > 1) {
      errors.push({
        file,
        line: lineNumber,
        current: `<${el.name}>`,
        previous: `<h${lastLevel}>`,
      });
    }

    lastLevel = level;
  });

  return errors;
}

const files = findFiles('.');
let allErrors = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const errors = checkHeadingOrder(content, file);
  allErrors.push(...errors);
}

if (allErrors.length) {
  console.error('\n🚨 Heading Order Issues Found:\n');
  allErrors.forEach(({ file, line, current, previous }) => {
    console.error(`- ${file}:${line} – ${current} follows ${previous}`);
  });
  process.exit(1);
} else {
  console.log('✅ All heading orders look good!');
}
