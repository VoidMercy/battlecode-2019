import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'

export var Prophet = function() {
	// ranger

	if (target == null) {
        var opposite = this.oppositeCoords([this.me.x, this.me.y]);
        altTargets = [opposite,[this.map.length - this.me.x, this.map.length - this.me.y],[this.map.length - opposite[0], this.map.length - opposite[1]], [Math.floor(this.map.length / 2), Math.floor(this.map.length / 2)], [this.me.x, this.me.y]];
        for (var i = 0; i < altTargets.length; i++) {
            if (!this.map[altTargets[i][1]][altTargets[i][0]]) {
                altTargets.splice(i, 1); //remove impassable tile targets
            }
        }
        target = altTargets[targetNum];
	} else if (target[0] == this.me.x && target[1] == this.me.y) {
        reachedTarget = true;
    }
    //attack if adjacent
    var robotsnear = this.getVisibleRobots();
    for (var i = 0; i < robotsnear.length; i++) {
        if (this.isVisible(robotsnear[i]) && robotsnear[i].team != this.me.team) {
            var enemyLoc = [robotsnear[i].x, robotsnear[i].y];

            const dist = this.distance(enemyLoc, [this.me.x, this.me.y]);
            if (dist <= 64 && dist >= 16) {
                //adjacent, a t t a c c
                this.log("attacc");
                return this.attack(enemyLoc[0] - this.me.x, enemyLoc[1]- this.me.y);
            }
        }
    }

    for (var i = 0; i < robotsnear.length; i++) {
        if (robotsnear[i].team != this.me.team) {
            var enemyLoc = [robotsnear[i].x, robotsnear[i].y];
            if (this.distance(enemyLoc, [this.me.x, this.me.y]) < 16) {
	            this.log("run away");
	            return this.greedyMoveAway(enemyLoc);
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
    if (reachedTarget) {
        this.log("Switching targets!");
        reachedTarget = false;
        targetNum = (targetNum + 1) % altTargets.length;
        target = altTargets[targetNum];
    }
    
    return this.moveto(target);

}
