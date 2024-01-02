NOTE: This is in the works! Check out the [demo] to see how we're advancing.

[demo]: https://allegory.ro/canvas-ui/demo.html

# :computer_mouse: Canvas UI

UI library in JavaScript: canvas-drawn, no dependencies, IMGUI API, built-in remote screen sharing.

## Highlights

* virtual editable tree-grid:
	* scrolls 1 million records @ 60 fps
	* loads, sorts and filters 100K records instantly
	* grouping by multiple columns
	* do multiple changes before saving
	* master-detail with client-side and server-side detail filtering
* data-bound widgets for data entry: editbox, dropdown, etc.
* split-pane layouting widgets: tabs list and splitter.
* p2p screen-sharing, needs only 2-5 Mbps to get 60 fps on a relatively dense UI.
* UI designer for templates.
* flex layouting.
* popup positioning.
* z-layering.
* styling system for colors and spacing better than CSS.
* animations better than CSS.
* IMGUI, so stateless, no DOM updating or diff'ing because there is no ODM.
* no dependencies, no build system, small, hackable code base.
* possible to add new layouting algorithms.

## Why canvas-drawn?

Sidestepping the DOM and CSS allows us to fix all the
[problems with the web](https://github.com/allegory-software/x-widgets/blob/main/WHY-WEB-SUCKS.md)
that bugged us for years in one fell swoop. And it opens up opportunities
to create better models for UIs in general. For instance, the IMGUI approach
is reactive by design, but implementing a reactive system on top of the DOM
is complicated, slow and full of trade-offs. Composable, smart styling is also
harder with CSS than with JS where anything is dynamic (eg. in our system,
the text color is inverted automatically based on the background's lightness).
Remote screen sharing would also be hard to implement efficiently on top of a DOM,
but it comes almost for free with our command array model. Virtual
widgets like a data grid that has to display a million rows is harder to
implement by moving DOM elements around when you could just draw the visible
row range at an offset. Adding new layouting algorithms is also a possibility.

## Limitations of canvas-drawn

With canvas, you have to reimplement the web from scratch: layouting, styling,
animations, box model, etc. Most of these are easy though and you can even
do a better job with not a lot of code. But some are hard or outright
not feasible because of missing APIs. Text APIs in particular are very crude
in the browser, so things like BiDi (UAX#9), Unicode line breaking (UAX#14),
dictionary-based word wrapping, underlines that break under letter stems,
all those things are hard, and we don't implement them.

