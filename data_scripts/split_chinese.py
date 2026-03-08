#!/usr/bin/env python3
"""Split Chinese.txt into Simplified and Traditional Chinese packs.

Uses OpenCC to classify characters and convert between scripts.
"""

import os
from opencc import OpenCC

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PACKS_DIR = os.path.join(SCRIPT_DIR, '..', 'updated_language_packs')
INPUT = os.path.join(PACKS_DIR, 'Chinese.txt')
OUT_SIMP = os.path.join(PACKS_DIR, 'Chinese_Simplified.txt')
OUT_TRAD = os.path.join(PACKS_DIR, 'Chinese_Traditional.txt')

t2s = OpenCC('t2s')  # Traditional → Simplified
s2t = OpenCC('s2t')  # Simplified → Traditional


def is_simplified(word):
    """A word is simplified if converting it t2s leaves it unchanged."""
    return t2s.convert(word) == word


def is_traditional(word):
    """A word is traditional if converting it s2t leaves it unchanged."""
    return s2t.convert(word) == word


def classify(word):
    """Return 'shared', 'simp', 'trad', or 'both' (has mixed chars)."""
    simp = is_simplified(word)
    trad = is_traditional(word)
    if simp and trad:
        return 'shared'
    if simp:
        return 'simp'
    if trad:
        return 'trad'
    return 'both'  # mixed chars (shouldn't normally happen)


def filter_words(words, script):
    """Filter a list of words, keeping those that belong to the given script.

    script: 'simp' or 'trad'
    Keeps words that are 'shared' or match the target script.
    """
    result = []
    for w in words:
        c = classify(w)
        if c == 'shared' or c == script:
            result.append(w)
        elif c == 'both':
            # Mixed: convert to target script
            if script == 'simp':
                result.append(t2s.convert(w))
            else:
                result.append(s2t.convert(w))
    return result


def convert_word(word, script):
    """Convert a word to the target script."""
    if script == 'simp':
        return t2s.convert(word)
    else:
        return s2t.convert(word)


def dedupe(words):
    """Deduplicate while preserving order."""
    seen = set()
    result = []
    for w in words:
        if w not in seen:
            seen.add(w)
            result.append(w)
    return result


def process_line(line, script):
    """Process a single line for the given script ('simp' or 'trad').

    Returns the processed line string.
    """
    line = line.rstrip('\n').rstrip('\r')

    # Divider line (just --)
    if line == '--':
        return '--'

    # ERROR lines
    if line == 'ERROR':
        return 'ERROR'

    # Parse: BestWord#alt1$alt2$... or --#alt1$alt2$...
    if '#' in line:
        parts = line.split('#', 1)
        best = parts[0]
        alts = parts[1].split('$') if parts[1] else []

        all_words = alts  # alternatives
        has_best = best != '--'

        if has_best:
            all_words_with_best = [best] + alts
        else:
            all_words_with_best = alts

        # Filter words for this script
        filtered = filter_words(all_words_with_best if has_best else alts, script)
        filtered = dedupe(filtered)

        # Fallback: if filtering removed everything, convert from all words
        if not filtered:
            converted = dedupe([convert_word(w, script) for w in (all_words_with_best if has_best else alts)])
            filtered = converted

        if has_best:
            # Determine best word for this script
            best_class = classify(best)
            if best_class == 'shared' or best_class == script:
                new_best = best
            else:
                new_best = convert_word(best, script)

            # Remove best from alternatives if it's there
            remaining = [w for w in filtered if w != new_best]
            if remaining:
                return new_best + '#' + '$'.join(remaining)
            else:
                return new_best
        else:
            # --#alts format
            if filtered:
                return '--#' + '$'.join(filtered)
            else:
                return '--'

    # Plain word (no # separator)
    c = classify(line)
    if c == 'shared' or c == script:
        return line
    else:
        return convert_word(line, script)


def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    simp_lines = []
    trad_lines = []

    for line in lines:
        simp_lines.append(process_line(line, 'simp'))
        trad_lines.append(process_line(line, 'trad'))

    # Write output files
    with open(OUT_SIMP, 'w', encoding='utf-8') as f:
        f.write('\n'.join(simp_lines))

    with open(OUT_TRAD, 'w', encoding='utf-8') as f:
        f.write('\n'.join(trad_lines))

    # Verify line counts
    expected = len(lines)
    assert len(simp_lines) == expected, f"Simplified has {len(simp_lines)} lines, expected {expected}"
    assert len(trad_lines) == expected, f"Traditional has {len(trad_lines)} lines, expected {expected}"

    print(f"Done! Generated {len(simp_lines)} lines each.")
    print(f"  Simplified: {OUT_SIMP}")
    print(f"  Traditional: {OUT_TRAD}")

    # Spot checks
    spot_check(simp_lines, trad_lines)


def spot_check(simp_lines, trad_lines):
    """Print a few lines for manual verification."""
    # Line 19 (0-indexed 18): 他們#她們$他们$它们$它們$她们$他$他們
    idx = 18
    print(f"\nSpot check line {idx+1}:")
    print(f"  Simplified:  {simp_lines[idx]}")
    print(f"  Traditional: {trad_lines[idx]}")

    # Check a few lines for script purity
    print("\nScript purity check (first 100 non-divider lines):")
    simp_issues = 0
    trad_issues = 0
    for i in range(min(100, len(simp_lines))):
        sl = simp_lines[i]
        tl = trad_lines[i]
        if sl.startswith('--') or sl == 'ERROR':
            continue
        # Extract all Chinese words from the line
        s_words = [sl.split('#')[0]] + (sl.split('#')[1].split('$') if '#' in sl else [])
        t_words = [tl.split('#')[0]] + (tl.split('#')[1].split('$') if '#' in tl else [])
        for w in s_words:
            if w and not is_simplified(w):
                simp_issues += 1
                print(f"  WARN: Simplified line {i+1} has non-simplified word: {w}")
                break
        for w in t_words:
            if w and not is_traditional(w):
                trad_issues += 1
                print(f"  WARN: Traditional line {i+1} has non-traditional word: {w}")
                break

    if simp_issues == 0 and trad_issues == 0:
        print("  All clean!")


if __name__ == '__main__':
    main()
