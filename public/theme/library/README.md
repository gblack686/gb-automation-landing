# GBAuto Pattern Library

This folder contains GBAuto-themed adaptations of supplied standalone HTML
experiments. Each page preserves its original layout, animation, and content,
then loads the shared `gbauto-library-theme.css` and
`gbauto-library-theme.js` adapter after its source styles.

The adapter applies the canonical cream, ink, stone, and terracotta palette;
Inter and Newsreader typography; glass/card surfaces; GBAuto focus and hover
states; a low-opacity signature watermark; and a small surface label. Canvas
and WebGL pages also receive targeted palette substitutions in their local
animation code where a CSS theme cannot reach rendered pixels.

The pages remain intentionally standalone so they can be opened directly from
the style index, copied into a prototype, or compared without loading the main
React application.
