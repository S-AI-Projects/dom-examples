# Safe text rendering companion

Open `safe-text.html` from a local server to try the small text-rendering
example. Its browser regression check can be run from the repository root
after `npm install` with `node tests/course/r55-t048.mjs`. The check enters
HTML-looking text and confirms it remains a text node without creating an
element or running an event handler.
