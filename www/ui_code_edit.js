/*

	Canvas IMGUI code editor widget.
	Written by Cosmin Apreutesei. Public Domain.

	* TODO: undo/redo
	* TODO: load, save, tabs
	* TODO: search, replace
	* TODO: block selection
	* TODO: bookmarks
	* TODO: remote cursors
	* TODO: save
	* TODO: sessions

DESIGN TRADEOFFS

	- monospace fonts, no ligatures, no combining marks.
		=> codepoint == grapheme
		=> constant grapheme width
	- tabs are used only for indentation and are not valid inside the line.
		=> it's the only way to have user-defined tab-width that makes sense.
		=> tabs are not aligned to tabstops.
		=> inner tabs (those after the first non-space char) take 1 space.
		=> when typing or pasting, inner tabs are converted to 1 space.
	- no mixed line terminators in the same file.
		=> line terminator is detected and text is normalized to that or '\n'.
	- no line folding.

IMPL. TERMINOLOGY

	line      line number counting from 0.
	char      char (so codepoint) index in line.
	col       column (so visible char) index in line.
	pos       char (so codepoint) index in whole text.

IMPL. NOTES

- tab-based indent requires char <-> col conversion on rendering, hit-testing
  and vertical navigation.
- cursor.char can go at line_s.length so 1 char beyond the last char in line.
- selected text is between cursor{.line|.char} and cursor{.sel_line|.sel_char-1}
  (note the -1) or viceversa, the caret being at cursor{.line|.char} always.
- vline2 is the last visible line. sline2 is the last selected line.

*/

