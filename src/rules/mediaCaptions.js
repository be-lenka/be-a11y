const { loadDocument, getLine } = require("../utils/dom");
const { isHidden } = require("../utils/visibility");

/**
 * Warns about media without a text alternative: a non-hidden <video> lacking a
 * captions/subtitles <track>, and any non-hidden <audio> (which needs a
 * transcript). Warnings because captions/transcripts may live outside the
 * markup; the rule is toggleable.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} media-captions issues.
 */
module.exports = function mediaCaptions(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("video").each((_, el) => {
    if (isHidden($, el)) return;
    const hasCaptions = $(el)
      .find("track")
      .toArray()
      .some((t) => {
        const kind = ($(t).attr("kind") || "").trim().toLowerCase();
        return kind === "captions" || kind === "subtitles";
      });
    if (!hasCaptions) {
      errors.push({
        file,
        line: getLine($, el, content),
        type: "media-captions",
        message: `<video> has no captions/subtitles track; add <track kind="captions">`,
      });
    }
  });

  $("audio").each((_, el) => {
    if (isHidden($, el)) return;
    errors.push({
      file,
      line: getLine($, el, content),
      type: "media-captions",
      message: `<audio> needs a text alternative (transcript) for users who cannot hear it`,
    });
  });

  return errors;
};
