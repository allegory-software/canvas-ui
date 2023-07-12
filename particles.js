
// connected-dots animated background widget

(function () {
"use strict"

function point_distance(p1, p2) {
	let dx = Math.abs(p1.x - p2.x)
	let dy = Math.abs(p1.y - p2.y)
	return Math.sqrt(dx**2 + dy**2)
}

function random(min, max) {
	return Math.random() * (max - min) + min
}

function make_dot(t, w, h) {
	let pos = Math.floor(random(0, 4))
	let R = 2
	let min = -1
	let max = 1
	t.r = R
	t.alpha = 1
	t.phase = random(0, 10)
	if (pos == 0) {
		t.x = random(0, w)
		t.y = -R
		t.vx = random(min, max)
		t.vy = random(0.1, max)
	} else if (pos == 1) {
		t.x = w + R
		t.y = random(0, h)
		t.vx = random(min, -0.1)
		t.vy = random(min, max)
	} else if (pos == 2) {
		t.x = random(0, w)
		t.y = h + R
		t.vx = random(min, max)
		t.vy = random(min, max)
	} else if (pos == 3) {
		t.x = -R
		t.y = random(0, h)
		t.vx = random(0.1, max)
		t.vy = random(min, max)
	}
	return t
}

ui.widget('connected_dots_bg', {
	create: function(cmd, id, dot_num) {
		assert(id, 'id required')
		this.cmd(cmd, 0, 0, 0, 0, id, dot_num ?? 30)
	},
	position: function(a, i, axis, sx, sw) {
		a[i+0+axis] = sx
		a[i+1+axis] = sw
	},
	translate: function(a, i, dx, dy) {
		a[i+0] += dx
		a[i+1] += dy

		let w       = a[i+2]
		let h       = a[i+3]
		let id      = a[i+4]
		let dot_num = a[i+5]

		let dots = this.state(id, 'dots')
		if (!dots) {
			dots = []
			this.state_set(id, 'dots', dots)

			for (let i = 1; i <= dot_num; i++)
				dots.push(make_dot({}, w, h))

			dots.mouse_dot = {vx: 0, vy: 0, r: 0}
			dots.push(dots.mouse_dot)
		}
	},
	draw: function(a, i) {

		let w       = a[i+2]
		let h       = a[i+3]
		let id      = a[i+4]
		let dot_num = a[i+5]

		let dots = this.state(id, 'dots')

		dots.mouse_dot.x = this.mx
		dots.mouse_dot.y = this.my

		for (let b of dots) {
			if (b.x != null) {
				cx.fillStyle = 'rgba(207, 255, 4)'
				cx.beginPath()
				cx.arc(Math.round(b.x), Math.round(b.y), 2, 0, Math.PI*2, true)
				cx.closePath()
				cx.fill()
			}
		}

		for (let i = 0; i < dots.length; i++) {
			for (let j = i+1; j < dots.length; j++) {

				let dp = point_distance(dots[i], dots[j]) / 260

				if (dp < 1) {
					let alpha = 1 - dp
					cx.strokeStyle = 'rgba(150,150,150,'+alpha+')'
					cx.lineWidth = 0.8
					cx.beginPath()
					cx.moveTo(dots[i].x, dots[i].y)
					cx.lineTo(dots[j].x, dots[j].y)
					cx.stroke()
				}
			}
		}

		for (let t of dots) {
			if (t != dots.mouse_dot) {
				t.x += Math.round(t.vx)
				t.y += Math.round(t.vy)
				if (t.x > -50 && t.x < w+50 && t.y > -50 && t.y < h+50) { // alive
					t.phase += 0.03
					t.alpha = Math.abs(Math.cos(t.phase))
				} else { // dead, replace
					make_dot(t, w, h)
				}
			}
		}

	},
}

}()) // module function
