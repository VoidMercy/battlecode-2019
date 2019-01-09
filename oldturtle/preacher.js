import {SPECS} from 'battlecode';
import {alldirs, preacherdirs, preacherattackdirs} from 'constants.js'

var target = null;
var castleLoc = null; 
export var Preacher = function() {

    if (this.me.turn == 1) {
        //first turn, find location of church/castle and obtain initial pos
        //todo: allow reassignment of target
        var tempmap = this.getVisibleRobotMap();
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

    var best_score = 0;
    var best_score_locs;
    var vismap = this.getVisibleRobotMap();
    for(var i = 0; i < preacherdirs.length; i++) {
        var attack_x = this.me.x + preacherdirs[i][0], attack_y = this.me.y + preacherdirs[i][1];
        if(!this.validCoords([attack_x, attack_y])) continue;
        if(vismap[attack_y][attack_x] <= 0) continue;
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
                curr_score += 20;
            }
        }
        if(attack_count >= 0 && curr_score >= best_score) {
            best_score = curr_score;
            best_score_locs = preacherdirs[i];
        }
    }
    if(best_score_locs != undefined) {
        this.log("PREACHER ATTACK");
        return this.attack(...best_score_locs);
    }

    if (this.me.x != target[0] || this.me.y != target[1]) {
        this.log("preacher moving to defensive position!");
        return this.moveto(target);
    }
    
    return this._bc_null_action();
}
