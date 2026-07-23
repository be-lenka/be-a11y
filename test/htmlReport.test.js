const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const tinycolor = require("tinycolor2");
const { analyzeContent, scanPath, buildReport } = require("..");
const { renderHtmlReport, PALETTE } = require("../src/utils/htmlReport");

const VIOL = path.join(__dirname, "fixtures", "violations");
const TS = "2026-07-19T09:30:00.000Z";

/** Runs `fn` with stderr suppressed (rule-crash / unknown-type diagnostics). */
function quiet(fn) {
  const orig = process.stderr.write;
  process.stderr.write = () => true;
  try {
    return fn();
  } finally {
    process.stderr.write = orig;
  }
}

/** Renders a report for hand-built issues with a stable timestamp. */
function render(issues, meta = {}) {
  return renderHtmlReport(
    buildReport(issues, { target: "site/", filesScanned: 1, timestamp: TS, ...meta })
  );
}

/** Slice of the rendered page from `id="…"` to the enclosing section's end. */
function sectionFor(out, id) {
  const start = out.indexOf(`id="${id}"`);
  assert.notStrictEqual(start, -1, `section ${id} present`);
  return out.slice(start, out.indexOf("</section>", start));
}

test("renders a full standalone HTML document", () => {
  const out = render([{ file: "a.html", line: 1, type: "missing-alt", message: "m" }]);
  assert.match(out, /^<!doctype html>/i);
  assert.ok(out.includes('<html lang="en">'));
  assert.match(out, /<title>[^<]+<\/title>/);
  assert.ok(out.trimEnd().endsWith("</html>"));
});

