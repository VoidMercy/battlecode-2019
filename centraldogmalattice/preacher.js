import {SPECS} from 'battlecode';
import {alldirs, preacherdirs, preacherattackdirs, otherdirs} from 'constants.js'

var target = null;
var castleLoc = null; 
var tempTarget = null;
var offenseFlag =  0;
var reachedTarget = false;
var altTargets;
var relStartPos = null;
var targetNum = 0;
var underattack = false;
var therearepreachers = false;
var stuckcount = 0;
var receivedCastleLocs = 0;
var enemy_castle_locs = [];

export var Preacher = function() {

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
        this.log(castleLoc);
    }

    if (castleLoc != null && tempmap[castleLoc[1]][castleLoc[0]] > 0) { //listen for reposition signal
        var castle = this.getRobot(tempmap[castleLoc[1]][castleLoc[0]]);
        if (castle.signal != -1 && castle.signal % 8 == 6) {
            this.log("REPOSITIONAL SIGNAL");
            this.log(castle.signal);
            relStartPos = this.decodeSignal(castle.signal);
            target = [castle.x + relStartPos[0], castle.y + relStartPos[1]];
            if (relStartPos[2] == SPECS.PREACHER) {
                therearepreachers = true;
            }
            reachedTarget = false;
            underattack = true;
            this.log("Received: ");
            this.log(target);
        } else if (castle.signal != -1 && castle.signal == 6969) {
            this.log("we are not under attack anymore");
            underattack = false;
        }
    }
