
// connected-dots animated background widget

(function () {
"use strict"

let dot_density = 2 // per 100px^2 surface
let max_distance = 200 // between two dots

function point_distance(p1, p2) {
	let dx = Math.abs(p1.x - p2.x)
	let dy = Math.abs(p1.y - p2.y)
	return Math.sqrt(dx**2 + dy**2)
}

function random(min, max) {
	return Math.random() * (max - min) + min
}
function coinflip(a, b) {
	return Math.random() > 0.5 ? a : b
}

ui.widget('connected_dots_bg', {

	create: function(cmd, id) {
		ui.assert(id, 'id required')
		ui.cmd(cmd, 0, 0, 0, 0, id)
	},

	position: function(a, i, axis, sx, sw) {
		a[i+0+axis] = sx
		a[i+2+axis] = sw
	},

	translate: function(a, i, dx, dy) {
		a[i+0] += dx
		a[i+1] += dy

		let w  = a[i+2]
		let h  = a[i+3]
		let id = a[i+4]

		let dots = ui.state(id, 'dots')
		if (!dots) {
			dots = []
			ui.state_set(id, 'dots', dots)

			let dot_num = w * h / 10000 * dot_density
			for (let i = 0; i < dot_num; i++) {
				let t = {}
				let d = max_distance
				t.x  = random(-d, w+d)
				t.y  = random(-d, h+d)
				t.vx = random(0.2, 1) * coinflip(1, -1)
				t.vy = random(0.2, 1) * coinflip(1, -1)
				dots.push(t)
			}
			dots.mouse_dot = {}
			dots.push(dots.mouse_dot)
		}
	},

	draw: function(a, i) {

		let cx = ui.cx

		let x  = a[i+0]
		let y  = a[i+1]
		let w  = a[i+2]
		let h  = a[i+3]
		let id = a[i+4]

		let dots = ui.state(id, 'dots')

		dots.mouse_dot.x = (ui.mx ?? -1000) - x
		dots.mouse_dot.y = (ui.my ?? -1000) - y

		cx.save()

		cx.translate(x, y)

		cx.beginPath()
		cx.rect(0, 0, w, h)
		cx.clip()

		for (let t of dots) {
			if (t != dots.mouse_dot) {
				cx.fillStyle = ui.fg('label')[0]
				cx.beginPath()
				cx.arc(t.x, t.y, 2, 0, Math.PI*2, true)
				cx.closePath()
				cx.fill()
			}
		}

		for (let i = 0; i < dots.length; i++) {
			for (let j = i+1; j < dots.length; j++) {
				let t1 = dots[i]
				let t2 = dots[j]
				let dp = point_distance(t1, t2) / max_distance
				if (dp < 1) {
					let alpha = 1 - dp
					cx.strokeStyle = ui.hsl_adjust(ui.fg('label'), 1, 1, 1, alpha)
					cx.lineWidth = 0.8
					cx.beginPath()
					cx.moveTo(t1.x, t1.y)
					cx.lineTo(t2.x, t2.y)
					cx.stroke()
				}
			}
		}

		for (let t of dots) {
			if (t != dots.mouse_dot) {
				t.x += t.vx
				t.y += t.vy
				let d = max_distance
				if (!(t.x > -d && t.x < w+d && t.y > -d && t.y < h+d)) { // dead
					if (coinflip(0, 1)) {
						t.x = random  (-d, w+d)
						t.y = coinflip(-d, h+d)
					} else {
						t.x = coinflip(-d, w+d)
						t.y = random  (-d, h+d)
					}
					t.vx = random(0.2, 1) * (t.x > w / 2 ? -1 : 1)
					t.vy = random(0.2, 1) * (t.y > h / 2 ? -1 : 1)
				}
			}
		}

		cx.restore()

		ui.animate()
	},

})

}()) // module function
