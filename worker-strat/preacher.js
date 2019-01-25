import {SPECS} from 'battlecode';
import {alldirs, preacherdirs, preacherattackdirs, otherdirs, range10, CONTESTED_CHURCH_DIST} from 'constants.js'
import {getLocs} from 'churchloc.js'

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
var im_contested_rushing = false;

// find church stuff
var plannedchurches = [];
var enemychurches = [];
var churches = null;
var NOT_CONTESTED = 0;
var CONTESTED = 1;
var VERY_CONTESTED = 2;

// rushing stuff
var waypoints = [];
var curwaypoint = 0;
var waypoints_siced = 0;

function find_church_locs() {
    //find optimal church locations that cover all karbonite
    churches = getLocs.call(this);
    var compare_func = function(a, b) {
        var first = a[0];
        var second = b[0];
        if (first == second) {
            return this.distance([0, 0], a[1]) - this.distance([0, 0], b[1]);
        }
        return second - first;
    }
    var parsed_churches = [];
    for (var i = 0; i < churches.length; i++) {
        for (var j = 0; j < churches[i].length; j++) {
            if (churches[i][j] != null)
                parsed_churches.push([churches[i][j], [i, j]]);
        }
    }
    parsed_churches.sort(compare_func.bind(this));
    // this.log(parsed_churches);

    var resource_count = 0;
    for (var i = 0; i < this.karbonite_map.length; i++) {
        for (var j = 0; j < this.karbonite_map[i].length; j++) {
            if (this.karbonite_map[i][j])
                resource_count += 1;
            if (this.fuel_map[i][j]) {
                resource_count += 1;
            }
        }
    }
    // this.log("NUMBER OF RESOURCES: " + resource_count);
    var myloc = castleLoc;

    var temp_karb_map = new Array(this.karbonite_map.length);
    var temp_fuel_map = new Array(this.fuel_map.length);

    for (var i = 0; i < temp_karb_map.length; i++) {
        temp_karb_map[i] = this.karbonite_map[i].slice();
        temp_fuel_map[i] = this.fuel_map[i].slice();
    }

    var total_resources_obtained = 0;

    for (var c = 0; c < parsed_churches.length; c++) {
        var nextchurchloc = parsed_churches[c][1];
        var my_dist_to = this.distance(myloc, nextchurchloc);
        var enemy_dist_to = this.distance(myloc, this.oppositeCoords(nextchurchloc));
        var dist_between_churches = this.distance(nextchurchloc, this.oppositeCoords(nextchurchloc));

        var resources_obtained_by_this_church = 0;

        for (var i = 0; i < range10.length; i++) {
            if (this.validCoords([range10[i][0] + nextchurchloc[0], range10[i][1] + nextchurchloc[1]]) && (temp_fuel_map[range10[i][1] + nextchurchloc[1]][range10[i][0] + nextchurchloc[0]] || temp_karb_map[range10[i][1] + nextchurchloc[1]][range10[i][0] + nextchurchloc[0]])) {
                resources_obtained_by_this_church += 1;
                temp_karb_map[range10[i][1] + nextchurchloc[1]][range10[i][0] + nextchurchloc[0]] = false;
                temp_fuel_map[range10[i][1] + nextchurchloc[1]][range10[i][0] + nextchurchloc[0]] = false;
            }
        }

        if (resources_obtained_by_this_church > 1) {
            total_resources_obtained += resources_obtained_by_this_church;
            // add to planned churches
            if (my_dist_to <= enemy_dist_to) {
                if (dist_between_churches >= CONTESTED_CHURCH_DIST) {
                    plannedchurches.push([NOT_CONTESTED, nextchurchloc, resources_obtained_by_this_church, false]);
                } else {
                    plannedchurches.push([CONTESTED, nextchurchloc, resources_obtained_by_this_church, false]);
                }
            } else {
                plannedchurches.push([VERY_CONTESTED, nextchurchloc, resources_obtained_by_this_church, false]);
            }
        }
    }
    this.log("PLANNED CHURCHES");
    // this.log(plannedchurches);
}

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
                    castleLoc = nextLoc;
                    find_church_locs.call(this);
                    //church/castle i spawned on
                    if (robot.signal != -1) {
                        this.log("SIGNAL");
                        if ((robot.signal & 7) === 5) {
                            this.log("SEX");
                            // i'm a rush unit
                            im_contested_rushing = true;
                            var index = (robot.signal >> 3) & 15;
                            var num = (robot.signal >> 13) & 3;
                            waypoints.push(plannedchurches[index][1]);
                            this.log("Prophet waypoint 1: " + plannedchurches[index][1]);
                            if (num == 2) {
                                index = (robot.signal >> 8) & 15;
                                waypoints.push(plannedchurches[index][1]);
                                this.log("Prophet waypoint 2: " + plannedchurches[index][1]);
                            }
                        } else if (robot.signal % 8 == 1) {
                            relStartPos = this.decodeSignal(robot.signal);
                            target = [relStartPos[0], relStartPos[1]];
                        } else {
                            relStartPos = this.decodeSignal(robot.signal);
                            target = [robot.x + relStartPos[0], robot.y + relStartPos[1]];
                        }
                    } else {
                        target = nextLoc;
                    }
                    break;
                }
            }
        }
        this.log(castleLoc);
    }

    // attack
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

    var robotmap = this.getVisibleRobotMap();

    // go to position
    if (im_contested_rushing) {
        if ((this.me.x == waypoints[curwaypoint][0] && this.me.y == waypoints[curwaypoint][1]) || (robotmap[waypoints[curwaypoint][1]][waypoints[curwaypoint][0]] > 0)) {
            if (this.me.x == waypoints[curwaypoint][0] && this.me.y == waypoints[curwaypoint][1] && this.distance(waypoints[0], waypoints[curwaypoint]) < 144) {
                this.log("YO COME GET THIS ASS RIGHT HERE");
                this.log(waypoints[curwaypoint]);
                this.log(this.distance(castleLoc, waypoints[curwaypoint]));

                var mindist = 9999999;
                var best_index = null;
                for (var i = 0; i < plannedchurches.length; i++) {
                    var dist = this.distance(waypoints[curwaypoint], plannedchurches[i][1]);
                    if (dist < mindist) {
                        mindist = dist;
                        best_index = i;
                    }
                }
                var talk = best_index | (2 << 5);
                this.castleTalk(talk);
            } else if (robotmap[waypoints[curwaypoint][1]][waypoints[curwaypoint][0]] > 0 && this.getRobot(robotmap[waypoints[curwaypoint][1]][waypoints[curwaypoint][0]]).unit == SPECS.CHURCH){
                waypoints_siced += 1;
            }
            curwaypoint = (curwaypoint + 1) % waypoints.length;
        }
        if (waypoints_siced == waypoints.length || (this.me.x == waypoints[curwaypoint][0] && this.me.y == waypoints[curwaypoint][1])) {
            this.log("STOP COCK BLOCKING");
            im_contested_rushing = false;
            target = this.find_idle_spot(castleLoc);
            this.log(target);
            // return this.moveto(this.oppositeCoords(castleLoc));
        } else {
            return this.moveto(waypoints[curwaypoint]);
        }
    }

    // go to position
    if (target != null && (this.me.x != target[0] || this.me.y != target[1])) {
        //this.log("prophet moving to defensive position!");
        return this.moveto(target);
    }
    return;    
}
