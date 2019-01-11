import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'

var target = null;
var reachedTarget = false;
var altTargets;
var targetNum = 0;
var castleLoc = null;
var tempTarget = null;
var offenseFlag = 2;

export var Crusader = function() {
	// knight

    var tempmap = this.getVisibleRobotMap();
    if (this.me.turn == 1) {
        //first turn, find location of church/castle and obtain initial pos
        for (var i = 0; i < alldirs.length; i++) {
            var nextLoc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
            if (this.validCoords(nextLoc)) {
                var robot = this.getRobot(tempmap[nextLoc[1]][nextLoc[0]]);
                if (tempmap[nextLoc[1]][nextLoc[0]] > 0 &&
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
                        target = nextLoc;
                    }
                    castleLoc = nextLoc;
                    break;
                }
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


    var robotsnear = this.getVisibleRobots();
    var robot = null;
    for (var i=0; i < robotsnear.length; i++) {
        robot = robotsnear[i];
        if (this.isRadioing(robot) && robot.signal == 69 && offenseFlag != 1) {
            offenseFlag=1;
            this.log("received signal!");
            target = null;
            break;
        }
    }

    // defend if 0, attack if 1, defend method 2 if 2

    if (offenseFlag == 1) {
        //this.log("offense flag activated");
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
        var bestTarget = null;
        var bestScore = -1;
        for (var i = 0; i < robotsnear.length; i++) {
            if (this.isVisible(robotsnear[i]) && robotsnear[i].team != this.me.team) {
                var enemyLoc = [robotsnear[i].x, robotsnear[i].y];

                const dist = this.distance(enemyLoc, [this.me.x, this.me.y]);
                if (dist < 16) {
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
            if (this.isVisible(robotsnear[i]) && robotsnear[i].team != this.me.team) {
                var enemyLoc = [robotsnear[i].x, robotsnear[i].y];
                //enemy team, chase!!!
                //picks first enemy in list
                this.log("Chase the enemy!");
                return this.greedyMove(enemyLoc);
            }
        }
        if (reachedTarget) {
            //this.log("Switching targets!");
            reachedTarget = false;
            targetNum = (targetNum + 1) % altTargets.length;
            target = altTargets[targetNum];
        }
        return this.moveto(target);


    } else if (offenseFlag == 0) {
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

        if (minDist < 16) {
            //adjacent, a t t a c c
            this.log("crusader attacc");
            return this.attack(toTarget[0] - this.me.x, toTarget[1]- this.me.y);
        }

        if (tempTarget != null) {
            this.log("repositioning ecks dee");
            return this.moveto(tempTarget);
        }    

        if (target != null && this.me.x != target[0] || this.me.y != target[1]) {
            //this.log("prophet moving to defensive position!");
            return this.moveto(target);
        }
        return;

    } else {
        // play defensively, version 2
        //attack if adjacent
        var robotsnear = this.getVisibleRobots();
        var bestTarget = null;
        var bestScore = -1;
        for (var i = 0; i < robotsnear.length; i++) {
            if (this.isVisible(robotsnear[i]) && robotsnear[i].team != this.me.team) {
                var enemyLoc = [robotsnear[i].x, robotsnear[i].y];

                const dist = this.distance(enemyLoc, [this.me.x, this.me.y]);
                if (dist <= 16) {
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

            this.log("crusader attacc");
            return this.attack(...bestTarget);
        }

        if (tempTarget != null) {
            this.log("repositioning ecks dee");
            return this.moveto(tempTarget);
        }    

        if (target != null && this.me.x != target[0] || this.me.y != target[1]) {
            //this.log("prophet moving to defensive position!");
            return this.moveto(target);
        }
        return;

    }



}