(function () {
"use strict"
const G = window

const {
	cx,
	BOX_ARGS
} = ui

//           theme    name        state       h     s     L    a
// ---------------------------------------------------------------------------
ui.fg_style('light', 'keyword'  , 'normal', 240, 1.00, 0.35)
ui.fg_style('light', 'string'   , 'normal',   5, 0.85, 0.40)
ui.fg_style('light', 'number'   , 'normal',   5, 0.80, 0.45)
ui.fg_style('light', 'symbol'   , 'normal', 240, 1.00, 0.20)
ui.fg_style('light', 'comment'  , 'normal', 100, 0.00, 0.45)
ui.fg_style('light', 'error'    , 'normal',   0, 0.85, 0.45)

ui.fg_style('dark' , 'keyword'  , 'normal',  60, 0.95, 0.60)
ui.fg_style('dark' , 'string'   , 'normal',   5, 0.95, 0.60)
ui.fg_style('dark' , 'number'   , 'normal',   5, 0.95, 0.70)
ui.fg_style('dark' , 'symbol'   , 'normal',   0, 1.00, 1.00)
ui.fg_style('dark' , 'comment'  , 'normal', 140, 0.85, 0.30)
ui.fg_style('dark' , 'error'    , 'normal',   0, 0.85, 0.65)

let node_colors = {
// HTML
	StartTag:        'keyword',
	EndTag:          'keyword',
	StartCloseTag:   'keyword',
	TagName:         'keyword', // shared with CSS tag selector
	AttributeName:   'text',
	AttributeValue:  'string',
	UnquotedAttributeValue: 'string',
	Comment:         'comment',
	DoctypeDecl:     'keyword',
	Is:              'symbol',
// CSS
	UniversalSelector: 'keyword',
	'#':             'symbol',
	'::':            'symbol',
	':':             'symbol', // shared with JS
	TypeSelector:    'keyword',
	AttributeSelector: 'keyword', // TODO: followed by TagSelector, TagName etc.
	MatchOp:         'symbol', // = from [a=b] from AttributeSelector
	PseudoClassName: 'string',
	Atrule:          'keyword', // @media
	AtruleName:      'keyword',
	MediaFeature:    'keyword',
	//PropertyName:    'symbol', // shared with JS
	Important:       'keyword',
	ValueName:       'symbol',
	NumberLiteral:   'number',
	Unit:            'symbol',
// JS
	String:          'string',
	Number:          'number',
	BooleanLiteral:  'keyword',
	ArithOp:         'symbol',
	CompareOp:       'symbol',
	LogicOp:         'symbol',
	BitOp:           'symbol',
	UpdateOp:        'symbol',
	Arrow:           'symbol',
	Equals:          'symbol',
	LineComment:     'comment',
	BlockComment:    'comment',
}

for (let keyword of [
	'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
	'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
	'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null',
	'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
	'void', 'while', 'with', 'yield',
]) {
	node_colors[keyword] = 'keyword'
}
for (let symbol of [
	'(', ')', '{', '}', '[', ']', '.', ';', ',', ':', '?', '?.',
]) {
	node_colors[symbol] = 'symbol'
}

ui.load_font('mono', 'fonts/jetbrains-mono-nl-regular.woff2')

function indent(s, tab_width) {
	let i = 0 // char index (i.e. index in line string s)
	let j = 0 // col index (i.e. visual char index, or column)
	while (1) {
		let c = s.charCodeAt(i++)
		if (c == 9) j += tab_width
		else if (c == 32) j++
		else return j
	}
}

function char_to_col(on_i, s, tab_width) {
	let i = 0 // char index
	let j = 0 // col index
	on_i = clamp(on_i, 0, s.length)
	while (i < on_i) {
		let c = s.charCodeAt(i++)
		if (c == 9) j += tab_width
		else if (c == 32) j++
		else return j + (on_i - i) + 1 // after indent it's 1:1 (tabs are 1 space)
	}
	return j
}

function col_to_char(on_j, s, tab_width) {
	on_j = max(0, on_j)
	let i = 0 // char index
	let j = 0 // col index
	let n = s.length-1
	let in_indent = true
	while (i < n) {
		let c = s.charCodeAt(i++)
		if (!(c == 9 || c == 32))
			in_indent = false
		let j0 = j
		j += in_indent && c == 9 ? tab_width : 1
		// i is now at next char, j is now at next col, j0 is at last col.
		if (on_j >= j0 && on_j <= j) // on_j is somewhere between j0 and j
			return i + (on_j - j0 < j - on_j ? -1 : 0)
	}
	return n + 1
}

function detect_line_terminator(s) {
	let crlf = 0, cr = 0, lf = 0
	for (let i = 0, n = s.length; i < n; i++) {
		let c = s.charCodeAt(i)
		if (c == 13) {
			if (i+1 < n && s.charCodeAt(i+1) == 10) {
				crlf++
				i++
			} else {
				cr++
			}
		} else if (c == 10) {
			lf++
		}
	}
	if (crlf && !cr && !lf) return '\r\n'
	if (cr && !crlf && !lf) return '\r'
	if (lf && !crlf && !cr) return '\n'
}

let SIDEBAR_SY     = BOX_ARGS+0
let SIDEBAR_VLINE1 = BOX_ARGS+1
let SIDEBAR_VLINE2 = BOX_ARGS+2

ui.box_widget('code_edit_sidebar', {
	create: function(cmd, sidebar_w, line_count, line_h, font_size, font_descent) {
		return ui.cmd_box(cmd, 0, 's', 's', sidebar_w, 0,
			0, 0, 0,
			line_count, line_h, font_size, font_descent
		)
	},
	draw: function(a, i) {
		let x0  = a[i+0]
		let y0  = a[i+1]
		let w   = a[i+2]
		let h   = a[i+3]

		let sy     = a[i+SIDEBAR_SY]
		let vline1 = a[i+SIDEBAR_VLINE1]
		let vline2 = a[i+SIDEBAR_VLINE2]

		let line_count   = a[i+BOX_ARGS+3]
		let line_h       = a[i+BOX_ARGS+4]
		let font_size    = a[i+BOX_ARGS+5]
		let font_descent = a[i+BOX_ARGS+6]

		cx.save()

		cx.beginPath()
		cx.rect(x0, y0, w, h)
		cx.clip()

		cx.translate(w, -sy)

		cx.font = font_size+'px mono'
		cx.fontKerning = 'none'
		cx.textAlign = 'right'
		cx.fillStyle = 'gray'

		for (let line = vline1; line <= vline2; line++)
			cx.fillText(line+1, x0, y0 + (line + 1) * line_h - font_descent - 1)

		cx.restore()
	},
})

ui.widget('code_edit_text', {
	create: function(...args) {
		return ui.cmd(...args)
	},
	draw: function(a, i) {
		let x0          = a[i+0]
		let y0          = a[i+1]
		let vx          = a[i+2]
		let vy          = a[i+3]
		let vw          = a[i+4]
		let vh          = a[i+5]
		let line_h      = a[i+6]
		let font_size   = a[i+7]
		let font_descent= a[i+8]
		let char_w      = a[i+9]
		let vline1      = a[i+10]
		let vline2      = a[i+11]
		let vlines      = a[i+12]
		let tab_width   = a[i+13]
		let vcolors     = a[i+14]
		let hit_line    = a[i+15]
		let cursors     = a[i+16]

		cx.save()

		cx.font = font_size+'px mono'
		cx.fontKerning = 'none'

		// reset viewport to alpha 0 so we can blend text with highlighting rectangles.
		cx.clearRect(vx, vy, vw, vh)

		// draw the text.
		cx.textAlign = 'left'
		cx.fillStyle = ui.fg_color('text')
		for (let line = vline1; line <= vline2; line++) {
			let s = vlines[line - vline1]
			// using tab_width-1 because tabs take one char with fillText().
			let indent_w = indent(s, tab_width-1) * char_w
			cx.fillText(s, round(x0 + indent_w), y0 + (line + 1) * line_h - font_descent - 1)
		}

		// this blending mode will draw only where alpha != 0, i.e. over the text.
		cx.globalCompositeOperation = 'source-atop'

		// draw highlighting rectangles.
		let normal_colors = ui.get_theme().fg[0]
		for (let line = vline1; line <= vline2; line++) {
			let s = vlines[line - vline1]
			let c = vcolors[line - vline1]
			for (let i = 0, n = c.length; i < n; i += 3) {
				let ci    = c[i+0]
				let cw    = c[i+1]
				let color = c[i+2]
				let color_hsl = (normal_colors[color] || normal_colors.text)[0]
				let x = round(x0 + ci * char_w)
				let y = y0 + line * line_h
				let w = round(cw * char_w)
				let h = line_h
				cx.fillStyle = color_hsl
				cx.fillRect(x, y, w, h)
			}
		}

		// this blending mode will draw only where alpha == 0,
		// i.e. around what's been drawn before i.e. drawing "behind".
		cx.globalCompositeOperation = 'destination-over'

		// draw carets.
		cx.fillStyle = ui.fg_color('text')
		for (let cursor of cursors) {
			let line_s = vlines[cursor.line - vline1]
			if (line_s == null) // outside visible range
				continue
			let col = char_to_col(cursor.char, line_s, tab_width)
			cx.fillRect(
				round(x0 + col * char_w),
				y0 + cursor.line * line_h,
				2, line_h)
		}

		// draw multi-line selection.
		let tail_width = ui.sp05()
		for (let cursor of cursors) {
			if (cursor.sel_line == cursor.line && cursor.sel_char == cursor.char)
				continue
			cx.fillStyle = ui.bg_color('item', 'focused item-focused item-selected')
			let sline1 = min(cursor.sel_line, cursor.line)
			let sline2 = max(cursor.sel_line, cursor.line)
			let vsline1 = clamp(sline1, vline1, vline2)
			let vsline2 = clamp(sline2, vline1, vline2)
			if (sline1 < sline2) { // multi-line
				let schar1 = sline1 == cursor.line ? cursor.char : cursor.sel_char
				let schar2 = sline2 == cursor.line ? cursor.char : cursor.sel_char
				let scol1 = vsline1 == sline1 ? char_to_col(schar1, vlines[sline1 - vline1], tab_width) : null
				let scol2 = vsline2 == sline2 ? char_to_col(schar2, vlines[sline2 - vline1], tab_width) : null
				if (scol1 != null) {
					let line_s = vlines[sline1 - vline1]
					let scol2 = char_to_col(line_s.length, line_s, tab_width)
					cx.fillRect(
						x0 + scol1 * char_w,
						y0 + sline1 * line_h,
						max((scol2 - scol1) * char_w, tail_width), line_h)
					vsline1++ // vsline1 is sline1 which we just drew.
				}
				if (scol2 != null)
					vsline2-- // vsline2 is sline2 which is partial up to scol2.
				for (let vsline = vsline1; vsline <= vsline2; vsline++) {
					let line_s = vlines[vsline - vline1]
					let scol1 = 0
					let scol2 = char_to_col(line_s.length, line_s, tab_width)
					cx.fillRect(
						x0 + scol1 * char_w,
						y0 + vsline * line_h,
						max((scol2 - scol1) * char_w, tail_width), line_h)
				}
				if (scol2 != null) {
					let scol1 = 0
					cx.fillRect(
						x0 + scol1,
						y0 + sline2 * line_h,
						max((scol2 - scol1) * char_w, tail_width), line_h)
				}
			} else if (vsline1 == sline1) { // single-line
				let line_s = vlines[sline1 - vline1]
				if (line_s != null) { // not outside visible range
					let col1 = char_to_col(min(cursor.sel_char, cursor.char), line_s, tab_width)
					let col2 = char_to_col(max(cursor.sel_char, cursor.char), line_s, tab_width)
					cx.fillRect(
						x0 + col1 * char_w,
						y0 + cursor.line * line_h,
						(col2 - col1) * char_w, line_h)
				}
			}
		}

		// draw hit line.
		if (0 && hit_line != null) {
			cx.fillStyle = ui.bg_color('bg1')
			cx.fillRect(vx, y0 + hit_line * line_h, vw, line_h)
		}

		// draw background.
		cx.fillStyle = ui.bg_color('bg0')
		cx.fillRect(vx, vy, vw, vh)

		cx.restore()
	}
})

function code_edit_view(id, opt) {

	let e = {}

	// lines and text-derived state.
	let newline // as detected from text or user override
	let tab_width = 3 // user setting
	let lines // [line1, ...]
	let line_offsets = [] // [line2_offset, ...]  <-- it starts with the second line!
	let max_line_len

	// parsing/highlighting state.
	let syntax_tree // per Lezer parsing
	let line_colors = [] // token colors: [[char, width, color], ...], ...]  1:1 with lines

	// UI state, set on each frame.
	let font_size
	let font_descent
	let line_h
	let char_w
	let last_vline1 = -1
	let last_vline2 = -1 // visible line range
	let vlines = [] // visible lines array: [vline1_s, ...]
	let vcolors = [] // token colors: [vline1_colors, ...]

	// mouse state
	let drag_state
	let hit_line
	let hit_char

	// cursors state.
	let cursor = {line: 0, char: 0, want_col: 0, select_line: 0, select_char: 0}
	let cursors = [cursor]

	// undo state.
	let undo_stack = []
	let redo_stack = []

	// cursor and selection ---------------------------------------------------

	function text_length() {
		return line_offsets.last + lines.last.length
	}

	function line_offset(line) {
		return line ? line_offsets[line-1] : 0
	}

	function find_line(pos) {
		// line_offsets[0] = offset of the 2nd line i.e. the line with index 1.
		// binsearch'ing with '<=' gives us the correct line when pos is at the
		// beginning of the line.
		return binsearch(line_offsets, pos, '<=')
	}

	function find_char(line, pos) {
		let line_pos = line_offset(line)
		return pos - line_offset
	}

	function cursor_rect(cursor) {
		let line_s = lines[cursor.line]
		let col = char_to_col(cursor.char, line_s, tab_width)
		return [
			col * char_w,
			cursor.line * line_h,
			3, line_h
		]
	}

	function cursor_pos(line, char) {
		return line_offset(line) + char
	}

	// TODO: unused
	function cursor_in_indent(cursor) {
		let s = lines[cursor.line]
		for (let i = 0, n = cursor.char; i < n; i++) {
			let c = s.charCodeAt(i)
			if (c != 9 && c != 32)
				return false
		}
		return true
	}

	function cursor_has_selection(cursor) {
		return cursor.line != cursor.sel_line || cursor.char != cursor.sel_char
	}

	function cursor_set_want_col(cursor) {
		let line_s = lines[cursor.line]
		cursor.want_col = char_to_col(cursor.char, line_s, tab_width)
	}

	function cursor_move_to_want_col(cursor) {
		let line_s = lines[cursor.line]
		cursor.char = col_to_char(cursor.want_col, line_s, tab_width)
	}

	function is_word_char(cp) {
		if (cp >= 48 && cp <= 57) return true // 0–9
		if (cp >= 65 && cp <= 90) return true // A–Z
		if (cp >= 97 && cp <= 122) return true // a–z
		return cp == 95 || cp == 36 // '_' or '$'
	}

	function cursor_move_to_next_token(cursor) {
		let i = cursor.char
		let s = lines[cursor.line]
		let n = s.length
		while (i < n &&  is_word_char(s.charCodeAt(i))) i++ // goto end of current word
		while (i < n && !is_word_char(s.charCodeAt(i))) i++ // skip non-words
		cursor.char = i
		cursor_set_want_col(cursor)
	}

	function cursor_move_to_prev_token(cursor) {
		let i = cursor.char
		let s = lines[cursor.line]
		while (i && !is_word_char(s.charCodeAt(i-1))) i-- // skip non-words
		while (i &&  is_word_char(s.charCodeAt(i-1))) i-- // goto beginning of current word
		cursor.char = i
		cursor_set_want_col(cursor)
	}

	function reset_selection(cursor) {
		cursor.sel_line = cursor.line
		cursor.sel_char = cursor.char
	}

	function selected_text(cursor) {
		if (cursor.line == cursor.sel_line) {
			let char1 = min(cursor.char, cursor.sel_char)
			let char2 = max(cursor.char, cursor.sel_char)
			let s = lines[cursor.line]
			return s.substring(char1, char2)
		} else {
			let sel_lines = []
			let line1, char1
			let line2, char2
			if (cursor.line < cursor.sel_line) {
				line1 = cursor.line
				line2 = cursor.sel_line
				char1 = cursor.char
				char2 = cursor.sel_char
			} else {
				line2 = cursor.line
				line1 = cursor.sel_line
				char2 = cursor.char
				char1 = cursor.sel_char
			}
			sel_lines.push(lines[line1].substring(char1))
			for (let line = line1 + 1; line < line2; line++)
				sel_lines.push(lines[line])
			sel_lines.push(lines[line2].substring(0, char2))
			return sel_lines.join(newline)
		}
	}

	// text updating ----------------------------------------------------------

	let newline_re = /(?:\r\n|\r|\n)/g
	function normalize_newlines(s) {
		return s.replace(newline_re, newline)
	}

	function text_lines(s) {
		return s.split(newline)
	}

	function normalize_lines() {
		// remove whitespace at EOL.
		for (let i = 0, n = lines.length; i < n; i++)
			lines[i] = lines[i].trimEnd()
		// remove additional empty lines at EOF.
		while (lines.length > 1 && !lines[lines.length-1].length && !lines[length-2].length)
			lines.pop()
		// insert a single empty line at EOF.
		if (lines[lines.length-1].length)
			lines.push('')
	}

	function reset_text(s) {
		newline = detect_line_terminator(s) ?? '\n'
		s = normalize_newlines(s)
		lines = text_lines(s)
		// init line_colors arrays.
		line_colors.length = lines.length
		for (let i = 0, n = lines.length; i < n; i++)
			line_colors[i] = []
		lines_changed()
		undo_stack.length = 0
		redo_stack.length = 0
	}

	// compute line offsets, starting with the 2nd line!
	function compute_line_offsets() {
		line_offsets.length = lines.length-1
		let pos = lines[0].length + 1
		for (let i = 1, n = lines.length; i < n; i++) {
			line_offsets[i-1] = pos
			pos += lines[i].length + newline.length
		}
	}

	function insert_lines(line1, n) {
		insert_n(lines      , line1, n)
		insert_n(line_colors, line1, n)
		for (let i = 0; i < n; i++)
			line_colors[line1 + i] = []
	}

	function remove_lines(line1, n) {
		lines.splice(line1, n)
		line_colors.splice(line1, n)
	}

	// text update ops --------------------------------------------------------

	function remove_char_at(cursor) {
		let s = lines[cursor.line]
		let pos = cursor_pos(cursor.line, cursor.char)
		if (cursor.char < s.length) {
			lines[cursor.line] = s.slice(0, cursor.char) + s.slice(cursor.char + 1)
		} else if (cursor.line < lines.length-1) {
			s += lines[cursor.line + 1]
			lines[cursor.line] = s
			remove_lines(cursor.line + 1, 1)
		}

		reset_selection(cursor)
		cursor_set_want_col(cursor)
		lines_changed(pos, pos + 1)
		undo_push('insert_char_at', cursor.char)
	}

	function remove_char_before(cursor) {
		if (cursor.char) {
			cursor.char--
			remove_char_at(cursor)
		} else if (cursor.line) {
			cursor.line--
			cursor.char = lines[cursor.line].length
			remove_char_at(cursor)
		}
	}

	function remove_selection(cursor) {
		let sline1 = min(cursor.sel_line, cursor.line)
		let sline2 = max(cursor.sel_line, cursor.line)
		let schar1, schar2
		let pos1, pos2
		if (sline1 == sline2) {
			schar1 = min(cursor.char, cursor.sel_char)
			schar2 = max(cursor.char, cursor.sel_char)
			pos1 = cursor_pos(sline1, schar1)
			pos2 = cursor_pos(sline2, schar2)
		} else {
			schar1 = sline1 == cursor.line ? cursor.char : cursor.sel_char
			schar2 = sline2 == cursor.line ? cursor.char : cursor.sel_char
			pos1 = cursor_pos(sline1, schar1)
			pos2 = cursor_pos(sline2, schar2)
		}
		lines[sline1] = lines[sline1].slice(0, schar1) + lines[sline2].slice(schar2)
		remove_lines(sline1 + 1, sline2 - sline1)

		cursor.line = sline1
		cursor.char = schar1

		reset_selection(cursor)
		cursor_set_want_col(cursor)
		lines_changed(pos1, pos2)
	}

	function insert_char_at(cursor, c) {
		let pos = cursor_pos(cursor.line, cursor.char)
		let s = lines[cursor.line]
		s = s.slice(0, cursor.char) + c + s.slice(cursor.char)
		lines[cursor.line] = s

		cursor.char++

		reset_selection(cursor)
		cursor_set_want_col(cursor)
		lines_changed(pos, pos, c)
	}

	function insert_line_at(cursor) {
		let pos = cursor_pos(cursor.line, cursor.char)
		let s = lines[cursor.line]
		let s1 = s.substring(0, cursor.char)
		let s2 = s.substring(cursor.char)
		lines[cursor.line] = s1
		insert_lines(cursor.line + 1, 1)
		lines[cursor.line + 1] = s2

		cursor.line++
		cursor.char = 0

		reset_selection(cursor)
		cursor_set_want_col(cursor)
		lines_changed(pos, pos, newline)
	}

	function insert_text_at(cursor, s) {
		// split line at cursor
		let line_s = lines[cursor.line]
		let s1 = line_s.slice(0, cursor.char)
		let s2 = line_s.slice(cursor.char)
		// normalize line terminators before splitting so that text passed
		// to lines_changes() below matches the text in the lines.
		s = normalize_newlines(s)
		// split insert text into lines
		let ins_lines = text_lines(s)
		// prepend s1 to the first insert line.
		ins_lines[0] = s1 + ins_lines[0]
		// append s2 to the last insert line.
		let new_cursor_char = ins_lines.last.length
		ins_lines[ins_lines.length-1] += s2
		// make room for new lines (first line is fused at cursor).
		insert_lines(cursor.line + 1, ins_lines.length - 1)
		// set the new lines (first and last is overwritten).
		for (let i = 0, n = ins_lines.length; i < n; i++)
			lines[cursor.line + i] = ins_lines[i]
		// update editor state.
		let pos1 = cursor_pos(cursor.line, cursor.char)
		cursor.line += ins_lines.length - 1
		cursor.char = new_cursor_char

		reset_selection(cursor)
		cursor_set_want_col(cursor)
		lines_changed(pos1, pos1, s)
	}

	function indent_selection(cursor) {
		let line1 = min(cursor.line, cursor.sel_line)
		let line2 = max(cursor.line, cursor.sel_line)
		for (let i = line1; i <= line2; i++)
			lines[i] = '\t' + lines[i]
		cursor.char     ++
		cursor.sel_char ++

		cursor_set_want_col(cursor)
		lines_changed()
	}

	function outdent_selection(cursor) {
		let line1 = min(cursor.line, cursor.sel_line)
		let line2 = max(cursor.line, cursor.sel_line)
		for (let i = line1; i <= line2; i++) {
			let s1 = lines[i]
			let s2 = s1.replace(/^\t/, '')
			lines[i] = s2
			if (cursor.line == i)
				cursor.char -= s1.length - s2.length
			if (cursor.sel_line == i)
				cursor.sel_char -= s1.length - s2.length
		}

		cursor_set_want_col(cursor)
		lines_changed()
	}

	function undo_start() {

	}

	function undo_end() {

	}

	function undo_push() {

	}

	// syntax highlighting updating -------------------------------------------

	let LinesInput = class {
		chunk(pos) {
			let line = find_line(pos)
			let line_pos = line_offset(line)
			let s = lines[line].slice(pos - line_pos)
			if (line < lines.length - 1)
				s += newline
			return s
		}
		read(from, to) {
			let line1 = find_line(from)
			let line2 = find_line(to)
			let char1 = find_char(line1, from)
			let char2 = find_char(line2, to)
			let s = selected_text({
				line: line1,
				char: char1,
				sel_line: line2,
				sel_char: char2,
			})
			return Lezer.Text.fromString(s)
		}
		get lineChunks() {
			return false
		}
		get length() {
			return text_length()
		}
	}
	let lines_input = new LinesInput()

	function lines_changed(from, to, insert_s) {
		last_vline1 = -1
		last_vline2 = -1

		max_line_len = 0
		for (let s of lines)
			max_line_len = max(max_line_len, s.length)

		compute_line_offsets()

		// let lines_input = lines.join(newline)
		if (from != null) {
			let change_ranges = [{
				fromA: from,
				toA: to,
				fromB: from,
				toB: from + (insert_s?.length ?? 0),
			}]
			let fragments = Lezer.TreeFragment.addTree(syntax_tree)
			fragments = Lezer.TreeFragment.applyChanges(fragments, change_ranges)
			syntax_tree = Lezer.parsers.html.parse(lines_input, fragments)
		} else {
			syntax_tree = Lezer.parsers.html.parse(lines_input)
		}
		build_colors()
	}

	function build_colors() {
		for (let a of line_colors)
			a.length = 0
		let c = syntax_tree.cursor()
		let text = lines.join(newline)
		do {
			// pr(c.name, text.substring(c.from, c.to).substring(0, 20))
			if (c.name == 'VariableName')
				{} // TODO: look up known variable names
			let color = node_colors[c.name]
			if (!color)
				continue
			let line1 = find_line(c.from)
			let line2 = find_line(c.to)
			let line1_s = lines[line1]
			let char1 = c.from - line_offset(line1)
			let col1 = char_to_col(char1, line1_s, tab_width)
			if (line2 > line1) {
				let w1 = char_to_col(line1_s.length, line1_s, tab_width)
				line_colors[line1].push(col1, w1, color)
				for (let line = line1 + 1; line < line2; line++) {
					let line_s = lines[line]
					let w = char_to_col(line_s.length, line_s, tab_width)
					line_colors[line].push(0, w, color)
				}
				let line2_s = lines[line2]
				let char2 = c.to - line_offset(line2)
				let col2 = char_to_col(char2, line2_s, tab_width)
				let w2 = char_to_col(line2_s.length, line2_s, tab_width)
				line_colors[line2].push(0, w2, color)
			} else {
				let w = c.to - c.from
				line_colors[line1].push(col1, w, color)
			}
		} while (c.next())
	}

	// UI ---------------------------------------------------------------------

	let sidebar_i

	function on_text_frame(a, _i, x, y, w, h, vx, vy, vw, vh) {

		let sx = vx - x
		let sy = vy - y

		// number of lines fully or partially in the viewport.
		let vline_n = floor(vh / line_h) + 2 // 2 is right, think it!
		let vline1 = floor(sy / line_h)
		let vline2 = vline1 + vline_n - 1
		vline1 = max(0, min(vline1, lines.length - 1))
		vline2 = max(0, min(vline2, lines.length - 1))

		// TODO: make the sidebar a popup anchored to this frame and remove this hack!
		a[sidebar_i+SIDEBAR_SY ] = sy
		a[sidebar_i+SIDEBAR_VLINE1] = vline1
		a[sidebar_i+SIDEBAR_VLINE2] = vline2

		if (last_vline1 != vline1 || last_vline2 != vline2) {
			vlines .length = vline2 - vline1 + 1
			vcolors.length = vline2 - vline1 + 1
			for (let line = vline1; line <= vline2; line++) {
				let s = lines[line]
				let c = assert(line_colors[line])
				vlines [line - vline1] = s
				vcolors[line - vline1] = c
			}
			last_vline1 = vline1
			last_vline2 = vline2
		}

		// move cursor and select text based on mouse clicking and dragging.
		hit_line = null
		hit_char = null
		if (drag_state) {
			hit_line = floor((ui.my - y) / line_h)
			hit_line = clamp(hit_line, 0, lines.length-1)
			let line_s = lines[hit_line]
			let hit_col = floor((ui.mx - x + char_w / 2) / char_w)
			hit_char = col_to_char(hit_col, line_s, tab_width)
			hit_char = clamp(hit_char, 0, line_s.length)
			let shift = ui.key('shift') // TODO: use to change selection end
			if (drag_state != 'hover') {
				cursor.line = hit_line
				cursor.char = hit_char
				cursor.want_col = hit_col
				if (drag_state == 'drag')
					reset_selection(cursor)
			}
		}

		ui.stack(id+'.text_contentbox')
			ui.code_edit_text(x, y, vx, vy, vw, vh,
				line_h, font_size, font_descent, char_w,
				vline1, vline2, vlines, tab_width, vcolors,
				hit_line, ui.focused(id) ? cursors : empty_array,
		)

		ui.end_stack()
	}

	e.render = function(fr, align, valign, min_w, min_h) {

		// set layout vars

		font_size = ui.get_font_size()
		line_h = round(font_size * 1.5)
		{
			let font0 = cx.font
			cx.font = font_size+'px mono'
			let m = ui.measure_text(cx, 'm')
			cx.font = font0
			char_w = m.width
			font_descent = m.fontBoundingBoxDescent
		}
		let sidebar_w = (lines.length+'').length * char_w
		let text_w = ceil(max_line_len * char_w)
		let text_h = lines.length * line_h

		// process mouse input (more processing is done in the frame callback
		// when we know the view x,y.

		;[drag_state] = ui.drag(id+'.text_contentbox')
		if (drag_state == 'drag')
			ui.focus(id)

		// process keyboard input

		let lines_n = 0
		let chars_n = 0
		let scroll_lines = 0
		if (ui.focused(id)) {

			ui.capture_keydown(id, 'ctrl f') // browser: find -> editor: find
			ui.capture_keyup  (id, 'ctrl f') // browser: find -> editor: find
			ui.capture_keydown(id, 'ctrl h') // browser: history -> editor: replace

			for (let [event, key, full_key, key_char, ctrl, alt, shift] of ui.key_events) {
				if (event != 'down')
					continue

				undo_start()

				// NOTE: some key combos are captured by browser, namely:
				// ctrl+pgup/dn, ctrl(+shift)+tab
				if      (key == 'arrowup'    && !ctrl) lines_n = -1
				else if (key == 'arrowdown'  && !ctrl) lines_n =  1
				else if (key == 'pageup'             ) lines_n = -(last_vline2 - last_vline1)
				else if (key == 'pagedown'           ) lines_n =  (last_vline2 - last_vline1)
				else if (key == 'home'       &&  ctrl) lines_n = -1/0
				else if (key == 'end'        &&  ctrl) lines_n =  1/0
				else if (key == 'arrowleft'          ) chars_n = -1
				else if (key == 'arrowright'         ) chars_n =  1
				else if (key == 'arrowup'    &&  ctrl) scroll_lines = -1
				else if (key == 'arrowdown'  &&  ctrl) scroll_lines =  1

				if (chars_n || lines_n) {
					if (chars_n < 0) {
						if (cursor.char > 0) {
							if (ctrl) {
								cursor_move_to_prev_token(cursor)
							} else {
								cursor.char--
								cursor_set_want_col(cursor)
							}
						} else if (cursor.line) {
							cursor.line--
							let line_s = lines[cursor.line]
							cursor.char = line_s.length
							cursor_set_want_col(cursor)
						}
					} else if (chars_n > 0) {
						if (cursor.char < lines[cursor.line].length) {
							if (ctrl) {
								cursor_move_to_next_token(cursor)
							} else {
								cursor.char++
								cursor_set_want_col(cursor)
							}
						} else if (cursor.line < lines.length-1) {
							cursor.line++
							cursor.char = 0
							cursor_set_want_col(cursor)
						}
					} else if (lines_n < 0) {
						if (cursor.line) {
							cursor.line = max(cursor.line + lines_n, 0)
							cursor_move_to_want_col(cursor)
						} else {
							cursor.char = 0
						}
					} else if (lines_n > 0) {
						if (cursor.line < lines.length-1) {
							cursor.line = min(cursor.line + lines_n, lines.length-1)
							cursor_move_to_want_col(cursor)
						} else {
							cursor.char = lines[cursor.line].length
						}
					}
					if (!shift)
						reset_selection(cursor)
					ui.scroll_to_view(id+'.text_scrollbox', ...cursor_rect(cursor))
				} else if (scroll_lines) {
					let ss = ui.state(id+'.text_scrollbox')
					// TODO: scroll_y is allowed to get out of range!
					ss.set('scroll_y', (ss.get('scroll_y') ?? 0) + scroll_lines * line_h)
				} else if (ctrl && key == 'a') {
					cursor.line = 0
					cursor.char = 0
					cursor.sel_line = lines.length-1
					cursor.sel_char = lines[cursor.sel_line].length
					cursor_set_want_col(cursor)
				} else if (ctrl && key == 'c') {
					let sel_text = selected_text(cursor)
					navigator.clipboard.writeText(sel_text)
				} else if (ctrl && key == 'x') {
					let sel_text = selected_text(cursor)
					navigator.clipboard.writeText(sel_text)
					remove_selection(cursor)
				} else if (key == 'paste') {
					remove_selection(cursor)
					insert_text_at(cursor, ui.clipboard_text)
				} else if (ctrl && key == 'f') {
					// TODO: find
					pr('FIND')
				} else if (ctrl && key == 'h') {
					// TODO: replace
					pr('REPLACE')
				} else if (key == 'enter') {
					insert_line_at(cursor)
				} else if (key == 'backspace') {
					if (cursor_has_selection(cursor))
						remove_selection(cursor)
					else
						remove_char_before(cursor)
				} else if (key == 'delete') {
					if (cursor_has_selection(cursor))
						remove_selection(cursor)
					else
						remove_char_at(cursor)
				} else if (!ctrl && !alt && key == 'tab') {
					if (shift)
						outdent_selection(cursor)
					else
						indent_selection(cursor)
				} else if (key_char) { // typing
					insert_char_at(cursor, key_char)
				}
			}
			undo_end()
		} // for ui.key_events

		// build editor

		ui.v(fr, 0, align, valign, min_w, min_h)
			let tabs = [
				{id: 'tab1', label:'Tab 1'},
				{id: 'tab2', label:'Tab 2'},
			]
			ui.stack('', 0)
				let sel_tab = ui.tabs(id+'.tabs', tabs, 'tab1')
			ui.end_stack()
			ui.stack('', 0, 's', 's', 0, 1)
				ui.bb('bg2')
			ui.end_stack()
			ui.h(1, ui.sp025())
				ui.p(ui.sp1(), 0)
				ui.stack('', 0)
					ui.bb('bg1')
					sidebar_i = ui.code_edit_sidebar(sidebar_w,
						lines.length, line_h, font_size, font_descent)
				ui.end_stack()
				ui.scrollbox(id+'.text_scrollbox', 1, 'auto', 'scroll')
					ui.frame(noop, on_text_frame, 1, 's', 's', text_w, text_h)
				ui.end_scrollbox()
			ui.end_h()
		ui.end_v()

	}

	e.free = function() {}

	reset_text(opt.code)

	return e
}

ui.code_edit = function(id, opt, fr, align, valign, min_w, min_h) {
	ui.keepalive(id)
	let s = ui.state(id)
	let view = s.get('view')
	if (!view) {
		view = code_edit_view(id, opt)
		ui.on_free(id, () => view.free())
		s.set('view', view)
	}
	view.render(fr, align, valign, min_w, min_h)
}

}()) // module function
