/*

	Canvas IMGUI code editor widget.
	Written by Cosmin Apreutesei. Public Domain.

	* TODO: lines_changed() must move cursors.
	* TODO: insert mode + caret
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
	BOX_ARGS,
	caret_w = 2,
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

let token_colors = {
	'tok-keyword':     'keyword',
	'tok-atom':        'keyword',
	'tok-bool':        'keyword',
	'tok-typeName':    'keyword',
	'tok-className':   'keyword',
	'tok-meta':        'keyword',
	'tok-string':      'string',
	'tok-string2':     'string',
	'tok-url':         'string',
	'tok-number':      'number',
	'tok-operator':    'symbol',
	'tok-punctuation': 'symbol',
	'tok-comment':     'comment',
}

function tab_draw_offset(s, tab_width) {
	let i = 0 // char index (i.e. index in line string s)
	let j = 0 // col index (i.e. visual char index, or column)
	while (1) {
		let c = s.charCodeAt(i++)
		if (c == 9) j += tab_width
		else if (c != 32) return j
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
	let n = s.length
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
	return n
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

function cursor_has_selection(cursor) {
	return (
		cursor.line != cursor.sel_line ||
		cursor.char != cursor.sel_char
	)
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
			let indent_w = tab_draw_offset(s, tab_width-1) * char_w
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
				caret_w, line_h)
		}

		// draw multi-line selection.
		let tail_width = ui.sp05()
		for (let cursor of cursors) {
			if (!cursor_has_selection(cursor))
				continue
			cx.fillStyle = ui.bg_color('item', 'focused item-focused item-selected')
			let sline1 = min(cursor.sel_line, cursor.line)
			let sline2 = max(cursor.sel_line, cursor.line)
			if (sline2 < vline1 || sline1 > vline2)
				continue
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
	let max_line_col

	// parsing/highlighting state.
	let lang = opt.lang ?? 'html'
	let parser = assert(Lezer.parsers[lang], 'invalid language ', lang)
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
	let hit_line

	// cursors state.
	let cursors = [] // dragging cursor always at cursors[0].

	// undo state.
	let undo_stack = []
	let redo_stack = []
	let undo_group
	let undoing

	// pos -> (line, char) ----------------------------------------------------

	// compute line offsets, starting with the 2nd line!
	function compute_line_offsets() {
		line_offsets.length = lines.length-1
		let pos = lines[0].length + newline.length
		for (let i = 1, n = lines.length; i < n; i++) {
			line_offsets[i-1] = pos
			pos += lines[i].length + newline.length
		}
	}

	function text_length() {
		return line_offset(lines.length-1) + lines.at(-1).length
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
		return pos - line_offset(line)
	}

	// char <-> col -----------------------------------------------------------

	function cursor_rect(cursor) {
		let line_s = lines[cursor.line]
		let col = char_to_col(cursor.char, line_s, tab_width)
		return [
			col * char_w,
			cursor.line * line_h,
			caret_w, line_h
		]
	}

	function pos_at(line, char) {
		return line_offset(line) + char
	}

	function cursor_want_col(cursor) {
		let line_s = lines[cursor.line]
		return char_to_col(cursor.char, line_s, tab_width)
	}

	function cursor_want_col_char(cursor, line) {
		let line_s = lines[line]
		return col_to_char(cursor.want_col, line_s, tab_width)
	}

	// word jump --------------------------------------------------------------

	function is_word_char(cp) {
		if (cp >= 48 && cp <= 57) return true // 0–9
		if (cp >= 65 && cp <= 90) return true // A–Z
		if (cp >= 97 && cp <= 122) return true // a–z
		return cp == 95 || cp == 36 // '_' or '$'
	}

	function next_token(cursor) {
		let i = cursor.char
		let s = lines[cursor.line]
		let n = s.length
		while (i < n &&  is_word_char(s.charCodeAt(i))) i++ // goto end of current word
		while (i < n && !is_word_char(s.charCodeAt(i))) i++ // skip non-words
		return i
	}

	function prev_token(cursor) {
		let i = cursor.char
		let s = lines[cursor.line]
		while (i && !is_word_char(s.charCodeAt(i-1))) i-- // skip non-words
		while (i &&  is_word_char(s.charCodeAt(i-1))) i-- // goto beginning of current word
		return i
	}

	// selection --------------------------------------------------------------

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

	// text & lines helpers ---------------------------------------------------

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
		if (lines.at(-1).length)
			lines.push('')
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

	function reset_editor(s) {
		newline = detect_line_terminator(s) ?? '\n'
		s = normalize_newlines(s)
		lines = text_lines(s)
		// (re)init line_colors arrays.
		line_colors.length = lines.length
		for (let i = 0, n = lines.length; i < n; i++)
			if (line_colors[i] != null)
				line_colors[i].length = 0
			else
				line_colors[i] = []
		lines_changed()
		cursors.length = 0
		add_first_cursor(0, 0)
		undo_stack.length = 0
		redo_stack.length = 0
	}

	// undo-able ops ----------------------------------------------------------

	function insert_cursor(cursor_i, cursor) {
		undo_push(remove_cursor, cursor_i)
		insert(cursors, cursor_i, cursor)
	}
	function remove_cursor(cursor_i) {
		undo_push(insert_cursor, cursor_i, assign({}, cursors[cursor_i]))
		remove(cursors, cursor_i)
	}

	function kill_cursors_in_range(except_i, line1, line2) {
		for (let i = cursors.length - 1; i >= 0; i--) {
			if (i == except_i)
				continue
			let c = cursors[i]
			let cl1 = min(c.line, c.sel_line)
			let cl2 = max(c.line, c.sel_line)
			if (cl2 >= line1 && cl1 <= line2)
				remove_cursor(i)
		}
	}

	function remove_first_cursor() {
		let c = cursors.shift()
		undo_break()
		undo_push(add_first_cursor, c.line, c.char)
	}
	function add_first_cursor(line, char) {
		let cursor = {line: line, char: char, sel_line: line, sel_char: char}
		cursors.unshift(cursor)
		cursor.want_col = cursor_want_col(cursor)
		if (cursors.length > 1) {
			undo_break()
			undo_push(remove_first_cursor)
		}
	}

	function add_extra_cursors(extra_cursors) {
		cursors.push(...extra_cursors)
		undo_push(remove_extra_cursors)
	}
	function remove_extra_cursors() {
		if (cursors.length < 2)
			return
		undo_push(add_extra_cursors, cursors.map(c => assign({}, c)).slice(1))
		cursors.length = 1
	}

	function replace_cursor(cursor_i, cursor) {
		undo_push(replace_cursor, cursor_i, assign({}, cursors[cursor_i]))
		cursors[cursor_i] = cursor
	}
	function set_cursor(cursor_i, line, char, keep_selection, keep_want_col) {
		let cursor = cursors[cursor_i]
		undo_push(replace_cursor, cursor_i, assign({}, cursor))
		cursor.line = line
		cursor.char = char
		if (!keep_want_col)
			cursor.want_col = cursor_want_col(cursor)
		if (!keep_selection) {
			cursor.sel_line = cursor.line
			cursor.sel_char = cursor.char
		} else if (keep_selection == 'select_all') {
			cursor.sel_line = lines.length-1
			cursor.sel_char = lines[cursor.sel_line].length
		}
		ui.scroll_to_view(id+'.text_scrollbox', ...cursor_rect(cursor))
	}

	function insert_char_at(line, char, c) {
		let pos = pos_at(line, char)
		let s = lines[line]
		s = s.slice(0, char) + c + s.slice(char)
		lines[line] = s

		undo_push(remove_char_at, line, char)

		lines_changed(pos, pos, c)
	}

	function insert_line_at(line, char) {
		let pos = pos_at(line, char)
		let s = lines[line]
		let s1 = s.substring(0, char)
		let s2 = s.substring(char)
		lines[line] = s1
		insert_lines(line + 1, 1)
		lines[line + 1] = s2

		undo_push(remove_char_at, line, char)

		lines_changed(pos, pos, newline)
	}

	function remove_char_at(line, char) {
		let pos = pos_at(line, char)
		let s = lines[line]
		if (char < s.length) {
			undo_push(insert_char_at, line, char, s.slice(char, char + 1))
			lines[line] = s.slice(0, char) + s.slice(char + 1)
			lines_changed(pos, pos + 1)
		} else if (line < lines.length-1) {
			undo_push(insert_line_at, line, char)
			lines[line] = s + lines[line + 1]
			remove_lines(line + 1, 1)
			lines_changed(pos, pos + newline.length)
		}
	}

	function remove_selection(cursor_i) {
		let cursor = cursors[cursor_i]
		if (!cursor_has_selection(cursor))
			return
		let line1 = min(cursor.sel_line, cursor.line)
		let line2 = max(cursor.sel_line, cursor.line)
		let char1, char2
		if (line1 == line2) {
			char1 = min(cursor.char, cursor.sel_char)
			char2 = max(cursor.char, cursor.sel_char)
		} else {
			char1 = line1 == cursor.line ? cursor.char : cursor.sel_char
			char2 = line2 == cursor.line ? cursor.char : cursor.sel_char
		}
		remove_text_at(line1, char1, line2, char2)
	}

	function insert_text_at(line, char, s, normalize_tabs) {
		let line_s = lines[line]
		let s1 = line_s.slice(0, char)
		let s2 = line_s.slice(char)
		// normalize line terminators before splitting so that text passed
		// to lines_changes() below matches the text in the lines.
		s = normalize_newlines(s)
		// split insert text into lines
		let ins_lines = text_lines(s)
		if (normalize_tabs) {
			let in_indent = !/[^\t ]/.test(s1)
			let changed
			for (let i = 0; i < ins_lines.length; i++) {
				let line_s = ins_lines[i]
				let content_char = i > 0 || in_indent
					? line_s.search(/[^\t ]/) : 0
				if (content_char < 0 || line_s.indexOf('\t', content_char) < 0)
					continue
				ins_lines[i] = line_s.slice(0, content_char)
					+ line_s.slice(content_char).replaceAll('\t', ' ')
				changed = true
			}
			if (changed)
				s = ins_lines.join(newline)
		}
		// prepend s1 to the first insert line.
		ins_lines[0] = s1 + ins_lines[0]
		// append s2 to the last insert line.
		let end_line = line + ins_lines.length - 1
		let end_char = ins_lines.at(-1).length
		ins_lines[ins_lines.length-1] += s2
		// make room for new lines (first line is fused at cursor).
		insert_lines(line + 1, ins_lines.length - 1)
		// set the new lines (first and last is overwritten).
		for (let i = 0, n = ins_lines.length; i < n; i++)
			lines[line + i] = ins_lines[i]
		let pos1 = pos_at(line, char)

		undo_push(remove_text_at, line, char, end_line, end_char)
		lines_changed(pos1, pos1, s)
		return [end_line, end_char]
	}

	function remove_text_at(line1, char1, line2, char2) {
		let removed_s
		if (line1 == line2) {
			removed_s = lines[line1].slice(char1, char2)
		} else {
			let removed_lines = [lines[line1].slice(char1)]
			for (let line = line1 + 1; line < line2; line++)
				removed_lines.push(lines[line])
			removed_lines.push(lines[line2].slice(0, char2))
			removed_s = removed_lines.join(newline)
		}
		let pos1 = pos_at(line1, char1)
		let pos2 = pos_at(line2, char2)
		lines[line1] = lines[line1].slice(0, char1) + lines[line2].slice(char2)
		remove_lines(line1 + 1, line2 - line1)

		undo_push(insert_text_at, line1, char1, removed_s)
		lines_changed(pos1, pos2)
	}

	function indent_selection(cursor_i) {
		let cursor = cursors[cursor_i]
		let line1 = min(cursor.line, cursor.sel_line)
		let line2 = max(cursor.line, cursor.sel_line)
		for (let i = line1; i <= line2; i++)
			insert_char_at(i, 0, '\t')
	}

	function outdent_selection(cursor_i) {
		let cursor = cursors[cursor_i]
		let line1 = min(cursor.line, cursor.sel_line)
		let line2 = max(cursor.line, cursor.sel_line)
		for (let i = line1; i <= line2; i++)
			if (lines[i].charCodeAt(0) == 9)
				remove_char_at(i, 0)
	}

	// undo/redo --------------------------------------------------------------

	function undo_push(fn, ...args) {
		if (undo_group == 'ignore')
			return
		assert(undo_group) // undoable ops must be done inside an undo_group.
		undo_stack.push([undo_group, fn, ...args])
	}

	function undo_break() {
		undo_stack.push(['break', noop])
	}

	function undo() {
		undoing = true
		let stack = undo_stack
		undo_stack = redo_stack
		while (1) {
			let rec = stack.pop()
			if (!rec)
				break
			undo_group = rec.shift()
			let fn     = rec.shift()
			fn(...rec)
			if (!stack.length)
				break
			let next_undo_group = stack.at(-1)[0]
			if (next_undo_group != undo_group) {
				if (next_undo_group == 'break')
					stack.pop()
				break
			}
		}
		undo_group = null
		undo_stack = stack
		undoing = false
	}

	function redo() {
		;[redo_stack, undo_stack] = [undo_stack, redo_stack]
		undo()
		;[redo_stack, undo_stack] = [undo_stack, redo_stack]
	}

	// syntax highlighting updating -------------------------------------------

	let LinesInput = class {
		chunk(pos) {
			let line = find_line(pos)
			let line_pos = line_offset(line)
			let char = pos - line_pos
			let line_s = lines[line]
			if (char < line_s.length)
				return line_s.slice(char)
					+ (line < lines.length - 1 ? newline : '')
			if (line < lines.length - 1)
				return newline.slice(char - line_s.length)
			return ''
		}
		read(from, to) {
			let line = find_line(from)
			let line_pos = line_offset(line)
			let line_s = lines[line]
			if (to <= line_pos + line_s.length)
				return line_s.slice(from - line_pos, to - line_pos)
			let parts = []
			while (from < to) {
				let s = this.chunk(from).slice(0, to - from)
				parts.push(s)
				from += s.length
			}
			return parts.join('')
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

		let old_pos, old_sel_pos
		if (from != null) {
			old_pos = new Array(cursors.length)
			old_sel_pos = new Array(cursors.length)
			for (let i = 0; i < cursors.length; i++) {
				let c = cursors[i]
				old_pos[i] = pos_at(c.line, c.char)
				old_sel_pos[i] = pos_at(c.sel_line, c.sel_char)
			}
		}

		max_line_col = 0
		for (let s of lines)
			max_line_col = max(max_line_col, char_to_col(s.length, s, tab_width))

		compute_line_offsets()

		if (from != null) {
			let delta = (insert_s?.length ?? 0) - (to - from)
			let collapsed_i = [] // indices of cursors that collapsed onto `from`
			for (let i = 0; i < cursors.length; i++) {
				let cursor = cursors[i]
				let pos = old_pos[i]
				let new_pos = pos < from ? pos : pos < to ? from : pos + delta
				if (new_pos != pos) {
					cursor.line = find_line(new_pos)
					cursor.char = find_char(cursor.line, new_pos)
					cursor.want_col = cursor_want_col(cursor)
				}
				if (to > from && new_pos == from)
					collapsed_i.push(i)
				let sel_pos = old_sel_pos[i]
				let new_sel_pos = sel_pos < from ? sel_pos : sel_pos < to ? from : sel_pos + delta
				if (new_sel_pos != sel_pos) {
					cursor.sel_line = find_line(new_sel_pos)
					cursor.sel_char = find_char(cursor.sel_line, new_sel_pos)
				}
			}
			for (let i = collapsed_i.length - 1; i >= 1; i--)
				remove_cursor(collapsed_i[i])
		}

		// TODO: save this and make it retreivable somehow.
		if (!undoing)
			redo_stack.length = 0

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
			syntax_tree = parser.parse(lines_input, fragments)
		} else {
			syntax_tree = parser.parse(lines_input)
		}
		build_colors(from != null ? find_line(from) : 0)
	}

	function build_colors(from_line = 0) {
		for (let line = from_line; line < line_colors.length; line++)
			line_colors[line].length = 0
		Lezer.highlightTree(syntax_tree, Lezer.classHighlighter,
		function(from, to, classes) {
			let color = classes.includes('tok-invalid') ? 'error' : null
			for (let cls of classes.split(' ')) {
				color = color || token_colors[cls]
				if (color)
					break
			}
			if (!color)
				return
			let line1 = find_line(from)
			let line2 = find_line(to)
			let line1_s = lines[line1]
			let char1 = from - line_offset(line1)
			let col1 = char_to_col(char1, line1_s, tab_width)
			if (line2 > line1) {
				if (line1 >= from_line) {
					let w1 = char_to_col(line1_s.length, line1_s, tab_width) - col1
					line_colors[line1].push(col1, w1, color)
				}
				for (let line = max(line1 + 1, from_line); line < line2; line++) {
					let line_s = lines[line]
					let w = char_to_col(line_s.length, line_s, tab_width)
					line_colors[line].push(0, w, color)
				}
				if (line2 >= from_line) {
					let line2_s = lines[line2]
					let char2 = to - line_offset(line2)
					let col2 = char_to_col(char2, line2_s, tab_width)
					line_colors[line2].push(0, col2, color)
				}
			} else if (line1 >= from_line) {
				let w = to - from
				line_colors[line1].push(col1, w, color)
			}
		}, from_line == 0 ? 0 : pos_at(from_line, 0))
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

		ui.stack(id+'.text_contentbox')
			ui.measure(id+'.text_contentbox')
			ui.code_edit_text(x, y, vx, vy, vw, vh,
				line_h, font_size, font_descent, char_w,
				vline1, vline2, vlines, tab_width, vcolors,
				hit_line, ui.focused(id) ? cursors : empty_array,
		)

		ui.end_stack()
	}

	e.render = function(min_w, min_h) {

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
		let text_w = ceil(max_line_col * char_w + caret_w)
		let text_h = lines.length * line_h

		let [drag_state] = ui.drag(id+'.text_contentbox')
		if (drag_state == 'drag')
			ui.focus(id)

		// move cursor and select text based on mouse clicking and dragging.
		hit_line = null
		if (drag_state) {
			let text_state = ui.state(id+'.text_contentbox')
			let x = text_state.get('x')
			let y = text_state.get('y')
			hit_line = floor((ui.my - y) / line_h)
			hit_line = clamp(hit_line, 0, lines.length-1)
			let line_s = lines[hit_line]
			let hit_col = floor((ui.mx - x + char_w / 2) / char_w)
			let hit_char = col_to_char(hit_col, line_s, tab_width)
			hit_char = clamp(hit_char, 0, line_s.length)
			let shift = ui.key('shift')
			let ctrl  = ui.key('ctrl' )
			if (drag_state != 'hover') {
				undo_group = 'drag'
				let cursor_i = -1
				if (drag_state == 'drag') {
					if (ctrl && shift) { // extend current cursor, killing anyone in the new range
						kill_cursors_in_range(0, min(cursors[0].sel_line, hit_line), max(cursors[0].sel_line, hit_line))
					} else if (ctrl) { // add cursor, killing anyone on hit_line
						kill_cursors_in_range(-1, hit_line, hit_line)
						add_first_cursor(hit_line, hit_char)
						cursor_i = 0
					} else {
						remove_extra_cursors()
					}
				} else {
					// dragging: keep killing anyone the growing selection sweeps over
					kill_cursors_in_range(0, min(cursors[0].sel_line, hit_line), max(cursors[0].sel_line, hit_line))
				}
				if (cursor_i == -1) {
					if (drag_state == 'dragging')
						undo_group = 'ignore'
					let keep_selection = drag_state != 'drag' || (ctrl && shift)
					set_cursor(0, hit_line, hit_char, keep_selection)
				}
			}
			undo_group = null
		}

		// process keyboard input

		if (ui.focused(id)) {

			ui.capture_keydown(id, 'ctrl f') // browser: find -> editor: find
			ui.capture_keyup  (id, 'ctrl f') // browser: find -> editor: find
			ui.capture_keydown(id, 'ctrl h') // browser: history -> editor: replace
			ui.capture_keydown(id, 'ctrl s') // browser: save as html -> editor: save

			for (let [event, full_key, key, key_char, ctrl, alt, shift] of ui.key_events) {
				if (event != 'down')
					continue
				let lines_n = 0
				let chars_n = 0
				let scroll_lines = 0

				// NOTE: some key combos are captured by browser, namely:
				// ctrl+pgup/dn, ctrl(+shift)+tab
				if      (key == 'arrowup'    && (!ctrl || shift)) lines_n = -1
				else if (key == 'arrowdown'  && (!ctrl || shift)) lines_n =  1
				else if (key == 'pageup'             ) lines_n = -(last_vline2 - last_vline1)
				else if (key == 'pagedown'           ) lines_n =  (last_vline2 - last_vline1)
				else if (key == 'home'       &&  ctrl) lines_n = -1/0
				else if (key == 'end'        &&  ctrl) lines_n =  1/0
				else if (key == 'arrowleft'          ) chars_n = -1
				else if (key == 'arrowright'         ) chars_n =  1
				else if (key == 'arrowup'    &&  ctrl) scroll_lines = -1
				else if (key == 'arrowdown'  &&  ctrl) scroll_lines =  1

				if (scroll_lines) { // scrolling without moving the cursor
					let ss = ui.state(id+'.text_scrollbox')
					// TODO: scroll_y is allowed to get out of range!
					ss.set('scroll_y', (ss.get('scroll_y') ?? 0) + scroll_lines * line_h)
				}

				if (chars_n)
					undo_group = 'move'

				// when moving multiple cursors vertically we clamp lines_n
				// so that the whole block can move as a whole.
				let max_lines_n = 0
				if (lines_n && !((key == 'arrowup' || key == 'arrowdown') && ctrl && shift)) {
					let line1 = cursors[0].line
					let line2 = cursors[0].line
					for (let c of cursors) {
						line1 = min(line1, c.line)
						line2 = max(line2, c.line)
					}
					max_lines_n = lines_n < 0
						? max(lines_n, -line1)
						: min(lines_n, (lines.length-1) - line2)
				}

				let cursor_i = -1
				for (let cursor of cursors) {
					cursor_i++
					if (chars_n < 0) { // navigation & selection
						if (cursor.char > 0) {
							if (ctrl) {
								let new_char = prev_token(cursor)
								set_cursor(cursor_i, cursor.line, new_char, shift)
							} else {
								set_cursor(cursor_i, cursor.line, cursor.char-1, shift)
							}
						} else if (cursor.line && cursors.length == 1) {
							let prev_line_s = lines[cursor.line-1]
							set_cursor(cursor_i, cursor.line-1, prev_line_s.length, shift)
						}
					} else if (chars_n > 0) {
						if (cursor.char < lines[cursor.line].length) {
							if (ctrl) {
								let new_char = next_token(cursor)
								set_cursor(cursor_i, cursor.line, new_char, shift)
							} else {
								set_cursor(cursor_i, cursor.line, cursor.char+1, shift)
							}
						} else if (cursor.line < lines.length-1 && cursors.length == 1) {
							set_cursor(cursor_i, cursor.line+1, 0, shift)
						}
					} else if (lines_n) {
						undo_group = 'move'
						if ((key == 'arrowup' || key == 'arrowdown') && ctrl && shift) {
							add_first_cursor(cursor.line, cursor.char)
							let new_line
							let new_char
							if (lines_n == -1/0) {
								new_line = 0
								new_char = 0
							} else if (lines_n == 1/0) {
								new_line = lines.length-1
								new_char = lines[new_line].length
							} else if (lines_n < 0) {
								new_line = max(cursor.line + lines_n, 0)
								new_char = cursor_want_col_char(cursor, new_line)
							} else {
								new_line = min(cursor.line + lines_n, lines.length-1)
								new_char = cursor_want_col_char(cursor, new_line)
							}
							set_cursor(cursor_i, new_line, new_char, false, true)
							break
						} else {
							let new_line = cursor.line + max_lines_n
							let new_char = cursor_want_col_char(cursor, new_line)
							set_cursor(cursor_i, new_line, new_char, shift, true)
						}
					} else if (full_key == 'ctrl a') {
						undo_group = 'select_all'
						remove_extra_cursors()
						set_cursor(cursor_i, 0, 0, 'select_all')
					} else if (key == 'escape') {
						undo_group = 'move'
						remove_extra_cursors()
						set_cursor(cursor_i, cursor.line, cursor.char, false)
					} else if (key_char) { // typing, deleting, indent
						undo_group = 'insert'
						remove_selection(cursor_i)
						insert_char_at(cursor.line, cursor.char, key_char)
					} else if (key == 'enter') {
						undo_group = 'insert'
						remove_selection(cursor_i)
						insert_line_at(cursor.line, cursor.char)
					} else if (key == 'backspace' || key == 'delete') {
						undo_group = 'delete'
						if (cursor_has_selection(cursor)) {
							remove_selection(cursor_i)
						} else if (key == 'delete') {
							remove_char_at(cursor.line, cursor.char)
						} else if (cursor.char) {
							remove_char_at(cursor.line, cursor.char-1)
						} else if (cursor.line) {
							remove_char_at(cursor.line-1, lines[cursor.line-1].length)
						} else
							continue
					} else if (full_key == 'tab') {
						undo_group = 'indent'
						indent_selection(cursor_i)
					} else if (full_key == 'shift tab') {
						undo_group = 'indent'
						outdent_selection(cursor_i)
					} else if (full_key == 'ctrl c') { // cut, copy, paste
						let sel_text = selected_text(cursor)
						navigator.clipboard.writeText(sel_text)
					} else if (full_key == 'ctrl x') {
						undo_group = 'cut'
						let sel_text = selected_text(cursor)
						navigator.clipboard.writeText(sel_text)
						remove_selection(cursor_i)
					} else if (key == 'paste') {
						undo_group = 'paste'
						remove_selection(cursor_i)
						insert_text_at(cursor.line, cursor.char, ui.clipboard_text, true)
					} else if (full_key == 'ctrl z') { // undo, redo
						undo_group = 'undo'
						undo()
						break
					} else if (full_key == 'ctrl shift z' || full_key == 'ctrl y') {
						undo_group = 'undo'
						redo()
						break
					} else if (full_key == 'ctrl f') { // search, replace
						// TODO: find
						pr('FIND')
					} else if (full_key == 'ctrl h') {
						// TODO: replace
						pr('REPLACE')
					}
				}
			}

			undo_group = null // every key stroke must specify undo_group

		} // for ui.key_events

		// build editor

		ui.v(1, 0, 's', 's', min_w, min_h)
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

	reset_editor(opt.code)

	return e
}

ui.code_edit = function(id, opt, min_w, min_h) {
	ui.keepalive(id)
	let s = ui.state(id)
	let view = s.get('view')
	if (!view) {
		view = code_edit_view(id, opt)
		ui.on_free(id, () => view.free())
		s.set('view', view)
	}
	view.render(min_w, min_h)
}

}()) // module function
