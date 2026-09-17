/* Shared character logic. Plain script, no modules — both pages pull from window.SI. */
(function (global) {
  var CP_NAMES = {
    0x00AD: 'SOFT HYPHEN',
    0x034F: 'COMBINING GRAPHEME JOINER',
    0x061C: 'ARABIC LETTER MARK',
    0x180B: 'MONGOLIAN FREE VARIATION SELECTOR ONE',
    0x180C: 'MONGOLIAN FREE VARIATION SELECTOR TWO',
    0x180D: 'MONGOLIAN FREE VARIATION SELECTOR THREE',
    0x200B: 'ZERO WIDTH SPACE',
    0x200C: 'ZERO WIDTH NON-JOINER',
    0x200D: 'ZERO WIDTH JOINER',
    0x200E: 'LEFT-TO-RIGHT MARK',
    0x200F: 'RIGHT-TO-LEFT MARK',
    0x2013: 'EN DASH',
    0x2014: 'EM DASH',
    0x2018: 'LEFT SINGLE QUOTATION MARK',
    0x2019: 'RIGHT SINGLE QUOTATION MARK',
    0x201A: 'SINGLE LOW-9 QUOTATION MARK',
    0x201B: 'SINGLE HIGH-REVERSED-9 QUOTATION MARK',
    0x201C: 'LEFT DOUBLE QUOTATION MARK',
    0x201D: 'RIGHT DOUBLE QUOTATION MARK',
    0x201E: 'DOUBLE LOW-9 QUOTATION MARK',
    0x201F: 'DOUBLE HIGH-REVERSED-9 QUOTATION MARK',
    0x2026: 'HORIZONTAL ELLIPSIS',
    0x202A: 'LEFT-TO-RIGHT EMBEDDING',
    0x202B: 'RIGHT-TO-LEFT EMBEDDING',
    0x202C: 'POP DIRECTIONAL FORMATTING',
    0x202D: 'LEFT-TO-RIGHT OVERRIDE',
    0x202E: 'RIGHT-TO-LEFT OVERRIDE',
    0x202F: 'NARROW NO-BREAK SPACE',
    0x2032: 'PRIME',
    0x2033: 'DOUBLE PRIME',
    0x205F: 'MEDIUM MATHEMATICAL SPACE',
    0x2060: 'WORD JOINER',
    0x2066: 'LEFT-TO-RIGHT ISOLATE',
    0x2067: 'RIGHT-TO-LEFT ISOLATE',
    0x2068: 'FIRST STRONG ISOLATE',
    0x2069: 'POP DIRECTIONAL ISOLATE',
    0x2E3A: 'TWO-EM DASH',
    0x2E3B: 'THREE-EM DASH',
    0x3000: 'IDEOGRAPHIC SPACE',
    0xFEFF: 'ZERO WIDTH NO-BREAK SPACE',
    0xFFF9: 'INTERLINEAR ANNOTATION ANCHOR',
    0xFFFA: 'INTERLINEAR ANNOTATION SEPARATOR',
    0xFFFB: 'INTERLINEAR ANNOTATION TERMINATOR'
  };

  var ALWAYS = [0x00AD, 0x034F, 0x200B, 0x2060, 0xFEFF, 0xFFF9, 0xFFFA, 0xFFFB];

  var AGGRESSIVE = [
    0x061C, 0x180B, 0x180C, 0x180D,
    0x200C, 0x200D, 0x200E, 0x200F,
    0x202A, 0x202B, 0x202C, 0x202D, 0x202E,
    0x2066, 0x2067, 0x2068, 0x2069
  ];

  var TYPO = new Map([
    [0x2018, "'"], [0x2019, "'"], [0x201A, "'"], [0x201B, "'"],
    [0x201C, '"'], [0x201D, '"'], [0x201E, '"'], [0x201F, '"'],
    [0x2026, '...'], [0x2013, '-'], [0x2032, "'"], [0x2033, '"']
  ]);

  var EM = [0x2014, 0x2E3A, 0x2E3B];

  function cpHex(cp) {
    var h = cp.toString(16).toUpperCase();
    while (h.length < 4) h = '0' + h;
    return 'U+' + h;
  }

  function cpName(cp) {
    if (CP_NAMES[cp]) return CP_NAMES[cp];
    if (cp === 0xE0001) return 'LANGUAGE TAG';
    if (cp >= 0xE0020 && cp <= 0xE007F) return 'TAG CHARACTER';
    if (cp >= 0xFE00 && cp <= 0xFE0F) return 'VARIATION SELECTOR';
    if (cp >= 0xE0100 && cp <= 0xE01EF) return 'VARIATION SELECTOR SUPPLEMENT';
    if (cp >= 0xE000 && cp <= 0xF8FF) return 'PRIVATE USE';
    if (cp >= 0xF0000 && cp <= 0xFFFFD) return 'PRIVATE USE PLANE 15';
    if (cp >= 0x100000 && cp <= 0x10FFFD) return 'PRIVATE USE PLANE 16';
    if (cp >= 0x2000 && cp <= 0x200A) return 'SPACE';
    if (cp === 0x00A0) return 'NO-BREAK SPACE';
    return '';
  }

  function isTag(cp) {
    return cp === 0xE0001 || (cp >= 0xE0020 && cp <= 0xE007F);
  }

  function isPUA(cp) {
    return (cp >= 0xE000 && cp <= 0xF8FF) ||
           (cp >= 0xF0000 && cp <= 0xFFFFD) ||
           (cp >= 0x100000 && cp <= 0x10FFFD);
  }

  function isVS(cp) {
    return (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF);
  }

  function isExoticSpace(cp) {
    return cp === 0x00A0 || (cp >= 0x2000 && cp <= 0x200A) ||
           cp === 0x202F || cp === 0x205F || cp === 0x3000;
  }

  /* Always-invisible: would be caught even with every option off. */
  function isInvisible(cp) {
    return ALWAYS.indexOf(cp) !== -1 || isTag(cp) || isPUA(cp);
  }

  /* Invisible only when aggressive mode is on. */
  function isConditionallyInvisible(cp) {
    return AGGRESSIVE.indexOf(cp) !== -1 || isVS(cp);
  }

  function cleanText(input, opts) {
    opts = opts || {};
    var aggressive = !!opts.aggressive;
    var spaces = !!opts.spaces;
    var typography = !!opts.typography;
    var emdash = opts.emdash || 'keep';

    var removed = new Map();
    var out = '';

    function tally(cp) { removed.set(cp, (removed.get(cp) || 0) + 1); }

    for (var i = 0; i < input.length;) {
      var cp = input.codePointAt(i);
      var ch = String.fromCodePoint(cp);
      i += ch.length;

      if (ALWAYS.indexOf(cp) !== -1 || isTag(cp) || isPUA(cp)) { tally(cp); continue; }

      if (aggressive && (AGGRESSIVE.indexOf(cp) !== -1 || isVS(cp))) { tally(cp); continue; }

      if (spaces && isExoticSpace(cp)) { tally(cp); out += ' '; continue; }

      if (typography && TYPO.has(cp)) { tally(cp); out += TYPO.get(cp); continue; }

      if (EM.indexOf(cp) !== -1 && emdash !== 'keep') {
        tally(cp);
        if (emdash === 'replace') out += '-';
        continue;
      }

      out += ch;
    }

    return { text: out, removed: removed, before: input.length, after: out.length };
  }

  global.SI = {
    cpHex: cpHex,
    cpName: cpName,
    isTag: isTag,
    isPUA: isPUA,
    isVS: isVS,
    isExoticSpace: isExoticSpace,
    isInvisible: isInvisible,
    isConditionallyInvisible: isConditionallyInvisible,
    cleanText: cleanText,
    ALWAYS: ALWAYS,
    AGGRESSIVE: AGGRESSIVE,
    EM: EM
  };
})(window);
