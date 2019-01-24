import {SPECS} from 'battlecode'
import {alldirs, range4} from 'constants.js'

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
var im_contested_rushing = false;

export var Prophet = function() {
    // ranger

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
                        if (robot.signal % 8 == 1) {
                            target = [relStartPos[0], relStartPos[1]];
                            im_contested_rushing = true;
                        } else {
                            target = [robot.x + relStartPos[0], robot.y + relStartPos[1]];
                        }
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
        this.log("Prophet here!");
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

    // play defensively
    var robotsnear = this.getVisibleRobots();
    var robotmap = this.getVisibleRobotMap();

    //M I C R O 
    var damagetaken = {};
    var damagegiven = {};
    var closestEnem = {};
    var nearbyEnemy = false;
    for (var i = 0; i < robotsnear.length; i++) {
        if (this.isVisible(robotsnear[i]) && robotsnear[i].team != this.me.team) {
            nearbyEnemy = true;
            var enemloc = [robotsnear[i].x, robotsnear[i].y];
            for (var j = 0; j < range4.length; j++) {
                if (damagetaken[range4[j]] == undefined) {
                    damagetaken[range4[j]] = 0;
                }
                if (damagegiven[range4[j]] == undefined) {
                    damagegiven[range4[j]] = 0;
                }
                var newloc = [this.me.x + range4[j][0], this.me.y + range4[j][1]];
                if (this.validCoords(newloc) && this.map[newloc[1]][newloc[0]] && (robotmap[newloc[1]][newloc[0]] == 0 || robotmap[newloc[1]][newloc[0]] == this.me.id)) {
                    //must be valid, passable, and unoccupied (or it is me)
                    if ((SPECS.UNITS[robotsnear[i].unit].ATTACK_RADIUS != null && SPECS.UNITS[robotsnear[i].unit].ATTACK_RADIUS != 0) &&  SPECS.UNITS[robotsnear[i].unit].ATTACK_RADIUS[0] >= this.distance(newloc, enemloc) && SPECS.UNITS[robotsnear[i].unit].ATTACK_RADIUS[1] <= this.distance(newloc, enemloc)) {
                        damagetaken[range4[j]] += SPECS.UNITS[robotsnear[i].unit].ATTACK_DAMAGE;
                    }
                    if (closestEnem[range4[j]] == undefined || this.distance(newloc, enemloc) < closestEnem[range4[j]]) {
                        //closer enemy
                        closestEnem[range4[j]] = [this.distance(newloc, enemloc), this.distance(newloc, enemloc) <= SPECS.UNITS[this.me.unit].ATTACK_RADIUS[1] && this.distance(newloc, enemloc) >= SPECS.UNITS[this.me.unit].ATTACK_RADIUS[0]];
                    }
                    //i can attack if i move there
                    if (this.distance(newloc, enemloc) >= SPECS.UNITS[this.me.unit].ATTACK_RADIUS[0] && this.distance(newloc, enemloc) <= SPECS.UNITS[this.me.unit].ATTACK_RADIUS[1]) {
                        //within attack range
                        damagegiven[range4[j]] = 10;
                    }
                }
            }
        }
    }
    var firstBetterThanSecond = function(dir1, dir2) {
        if (damagetaken[dir1] < damagetaken[dir2]) {
            return true;
        }
        if (damagetaken[dir2] < damagetaken[dir1]) {
            return false;
        }
        if (closestEnem[dir1][1]) {
            if (!closestEnem[dir2][1]) {
                //second param cant be attacced but first one can
                return true;
            }
            return closestEnem[dir1][0] >= closestEnem[dir2][0];
        }
        if (closestEnem[dir2][1]) {
            return false;
        }
        return closestEnem[dir1][0] <= closestEnem[dir2][0];
    }
    if (nearbyEnemy) {
        //start at 1 because bestIndex starts at 0
        var bestIndex = -1;
        for (var i = 0; i < range4.length; i++) {
            var newloc = [this.me.x + range4[i][0], this.me.y + range4[i][1]];
            if (this.validCoords(newloc) && this.map[newloc[1]][newloc[0]] && (robotmap[newloc[1]][newloc[0]] == 0 || robotmap[newloc[1]][newloc[0]] == this.me.id)) {
                //this.log(closestEnem);
                //this.log(damagegiven);
                //this.log(range4[i]);
                //this.log(range4[bestIndex]);
                if (bestIndex == -1 || firstBetterThanSecond(range4[i], range4[bestIndex])) {
                    bestIndex = i;
                }
            }
        }
        //micro logic
        if (closestEnem[range4[bestIndex]][1] && damagetaken[range4[bestIndex]] == 0 && bestIndex != range4.length - 1 && (damagetaken[range4[range4.length-1]] != 0 || !closestEnem[range4[range4.length-1]][1])) {
            return this.move(...range4[bestIndex]);
        }
        //else attack
        var bestTarget = null;
        var bestScore = -1;
        var enemyPreachers = [];
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
            this.log("attacc");
            return this.attack(...bestTarget);
        }

        //if no target
        return this.move(...range4[bestIndex]);

    }

    /*
    // kite back from preachers
    for (var i = 0; i < robotsnear.length; i++) {
        if (this.isVisible(robotsnear[i]) && robotsnear[i].team != this.me.team) {
            if (robotsnear[i].unit == SPECS.PREACHER && this.distance([this.me.x, this.me.y], [robotsnear[i].x, robotsnear[i].y]) <= SPECS.UNITS[robotsnear[i].unit].ATTACK_RADIUS[1]) {
                var move = this.greedyMoveAway([robotsnear[i].x, robotsnear[i].y]);
                if (move != null) {
                    this.log("KITE BACK!!");
                    return move;
                }
            }
        }
    }

    // attacc
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
        this.log("attacc");
        return this.attack(...bestTarget);
    }

    // they're in my face
    for (var i = 0; i < robotsnear.length; i++) {
        if (robotsnear[i].team != this.me.team) {
            var enemyLoc = [robotsnear[i].x, robotsnear[i].y];
            if (this.distance(enemyLoc, [this.me.x, this.me.y]) <= 16) {
                this.log("run away");
                return this.greedyMoveAway(enemyLoc);
            }
        }
    }*/

    // go to position
    if (target != null && (this.me.x != target[0] || this.me.y != target[1])) {
        //this.log("prophet moving to defensive position!");
        return this.moveto(target);
    } else if (im_contested_rushing) {
        target = null;
        this.log("Moving towards enemy castle")
        return this.moveto(this.oppositeCoords(castleLoc));
    }
    return;


}