/*
    if (tempTarget != null && this.distance(tempTarget, [this.me.x, this.me.y]) <= 4) {
        //close enough to temp target, we are probably aggrod onto enemy and/or enemy is dead now
        tempTarget = null;
    }*/

    var robotsnear = this.getVisibleRobots();
    var robot = null;
    var enemyPreachers = [];
    for (var i=0; i < robotsnear.length; i++) {
        robot = robotsnear[i];
        if (this.isVisible(robot) && robotsnear[i].team != this.me.team && robotsnear[i].unit == SPECS.PREACHER) {
            enemyPreachers.push(robot);
        }
        //read signal for castle locations
        if (robotsnear[i].signal != 0 && robotsnear[i].signal % 8 == 2) {
            var decoded = this.decodeSignal(robotsnear[i].signal);
            var loc = [decoded[0], decoded[1]];
            if (this.validCoords(loc) && decoded[2] <= 3 && decoded[2] > 0) {
                var check = decoded[3] != this.me.team;
                for (var j = 0; j < enemy_castle_locs.length; j++) {
                    //make sure not already received
                    check = check || (enemy_castle_locs[j][0] == decoded[0] && enemy_castle_locs[j][1] == decoded[1]);
                }
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
    if (this.me.turn > 3) { //to avoid conflicting with castle locations 
        this.castleTalk((receivedCastleLocs << 3) + this.me.unit + 1); //signifies "im a preacher and im alive"
    }

    if (offenseFlag == 1) {
        if (target == null) {
            var opposite = this.oppositeCoords([this.me.x, this.me.y]);
            //todo: use comms to get enemy castle locations
            //altTargets = [opposite,[this.map.length - this.me.x, this.map.length - this.me.y],[this.map.length - opposite[0], this.map.length - opposite[1]], [Math.floor(this.map.length / 2), Math.floor(this.map.length / 2)], [0,0], [0, this.map.length-8], [this.map.length-8, this.map.length-8], [this.map.length-8, 0], [this.me.x, this.me.y]];
            for (var i = 0; i < altTargets.length; i++) {
                if (!this.validCoords([altTargets[i][0], altTargets[i][1]]) || !this.map[altTargets[i][1]][altTargets[i][0]]) {
                    //if target is impassable, look around for a passable tile within (3, 3) dx dy (positive only)
                    //one of these tiles MUST be passable, as one of them will have the enemy castle on it.
                    //altTargets.splice(i, 1); //remove impassable tile targets
                    var siced = false;
                    for (var j = 0; !siced && j < 3; j++) {
                        for (var k = 0; !siced && k < 3; k++) {
                            var enemloc = [altTargets[i][0] + j, altTargets[i][1] + k];
                            if (this.validCoords(enemloc) && this.map[enemloc[1]][enemloc[0]]) {
                                //found a passable terrain tile, set as new target
                                altTargets[i] = enemloc;
                                siced = true;
                            }
                        }
                    }
                    if (!siced) {
                        this.log("F code is borked or something, couldnt find passable terrain in given enemy castle loc");
                    }
                }
            }
            target = altTargets[targetNum];
        } else if (this.distance(target, [this.me.x, this.me.y]) <= SPECS.UNITS[this.me.unit].SPEED) {
            reachedTarget = true;
        }
    }

    //todo: use different micro for defense and offense LOL
    //aka if defensive, use castle for extra vision
    var best_score = 0;
    var best_score_locs;
    var vismap = this.getVisibleRobotMap();
    for(var i = 0; i < preacherdirs.length; i++) {
        var attack_x = this.me.x + preacherdirs[i][0], attack_y = this.me.y + preacherdirs[i][1];
        if(!this.canAttack([attack_x, attack_y])) continue;
        var curr_score = 0;
        var attack_count = 0;
        for(var j = 0; j < preacherattackdirs.length; j++) {
            var target_x = attack_x + preacherattackdirs[j][0], target_y = attack_y + preacherattackdirs[j][1];
            if(!this.validCoords([target_x, target_y])) continue;
            var target_robot = vismap[target_y][target_x];
            if(target_robot <= 0) continue;
            target_robot = this.getRobot(target_robot);
            if(target_robot.team == this.me.team) {
                if(target_x == this.me.x && target_y == this.me.y) {
                  curr_score -= 60;
                }
                else if(target_robot.unit == SPECS.CASTLE || target_robot.unit == SPECS.CHURCH) {
                  curr_score -= 80;
                }
                else if(target_robot.unit == SPECS.PILGRIM){
                  curr_score -= 5;
                } else {
                  curr_score -= 20;
                }
            }
            else {
                attack_count++;
                if(target_robot.unit == SPECS.CASTLE) {
                  curr_score += 60;
                }
                else if(target_robot.unit == SPECS.CHURCH) {
                  curr_score += 40;
                }
                else {
                  curr_score += 20;
                }
            }
        }
        if(attack_count > 0 && curr_score >= best_score) {
            best_score = curr_score;
            best_score_locs = preacherdirs[i];
        }
    }

    if(best_score_locs != undefined) {
        this.log("PREACHER ATTACK");
        return this.attack(...best_score_locs);
    }

    /*
    //if signal says preacher exists, spread out :O
    //this.log(typeof relStartPos);
    if (underattack && therearepreachers && offenseFlag == 0) {
        //only do this in defensive mode
        var needSpread = false;
        for (var i = 0; i < alldirs.length; i++) {
            //first check if adjacent to units to avoid never attacking lol
            var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
            if (this.validCoords(nextloc) && tempmap[nextloc[1]][nextloc[0]] > 0) {
                if (this.getRobot(tempmap[nextloc[1]][nextloc[0]]).team == this.me.team && this.getRobot(tempmap[nextloc[1]][nextloc[0]]).unit >= 3) {
                    needSpread = true;
                    break;
                }
            }
        }
        this.log("SPREAD OUT NIGGERS");
        if (needSpread) {
            var maxdist = -1;
            var bestpos = null;
            for (var i = 0; i < otherdirs.length; i++) {
                var nextloc = [this.me.x + otherdirs[i][0], this.me.y + otherdirs[i][1]];
                if (this.validCoords(nextloc) && tempmap[nextloc[1]][nextloc[0]] > 0) {
                    var good = true;
                    for (var j = 0; j < robotsnear.length; j++) {
                        if (this.distance(nextloc, [robotsnear[j].x, robotsnear[j].y]) <= 2) {
                            good = false;
                            break;
                        }
                    }
                    if (good) {
                        var dist = this.distance(nextloc, target);
                        if (dist > maxdist) {
                            maxdist = dist;
                            bestpos = nextloc;
                        }
                    }
                }
            }
            this.log("SPREAD THAT PUSSY");
            this.move(bestpos[0] - this.me.x, bestpos[1] - this.me.y);
        }
    }*/

    /*
    if (tempTarget != null) {
        this.log("repositioning ecks dee");
        var move = this.nopreachermoveto(tempTarget);
        if (move != null) {
            this.move(...move);
        } else {
            stuckcount++;
            if (stuckcount >= 4) {
                target = [this.me.x, this.me.y];
            }
        }
    }*/

    if (reachedTarget || (target != null && !this.validCoords(target))) {
        //this.log("Switching targets!");
        reachedTarget = false;
        targetNum = (targetNum + 1) % altTargets.length;
        target = altTargets[targetNum];
    }

    if (target != null && (this.me.x != target[0] || this.me.y != target[1])) {
        //this.log("preacher moving to defensive position!");
        // this.log("TRY TO MOVE");
        if (offenseFlag) {
            return this.moveto(target);
        }
        var move = this.nopreachermoveto(target);
        if (move != null) {
            stuckcount = 0;
            return this.move(...move);
        } else {
            stuckcount++;
            if (stuckcount >= 6) {
                target = [this.me.x, this.me.y];
            }
        }
    }
    
    return this._bc_null_action();
}
