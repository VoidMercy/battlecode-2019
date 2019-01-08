import {SPECS} from 'battlecode';

//all variables
var alldirs = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]

var target = null;


export var Crusader = function() {
	if (target == null || (this.me.x == target[0] && this.me.y == target[1])) {
		target = [(this.me.x + 30) % this.map[0].length, (this.me.y + 30) % this.map.length];
	}
	return this.moveto(target);
}
