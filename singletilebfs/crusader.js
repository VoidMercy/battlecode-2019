import {SPECS} from 'battlecode';

//all variables
var alldirs = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]

var target = null;
var reachedTarget = false;

export var Crusader = function() {
	if (target == null) {
		target = this.oppositeCoords([this.me.x, this.me.y]);
	} else if (target[0] == this.me.x && target[1] == this.me.y) {
        reachedTarget = true;
    }
    //TODO: attack if close enough xd
    var robotsnear = this.getVisibleRobots();
    for (var i = 0; i < robotsnear.length; i++) {
        if (robotsnear[i].team != this.me.team) {
            //enemy team, chase!!!
            //picks first enemy in list
            this.log("Chase the enemy!");
            return this.greedyMove([robotsnear[i].x, robotsnear[i].y]);
        }
    }

	return this.moveto(target);
}
