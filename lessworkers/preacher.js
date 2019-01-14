import {SPECS} from 'battlecode';
import {alldirs, preacherdirs, preacherattackdirs} from 'constants.js'

var target = null;
var castleLoc = null; 
var tempTarget = null;
var offenseFlag =  0;
var reachedTarget = false;
var altTargets;
var targetNum = 0;

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

    if (castleLoc != null && tempmap[castleLoc[1]][castleLoc[0]] > 0) { //listen for reposition signal
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

    if (offenseFlag == 1) {
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
    } else {
        // hehe no enemies do some autismo repositioning 
    }

    if (tempTarget != null) {
        this.log("repositioning ecks dee");
        return this.moveto(tempTarget);
    }

    if (reachedTarget || (target != null && !this.validCoords(target))) {
        //this.log("Switching targets!");
        reachedTarget = false;
        targetNum = (targetNum + 1) % altTargets.length;
        target = altTargets[targetNum];
    }

    if (target != null && (this.me.x != target[0] || this.me.y != target[1])) {
        //this.log("preacher moving to defensive position!");
        return this.moveto(target);
    }
    
    return this._bc_null_action();
}
