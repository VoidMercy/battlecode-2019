import {SPECS} from 'battlecode'
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
    }

    // go to position
    if (target != null && this.me.x != target[0] || this.me.y != target[1]) {
        //this.log("prophet moving to defensive position!");
        return this.moveto(target);
    }
    return;


}
