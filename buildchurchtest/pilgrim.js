import {SPECS} from 'battlecode'
import {alldirs} from 'constants.js'
import {getLocs} from 'churchbuildingheuristics.js'

//pilgrim variables
var karbfuel = 0;
var karblocation = null;
var builtchurch = false;
var churchloc = null;
var castleloc = null;
var goback = false;
var blacklistkarb = [];
var potentialChurchLocs = null;

export var Pilgrim = function(self) {
    if (castleloc == null) {
        //find the castle i was spawned from
        var tempmap = this.getVisibleRobotMap();
        for (var i = 0; i < alldirs.length; i++) {
            if (this.validCoords([this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]])) {
                var tempid = tempmap[this.me.y + alldirs[i][1]][this.me.x + alldirs[i][0]];
                if (tempid > 0) {
                    var robottype = this.getRobot(tempid).unit;
                    if (robottype == SPECS.CASTLE || robottype == SPECS.CHURCH) {
                        //this.log("FOUND CASTLE");
                        castleloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                        break;
                    }
                }
            }
        }
    }

    if (potentialChurchLocs == null) {
        potentialChurchLocs = getLocs.call(this);
        this.log(potentialChurchLocs);
    }

    var robotsnear = this.getVisibleRobotMap();

    if (karblocation != null) {
        if ((this.me.x != karblocation[0] || this.me.y != karblocation[1]) && robotsnear[karblocation[1]][karblocation[0]] > 0) {
            //this.log("OCCUPIED KARBONITE SQUARE");
            karbfuel = (karbfuel + 1) % 2;
            blacklistkarb.push(this.hash(...karblocation));
            karblocation = null;
        }
    }

    var pass = false;
    while (karblocation == null) {
        if (pass) {
            blacklistkarb = [];
        }
        //find closest karbonite
        var queue = [];
        var visited = [];
        queue.push([this.me.x, this.me.y]);
        visited.push(this.hash(this.me.x, this.me.y));
        while (queue.length != 0) {
            var cur = queue.shift();
            if (karbfuel == 0) {
                if (this.karbonite_map[cur[1]][cur[0]] == true && !(blacklistkarb.includes(this.hash(...cur)))) {
                    karblocation = cur;
                    //this.log("FOUND KARBONITE");
                    //this.log(cur);
                    break;
                }
            } else {
                if (this.fuel_map[cur[1]][cur[0]] == true && !(blacklistkarb.includes(this.hash(...cur)))) {
                    karblocation = cur;
                    //this.log("FOUND FUEL");
                    //this.log(cur);
                    break;
                }
            }
            
            for (var i = 0; i < alldirs.length; i++) {
                var nextloc = [cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]];
                if (this._bc_check_on_map(...nextloc) && visited.includes(this.hash(...nextloc)) == false) {
                    queue.push([cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]]);
                    visited.push(this.hash(cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]));
                }
            }
        }
        pass = true;
    }


    // check my surroundings


    var check = false;
    if (karbfuel == 0) {
        check = this.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY;
    } else {
        check = this.me.fuel < SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY;
    }
    var nearby = this.getVisibleRobots();
    for (var i = 0; i < nearby.length; i++) {
        //check if any enemies can attack me
        if (nearby[i].team != this.me.team && SPECS.UNITS[nearby[i].unit].ATTACK_RADIUS != null && SPECS.UNITS[nearby[i].unit].ATTACK_RADIUS[1] >= this.distance([this.me.x, this.me.y], [nearby[i].x, nearby[i].y]) + 4) {
            goback = true;
            break;
        }
    }
    if (check && !goback) {
        //i didn't finish mining yet
        if (this.me.x != karblocation[0] || this.me.y != karblocation[1]) {
            //move to karbonite
            //this.log("HEADING TOWARDS KARBONITE TO MINE FOR CASTLE");
            return this.moveto(karblocation);
        } else {
            //this.log("MINING FOR CASTLE");
            return this.mine();
        }
    } else {
        var enemies = this.getVisibleRobots();
            //move away from closest enemy if it is offensive
        var minDist = 99999;
        var closest = null;
        for (var i = 0; i < enemies.length; i++) {
            if (enemies[i].team != this.me.team && SPECS.UNITS[enemies[i].unit].ATTACK_RADIUS != null && this.distance([this.me.x, this.me.y], [enemies[i].x, enemies[i].y]) < minDist) {
                minDist = this.distance([this.me.x, this.me.y], [enemies[i].x, enemies[i].y]);
                closest = enemies[i];
                //find closest attacking unit
            }
        }
        if (closest != null && this.me.fuel == 0 && this.me.karbonite == 0) {
            //i gave the drugs and enemies are coming!!
            
            //this.log(enemies);
            //this.log(this.me);
            this.log("running awaay after giving resources!");
            //this.log(typeof closest);
            //this.log(closest);
            return this.greedyMoveAway([closest.x, closest.y]);
        } else if (this.distance([this.me.x, this.me.y], castleloc) <= 2) {
            //i gots the drugs, now move to castle and give drugs
            //this.log("GIVING TO CASTLE");
            goback = false;
            return this.give(castleloc[0] - this.me.x, castleloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
        } else {
            //this.log("MOVING BACK TO CASTLE TO GIVE DRUGS");
            return this.moveto(castleloc);
        }
    }
    return this._bc_null_action();
}
