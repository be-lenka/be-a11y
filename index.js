const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const tinycolor = require('tinycolor2');
const chalk = require('chalk');
const fetch = require('node-fetch'); // v2 for CommonJS

const allowedExtensions = ['.latte', '.html', '.php', '.twig', '.edge'];
const excludedDirs = ['node_modules', 'vendor', 'dist', 'build', 'temp', '.idea', 'nuton', 'belenka'];

const input = process.argv[2];
const outputJson = process.argv[3];

if (!input) {
  console.error(chalk.red('Please provide a directory path or URL as the first argument.'));
  process.exit(1);
}

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
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    if (lastLevel && level - lastLevel > 1) {
      errors.push({
        file,
        line: lineNumber,
        type: 'heading-order',
        message: `<${el.name}> follows <h${lastLevel}>`,
      });
    }

    lastLevel = level;
  });

  return errors;
}

function checkAltAttributes(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $('img').each((_, el) => {
    if (!$(el).attr('alt')) {
      const html = $.html(el);
      const tagIndex = content.indexOf(html);
      const lineNumber = getLineNumber(content, tagIndex);
      errors.push({
        file,
        line: lineNumber,
        type: 'missing-alt',
        message: `<img> tag is missing an alt attribute`,
      });
    }
  });

  return errors;
}

function checkAriaLabels(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $('[aria-label], [aria-labelledby]').each((_, el) => {
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    if ($(el).attr('aria-label') && $(el).attr('aria-label').trim() === '') {
      errors.push({
        file,
        line: lineNumber,
        type: 'aria-invalid',
        message: `aria-label is empty`,
      });
    }

    if ($(el).attr('aria-labelledby')) {
      const id = $(el).attr('aria-labelledby');
      if (!$(`#${id}`).length) {
        errors.push({
          file,
          line: lineNumber,
          type: 'aria-invalid',
          message: `aria-labelledby references a non-existent ID: ${id}`,
        });
      }
    }
  });

  return errors;
}

function checkMissingAria(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  const selectors = [
    'button',
    'a[href]',
    'input[type="text"]',
    'svg',
    'form',
    'section',
    'nav',
    'aside',
    'main',
    'dialog',
  ];

  $(selectors.join(',')).each((_, el) => {
    const $el = $(el);
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    const hasAria = $el.attr('aria-label') || $el.attr('aria-labelledby');
    const hasText = $el.text().trim().length > 0;

    if (!hasAria && !hasText) {
      errors.push({
        file,
        line: lineNumber,
        type: 'missing-aria',
        message: `<${el.name}> element should have an aria-label or visible text`,
      });
    }
  });

  return errors;
}

function checkContrast(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $('*').each((_, el) => {
    const style = $(el).attr('style');
    if (style && style.includes('color') && style.includes('background-color')) {
      const inlineStyles = style.split(';').reduce((acc, rule) => {
        const [key, value] = rule.split(':');
        if (key && value) acc[key.trim()] = value.trim();
        return acc;
      }, {});

      const fg = tinycolor(inlineStyles['color']);
      const bg = tinycolor(inlineStyles['background-color']);

      if (fg.isValid() && bg.isValid()) {
        const contrast = tinycolor.readability(bg, fg);
        if (contrast < 4.5) {
          const html = $.html(el);
          const tagIndex = content.indexOf(html);
          const lineNumber = getLineNumber(content, tagIndex);
          errors.push({
            file,
            line: lineNumber,
            type: 'contrast',
            message: `Low contrast ratio (${contrast.toFixed(2)}): ${inlineStyles['color']} on ${inlineStyles['background-color']}`,
          });
        }
      }
    }
  });

  return errors;
}

function groupErrors(errors) {
  return errors.reduce((acc, error) => {
    if (!acc[error.type]) acc[error.type] = [];
    acc[error.type].push(error);
    return acc;
  }, {});
}

function printErrors(errors) {
  const grouped = groupErrors(errors);
  const typeLabels = {
    'heading-order': chalk.yellow.bold('📐 Heading Order'),
    'missing-alt': chalk.cyan.bold('🖼️ Missing ALT'),
    'aria-invalid': chalk.magenta.bold('♿ ARIA Issues'),
    'missing-aria': chalk.blue.bold('👀 Missing ARIA'),
    'contrast': chalk.red.bold('🎨 Contrast Issues'),
  };

  console.error(chalk.red('\n🚨 Accessibility Issues Found:\n'));
  for (const [type, list] of Object.entries(grouped)) {
    console.log(`\n${typeLabels[type] || chalk.white.bold(type)}`);
    for (const { file, line, message } of list) {
      console.log(`  ${chalk.gray('-')} ${chalk.green(file)}:${chalk.yellow(line)} – ${chalk.white(message)}`);
    }
  }
}

function exportToJson(errors, outputPath) {
  try {
    fs.writeFileSync(outputPath, JSON.stringify(errors, null, 2), 'utf-8');
    console.log(chalk.blue(`📦 Results exported to ${outputPath}`));
  } catch (err) {
    console.error(chalk.red(`Failed to export JSON: ${err.message}`));
  }
}

async function analyzeContent(content, label) {
  const errors = [
    ...checkHeadingOrder(content, label),
    ...checkAltAttributes(content, label),
    ...checkAriaLabels(content, label),
    ...checkMissingAria(content, label),
    ...checkContrast(content, label),
  ];

  if (errors.length > 0) {
    printErrors(errors);
    if (outputJson) exportToJson(errors, outputJson);
    process.exit(1);
  } else {
    console.log(chalk.green.bold('✅ No accessibility issues found!'));
  }
}

(async () => {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const res = await fetch(input);
      const html = await res.text();
      await analyzeContent(html, input);
    } catch (err) {
      console.error(chalk.red(`Failed to load URL: ${err.message}`));
      process.exit(1);
    }
  } else if (fs.existsSync(input) && fs.statSync(input).isDirectory()) {
    const files = findFiles(input);
    let allErrors = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      allErrors.push(
        ...checkHeadingOrder(content, file),
        ...checkAltAttributes(content, file),
        ...checkAriaLabels(content, file),
        ...checkMissingAria(content, file),
        ...checkContrast(content, file)
      );
    }

    if (allErrors.length) {
      printErrors(allErrors);
      if (outputJson) exportToJson(allErrors, outputJson);
      process.exit(1);
    } else {
      console.log(chalk.green.bold('✅ No accessibility issues found!'));
    }
  } else {
    console.error(chalk.red('Invalid input. Please provide a valid folder or URL.'));
    process.exit(1);
  }
})();