test("escapes report data everywhere; script block stays unique", () => {
  const out = render([
    {
      file: "a.html",
      line: 2,
      type: "missing-alt",
      message: '<script>alert("x")</script>',
      snippet: "</script>{{ x }}'\" <marquee>",
    },
  ]);
  assert.ok(out.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"));
  assert.ok(!out.includes("<script>alert"));
  assert.strictEqual(out.split("</script>").length, 2, "only the renderer's own script tag");
});

test("clean report: hero, no table/details/search, filesScanned shown", () => {
  const out = renderHtmlReport(
    buildReport([], { target: "site/", filesScanned: 3, timestamp: TS })
  );
  assert.ok(out.includes("No accessibility issues found."));
  assert.ok(!out.includes("<table"));
  assert.ok(!out.includes("<details"));
  assert.ok(!out.includes("<input"), "no search input in the clean state");
  assert.match(out, /<dt>Files scanned<\/dt><dd>3<\/dd>/);
});

test("per-section counts and severity/WCAG badges", () => {
  const out = render([
    { file: "a.html", line: 1, type: "missing-alt", message: "one" },
    { file: "a.html", line: 2, type: "missing-alt", message: "two" },
    { file: "a.html", line: 3, type: "alt-too-long", message: "long" },
  ]);
  const missingAlt = sectionFor(out, "type-missing-alt");
  assert.ok(missingAlt.includes("2 issues"));
  assert.ok(missingAlt.includes('<span class="badge badge-error">error</span>'));
  assert.ok(missingAlt.includes("WCAG 1.1.1"));
  const tooLong = sectionFor(out, "type-alt-too-long");
  assert.ok(tooLong.includes("1 issue<"));
  assert.ok(tooLong.includes('<span class="badge badge-warning">warning</span>'));
  assert.ok(tooLong.includes("Best practice"));
});

test("anchor ids are unique and the files table links into them", () => {
  const out = render([
    { file: "a.html", line: 1, type: "missing-alt", message: "m" },
    { file: "b.html", line: 1, type: "missing-alt", message: "m" },
  ]);
  assert.strictEqual(out.split('id="type-missing-alt"').length, 2, "id emitted exactly once");
  assert.ok(out.includes('<a href="#type-missing-alt">'));
});

test("unknown type: sanitized id, raw label, no hint, no crash", () => {
  const out = render([
    { file: "a.html", line: 1, type: "weird <type>!", message: "m" },
    { file: "a.html", line: 2, type: "weird type ", message: "m" },
  ]);
  const section = sectionFor(out, "type-weird-type");
  assert.ok(section.includes("weird &lt;type&gt;!"));
  assert.ok(!section.includes('class="hint"'), "no hint paragraph for unknown types");
  assert.ok(out.includes('id="type-weird-type-2"'), "colliding slug deduplicated");
});

test("null snippet/hint render nothing; null line renders file only", () => {
  const out = render([
    { file: "a.html", line: null, type: "custom-x", message: "m", snippet: null },
  ]);
  const section = sectionFor(out, "type-custom-x");
  assert.ok(!section.includes("<pre>"));
  assert.ok(!section.includes('class="hint"'));
  assert.ok(section.includes('<span class="loc mono">a.html</span>'));
});

test("timestamp: <time datetime> for ISO input, garbage stays inert", () => {
  const out = render([]);
  assert.ok(out.includes(`<time datetime="${TS}">19 Jul 2026, 09:30 UTC</time>`));
  const garbage = renderHtmlReport(
    buildReport([], { target: "x", filesScanned: 1, timestamp: "not-a-date" })
  );
  assert.ok(garbage.includes("not-a-date"));
  assert.ok(!garbage.includes("<time"), "unparsable timestamp gets no <time> element");
});

test("URL-as-file issues render; data-severity attributes present", () => {
  const out = render([
    { file: "https://example.com/page?a=1&b=2", line: 4, type: "missing-alt", message: "m" },
    { file: "https://example.com/page?a=1&b=2", line: 5, type: "alt-too-long", message: "m" },
  ]);
  assert.ok(out.includes("https://example.com/page?a=1&amp;b=2"));
  assert.ok(out.includes('<li data-severity="error">'));
  assert.ok(out.includes('<li data-severity="warning">'));
});

test("dogfood: a clean report passes be-a11y", () => {
  const html = renderHtmlReport(buildReport([], { target: "x", filesScanned: 2, timestamp: TS }));
  assert.deepStrictEqual(quiet(() => analyzeContent(html, "report.html")), []);
});

test("dogfood: the violations-fixture report passes be-a11y", () => {
  const { issues, filesScanned } = scanPath(VIOL);
  assert.ok(issues.length > 0, "fixture actually has issues");
  const html = renderHtmlReport(
    buildReport(issues, { target: VIOL, filesScanned, timestamp: TS })
  );
  assert.deepStrictEqual(quiet(() => analyzeContent(html, "report.html")), []);
});

test("dogfood: hostile report data cannot break the page's own audit", () => {
  const nasty = [
    {
      file: "C:\\site\\{page}.html",
      line: 3,
      type: "missing-alt",
      message: '<script>alert("x")</script> {{ template }} {% if %} ${x}',
      snippet: "</script>'\" <marquee><img src=x>",
    },
    {
      file: "a.html",
      line: null,
      type: "weird <type>!",
      message: 'quotes \' " and <head> and <a target="_blank">',
      snippet: '<a target="_blank" href="x">x</a>',
    },
  ];
  const html = renderHtmlReport(
    buildReport(nasty, { target: "C:\\site\\{dir}", filesScanned: 2, timestamp: TS })
  );
  assert.deepStrictEqual(quiet(() => analyzeContent(html, "report.html")), []);
});

test("palette: every text/surface pair meets WCAG AA (4.5:1)", () => {
  for (const [scheme, def] of Object.entries(PALETTE)) {
    for (const [surface, bg] of Object.entries(def.surfaces)) {
      for (const [name, color] of Object.entries(def.text)) {
        const ratio = tinycolor.readability(bg, color);
        assert.ok(
          ratio >= 4.5,
          `${scheme}.${name} on ${scheme}.${surface}: ${ratio.toFixed(2)}:1 < 4.5:1`
        );
      }
    }
  }
});
