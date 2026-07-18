const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/mediaCaptions");

test("a video without captions is flagged", () => {
  assert.strictEqual(rule('<video src="v.mp4"></video>', "f")[0].type, "media-captions");
});

test("a video with a captions track passes", () => {
  assert.strictEqual(
    rule('<video src="v.mp4"><track kind="captions" src="c.vtt"></video>', "f").length,
    0
  );
});

test("audio is flagged (needs a transcript)", () => {
  assert.strictEqual(rule('<audio src="a.mp3"></audio>', "f").length, 1);
});

test("a hidden video is skipped", () => {
  assert.strictEqual(rule('<video src="v.mp4" aria-hidden="true"></video>', "f").length, 0);
});
