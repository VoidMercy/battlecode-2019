import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'

var target = null;
var reachedTarget = false;

export var Crusader = function() {
	if (target == null) {
		target = this.oppositeCoords([this.me.x, this.me.y]);
	} else if (target[0] == this.me.x && target[1] == this.me.y) {
        reachedTarget = true;
    }
    //attack if adjacent
    var robotsnear = this.getVisibleRobots();
    for (var i = 0; i < robotsnear.length; i++) {
        if (robotsnear[i].isVisible() && robotsnear[i].team != this.me.team) {
            var enemyLoc = [robotsnear[i].x, robotsnear[i].y];
            if (this.distance(enemyLoc, [this.me.x, this.me.y]) <= 2) {
                //adjacent, a t t a c c
                this.log("attacc");
                return this.attack(enemyLoc[0] - this.me.x, enemyLoc[1]- this.me.y);
            }
        }
    }

    for (var i = 0; i < robotsnear.length; i++) {
        if (robotsnear[i].team != this.me.team) {
            var enemyLoc = [robotsnear[i].x, robotsnear[i].y];
            //enemy team, chase!!!
            //picks first enemy in list
            this.log("Chase the enemy!");
            return this.greedyMove(enemyLoc);
        }
    }
    
	return this.moveto(target);
}
