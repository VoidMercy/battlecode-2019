import {SPECS} from 'battlecode'
import {alldirs, range4, range10, CONTESTED_CHURCH_DIST} from 'constants.js'
import {getLocs} from 'churchloc.js'

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
    // this.log("PLANNED CHURCHES");
    // this.log(plannedchurches);
}

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
        this.log("Prophet here!");
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
    if (nearbyEnemy) {
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
                    if (dist <= 64 && dist >= 16) {
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
            if (robotsnear[i].unit == SPECS.PREACHER && this.distance([this.me.x, this.me.y], [robotsnear[i].x, robotsnear[i].y]) <= SPECS.UNITS[robotsnear[i].unit].ATTACK_RADIUS[1] + 4) {
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

    if (im_contested_rushing) {
        if (this.distance([this.me.x, this.me.y], waypoints[curwaypoint]) <= 10 || (robotmap[waypoints[curwaypoint][1]][waypoints[curwaypoint][0]] > 0)) {
            if (this.distance([this.me.x, this.me.y], waypoints[curwaypoint]) <= 10 && this.distance(waypoints[0], waypoints[curwaypoint]) < 144) {
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
            target = this.find_idle_spot();
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
