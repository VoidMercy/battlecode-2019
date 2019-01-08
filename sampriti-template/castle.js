import {SPECS} from 'battlecode';

var x = 0;

export var Castle = function() {
    this.log("Castle counter: " + x++);
    if (this.step % 10 === 0) {
        this.log("Building a crusader at " + (this.me.x+1) + ", " + (this.me.y+1));
        return this.buildUnit(SPECS.CRUSADER, 1, 1);
    } else {
        return this.log("Castle health: " + this.me.health);
    }
}
