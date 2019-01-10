import {SPECS} from 'battlecode';
import {alldirs, preacherdirs, preacherattackdirs} from 'constants.js'
var target = null;
var reachedTarget = false;
var altTargets;
var targetNum = 0;

export var Preacher = function() {

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
                else {
                  curr_score -= 30;
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
    if (reachedTarget) {
        this.log("Switching targets!");
        reachedTarget = false;
        targetNum = (targetNum + 1) % altTargets.length;
        target = altTargets[targetNum];
    }
    
    return this.moveto(target);
}
