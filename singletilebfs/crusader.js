import {SPECS} from 'battlecode';

//all variables
var alldirs = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]

var x = 0;

export var Crusader = function() {
    this.log("Crusader counter: " + x++);
    this.log("Crusader health: " + this.me.health);
    const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    const choice = choices[Math.floor(Math.random()*choices.length)];
    return this.move(...choice);
}
