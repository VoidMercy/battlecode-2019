import {SPECS} from 'battlecode';

//all variables
var alldirs = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]



export var Crusader = function() {
    if (this.me.turn > 100) {
        return this.moveto([(this.me.x + 30) % this.map.length, (this.me.y + 30) % this.map.length]);
    } else {
        return; 
    }
}
