-- Repair the `home` page seeded by 001_init.sql.
--
-- The original seed used a plain (standard-conforming) string literal, so the
-- `\n` sequences were stored as literal backslash-n characters rather than
-- newlines and never rendered as line breaks. Replace any such literal `\n`
-- in the home page's content with a real newline.
--
-- `replace(content, E'\\n', E'\n')` — `E'\\n'` is the two-character sequence
-- backslash + n; `E'\n'` is an actual newline. A no-op on databases seeded
-- after 001 was fixed (and on pages the user has already rewritten).

UPDATE pages
SET content = replace(content, E'\\n', E'\n')
WHERE slug = 'home';
