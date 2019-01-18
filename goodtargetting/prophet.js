import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'

var target = null;
var reachedTarget = false;
var altTargets;
var targetNum = 0;
var castleLoc = null;
var tempTarget = null;
var offenseFlag = 0;
var relStartPos = null;
var receivedCastleLocs = 0;
var enemy_castle_locs = [];

export var Prophet = function() {
    // ranger
    
    if (this.me.turn > 3) { //to avoid conflicting with castle locations 
        this.castleTalk((receivedCastleLocs << 3) + this.me.unit + 1); //signifies "im a prophet and im alive"
    }

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
                        //this.log("SIGNAL");
                        //this.log(robot.signal);
                        relStartPos = this.decodeSignal(robot.signal);
                        target = [robot.x + relStartPos[0], robot.y + relStartPos[1]];
                        //this.log("Received: ");
                        //this.log(relStartPos);
                    } else {
                        //this.log("NO SIGNAL!");
                        target = nextLoc;
                    }
                    castleLoc = nextLoc;
                    break;
                }
            }
        }
        this.log(castleLoc);
        this.log(target);
    }
    
    if (castleLoc != null && tempmap[castleLoc[1]][castleLoc[0]] > 0) {
        var castle = this.getRobot(tempmap[castleLoc[1]][castleLoc[0]]);
        if (castle.signal != -1 && castle.signal % 8 == 6) {
            this.log("REPOSITIONAL SIGNAL");
            this.log(castle.signal);
            var relStartPos = this.decodeSignal(castle.signal);
            target = [castle.x + relStartPos[0], castle.y + relStartPos[1]];
            this.log("Received: ");
            this.log(relStartPos);
        }
    }

    /*
    if (tempTarget != null && this.distance(tempTarget, [this.me.x, this.me.y]) <= 4) {
        //close enough to temp target, we are probably aggrod onto enemy and/or enemy is dead now
        tempTarget = null;
    }*/


    var robotsnear = this.getVisibleRobots();
    var robot = null;
    for (var i=0; i < robotsnear.length; i++) {
        //read signal for castle locations
        if (robotsnear[i].signal != 0 && robotsnear[i].signal % 8 == 2) {
            var decoded = this.decodeSignal(robotsnear[i].signal);
            var loc = [decoded[0], decoded[1]];
            if (this.validCoords(loc) && decoded[2] <= 3 && decoded[2] > 0) {
                var check = decoded[3] != this.me.team;
                if (check) { this.log("incorrect team field"); }
                for (var j = 0; j < enemy_castle_locs.length; j++) {
                    //make sure not already received
                    check = check || (enemy_castle_locs[j][0] == decoded[0] && enemy_castle_locs[j][1] == decoded[1]);
                }
                if (check) { this.log("already received"); }
                if (!check) {
                    //not already in the array
                    enemy_castle_locs.push(loc);
                    receivedCastleLocs++;
                    
                    if (receivedCastleLocs == decoded[2]) {
                        //have all castle locs, sice deets
                        target = null;
                        altTargets = enemy_castle_locs;
                        offenseFlag = 1;
                    }
                }
            }
        }
    }

    // defend if 0, attack if 1, defend method 2 if 2

    if (offenseFlag == 1) {
        //this.log("offense flag activated");
        // offensive ranger code
        if (target == null) {
            var opposite = this.oppositeCoords([this.me.x, this.me.y]);
            //todo: use comms to get enemy castle locations
            //altTargets = [opposite,[this.map.length - this.me.x, this.map.length - this.me.y],[this.map.length - opposite[0], this.map.length - opposite[1]], [Math.floor(this.map.length / 2), Math.floor(this.map.length / 2)], [0,0], [0, this.map.length-8], [this.map.length-8, this.map.length-8], [this.map.length-8, 0], [this.me.x, this.me.y]];
            for (var i = 0; i < altTargets.length; i++) {
                if (!this.validCoords([altTargets[i][0], altTargets[i][1]]) || !this.map[altTargets[i][1]][altTargets[i][0]]) {
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

            //this.log("attacc");
            return this.attack(...bestTarget);
        }

        for (var i = 0; i < robotsnear.length; i++) {
            if (this.isVisible(robotsnear[i]) && robotsnear[i].team != this.me.team) {
                var enemyLoc = [robotsnear[i].x, robotsnear[i].y];
                if (this.distance(enemyLoc, [this.me.x, this.me.y]) < SPECS.UNITS[this.me.unit].ATTACK_RADIUS[0]) {
                    this.log("run away");
                    return this.greedyMoveAway(enemyLoc);
                }
            }
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
        if (target == null || !this.validCoords(target) || reachedTarget) {
            //this.log("Switching targets!");
            reachedTarget = false;
            targetNum = (targetNum + 1) % altTargets.length;
            target = altTargets[targetNum];
        }
        if (target != null && this.validCoords(target)) {
            return this.moveto(target);
        }


    } else if (offenseFlag == 0) {
        // play defensively
        //attack if adjacent
        // play defensively, version 2
        //attack if adjacent
        var robotsnear = this.getVisibleRobots();
        var bestTarget = null;
        var bestScore = -1;
        var enemyPreachers = [];
        var friendlyUnits = [];
        for (var i = 0; i < robotsnear.length; i++) {

            if (this.isVisible(robotsnear[i])) {
                if (robotsnear[i].team != this.me.team) {
                    var enemyLoc = [robotsnear[i].x, robotsnear[i].y];
    
                    const dist = this.distance(enemyLoc, [this.me.x, this.me.y]);
                    if (dist <= 64 && dist > 16) {
                        //adjacent, a t t a c c
                        // determine best thing to shoot. 0 stands for Castle, 1 stands for Church, 2 stands for Pilgrim, 3 stands for Crusader, 4 stands for Prophet and 5 stands for Preacher.
                        // preacher > prophet > crusader > pilgrim > church > castle for now (ease of coding LMOA)
                        var priority = 0;
                        switch (robotsnear[i].unit) {
                            case SPECS.PROPHET:
                                priority = 5;
                                break;
                            case SPECS.PREACHER:
                                priority = 4;
                                break;
                            case SPECS.CRUSADER:
                                priority = 3;
                                break;
                            case SPECS.PILGRIM:
                                priority = 2;
                                break;
                            case SPECS.CASTLE:
                                priority = 1;
                                break;
                            default:
                                priority = 0;
                        }
                        var score = (100 + priority * 100 - dist);
                        if (score > bestScore) {
                            bestTarget = [enemyLoc[0] - this.me.x, enemyLoc[1]- this.me.y];
                            bestScore = score;
                        }
                    }
                    if (robotsnear[i].unit == SPECS.PREACHER) {
                        enemyPreachers.push(robotsnear[i]);
                    }
                }

            }
        }

        if (bestTarget != null) {
            // this.log("attacc");
            return this.attack(...bestTarget);
        }

        var spreadout = this.prophetSpread(enemyPreachers);
        if (spreadout != null) {
            this.log("spread out!");
            this.log(spreadout);
            this.log([this.me.x, this.me.y]);
            return this.move(spreadout[0], spreadout[1]);
        }

        for (var i = 0; i < robotsnear.length; i++) {
            if (robotsnear[i].team != this.me.team) {
                var enemyLoc = [robotsnear[i].x, robotsnear[i].y];
                if (this.distance(enemyLoc, [this.me.x, this.me.y]) <= 16) {
                    this.log("run away");
                    return this.greedyMoveAway(enemyLoc);
                }
            }
        }
        /*
        if (tempTarget != null) {
            this.log("repositioning ecks dee");
            return this.moveto(tempTarget);
        } */   

        if (target != null && this.me.x != target[0] || this.me.y != target[1]) {
            //this.log("prophet moving to defensive position!");
            return this.moveto(target);
        }
        return;

    }



}
