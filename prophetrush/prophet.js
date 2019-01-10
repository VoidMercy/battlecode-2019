import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'

var target = null;
var reachedTarget = false;
var altTargets;
var targetNum = 0;

export var Prophet = function() {
	// ranger

	if (target == null) {
        var opposite = this.oppositeCoords([this.me.x, this.me.y]);
        altTargets = [opposite,[this.map.length - this.me.x, this.map.length - this.me.y],[this.map.length - opposite[0], this.map.length - opposite[1]], [Math.floor(this.map.length / 2), Math.floor(this.map.length / 2)], [0,0], [0, this.map.length-8], [this.map.length-8, this.map.length-8], [this.map.length-8, 0], [this.me.x, this.me.y]];
        for (var i = 0; i < altTargets.length; i++) {
            if (this.validCoords([altTargets[i][0], altTargets[i][1]]) && !this.map[altTargets[i][1]][altTargets[i][0]]) {
                altTargets.splice(i, 1); //remove impassable tile targets
            }
        }
        target = altTargets[targetNum];
	} else if (this.distance(target, [this.me.x, this.me.y]) <= SPECS.UNITS[this.me.unit].SPEED) {
        reachedTarget = true;
    }
    //attack if adjacent
    var robotsnear = this.getVisibleRobots();
    var bestTarget = null;
    var bestScore = -1;
    for (var i = 0; i < robotsnear.length; i++) {
        if (this.isVisible(robotsnear[i]) && robotsnear[i].team != this.me.team) {
            var enemyLoc = [robotsnear[i].x, robotsnear[i].y];

            const dist = this.distance(enemyLoc, [this.me.x, this.me.y]);
            if (dist <= 64 && dist >= 16) {
                //adjacent, a t t a c c
                // determine best thing to shoot. 0 stands for Castle, 1 stands for Church, 2 stands for Pilgrim, 3 stands for Crusader, 4 stands for Prophet and 5 stands for Preacher.
                // preacher > prophet > crusader > pilgrim > church > castle for now (ease of coding LMOA)
                var score = (100 + robotsnear[i].unit * 100 - dist);
                if (score > bestScore) {
                    bestTarget = [enemyLoc[0] - this.me.x, enemyLoc[1]- this.me.y];
                    bestScore = score;
                }
            }

        }
    }
    if (bestTarget != null) {

        this.log("attacc");
        return this.attack(...bestTarget);
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
