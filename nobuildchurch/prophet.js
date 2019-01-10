import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'

var target = null;
var reachedTarget = false;
var altTargets;
var targetNum = 0;
var castleLoc = null;
var tempTarget = null;

export var Prophet = function() {
	// ranger

    var offenseFlag = 0;
    // defend if 0, attack if 1

    var tempmap = this.getVisibleRobotMap();
    if (this.me.turn == 1) {
        //first turn, find location of church/castle and obtain initial pos
        for (var i = 0; i < alldirs.length; i++) {
            var nextLoc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
            var robot = this.getRobot(tempmap[nextLoc[1]][nextLoc[0]]);
            if (this.validCoords(nextLoc) && tempmap[nextLoc[1]][nextLoc[0]] > 0 &&
               (robot.unit == SPECS.CASTLE || robot.unit == SPECS.CHURCH)) {
                //church/castle i spawned on
                if (robot.signal != -1) {
                    this.log("SIGNAL");
                    this.log(robot.signal);
                    var relStartPos = this.decodeSignal(robot.signal);
                    target = [robot.x + relStartPos[0], robot.y + relStartPos[1]];
                    this.log("Received: ");
                    this.log(relStartPos);
                } else {
                    this.log("NO SIGNAL!");
                }
                castleLoc = nextLoc;
                break;
            }
        }
        this.log(castleLoc);
    }

    if (tempmap[castleLoc[1]][castleLoc[0]] > 0) {
        var castle = this.getRobot(tempmap[castleLoc[1]][castleLoc[0]]);
        if (castle.signal != -1 && castle.signal % 8 == 6) {
            this.log("REPOSITIONAL SIGNAL");
            this.log(castle.signal);
            var relStartPos = this.decodeSignal(castle.signal);
            tempTarget = [castle.x + relStartPos[0], castle.y + relStartPos[1]];
            this.log("Received: ");
            this.log(relStartPos);
        }
    }

    if (tempTarget != null && this.distance(tempTarget, [this.me.x, this.me.y]) <= 4) {
        //close enough to temp target, we are probably aggrod onto enemy and/or enemy is dead now
        tempTarget = null;
    }

    if (offenseFlag == 1) {
        // offensive ranger code
        if (target == null) {
            var opposite = this.oppositeCoords([this.me.x, this.me.y]);
            //todo: use comms to get enemy castle locations
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
        for (var i = 0; i < robotsnear.length; i++) {
            if (this.isVisible(robotsnear[i]) && robotsnear[i].team != this.me.team) {
                var enemyLoc = [robotsnear[i].x, robotsnear[i].y];

                const dist = this.distance(enemyLoc, [this.me.x, this.me.y]);
                if (dist <= SPECS.UNITS[this.me.unit].ATTACK_RADIUS[1] && dist >= SPECS.UNITS[this.me.unit].ATTACK_RADIUS[0]) {
                    //adjacent, a t t a c c
                    this.log("attacc");
                    return this.attack(enemyLoc[0] - this.me.x, enemyLoc[1]- this.me.y);
                }
            }
        }

        for (var i = 0; i < robotsnear.length; i++) {
            if (robotsnear[i].team != this.me.team) {
                var enemyLoc = [robotsnear[i].x, robotsnear[i].y];
                if (this.distance(enemyLoc, [this.me.x, this.me.y]) < SPECS.UNITS[this.me.unit].ATTACK_RADIUS[0]) {
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


    } else {
        // play defensively
        //attack if adjacent
        var robotsnear = this.getVisibleRobots();
        var minDist = 99999999;
        var toTarget = null;
        for (var i = 0; i < robotsnear.length; i++) {
            if (this.isVisible(robotsnear[i]) && robotsnear[i].team != this.me.team) {
                var enemyLoc = [robotsnear[i].x, robotsnear[i].y];

                const dist = this.distance(enemyLoc, [this.me.x, this.me.y]);
                if (dist < minDist) {
                    toTarget = enemyLoc;
                    minDist = dist;
                }
            }

        }

        if (minDist <= 16) {
            // too close get away
            return this.greedyMoveAway(toTarget);
        }

        if (minDist <= 64 && minDist > 16) {
            //adjacent, a t t a c c
            this.log("prophet attacc");
            return this.attack(toTarget[0] - this.me.x, toTarget[1]- this.me.y);
        }

        if (tempTarget != null) {
            this.log("repositioning ecks dee");
            return this.moveto(tempTarget);
        }    

        if (target != null && this.me.x != target[0] || this.me.y != target[1]) {
            this.log("prophet moving to defensive position!");
            return this.moveto(target);
        }
        return;

    }



}
