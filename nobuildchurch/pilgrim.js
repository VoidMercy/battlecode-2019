import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'

//pilgrim variables
var karbfuel = 0;
var karblocation = null;
var builtchurch = false;
var churchloc = null;
var castleloc = null;
var blacklistkarb = [];

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

    var robotsnear = this.getVisibleRobotMap();

    if (karblocation != null) {
        if ((this.me.x != karblocation[0] || this.me.y != karblocation[1]) && robotsnear[karblocation[1]][karblocation[0]] > 0) {
            //this.log("OCCUPIED KARBONITE SQUARE");
            karbfuel = (karbfuel + 1) % 2;
            blacklistkarb.push(this.hash(...karblocation));
            karblocation = null;
        }
    }

    if (karblocation == null) {
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
    }


    // check my surroundings


    var check = false;
    if (karbfuel == 0) {
        check = this.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY;
    } else {
        check = this.me.fuel < SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY;
    }
    var check2 = false;
    var nearby = this.getVisibleRobots();
    for (var i = 0; i < nearby.length && !check2; i++) {
        //check if any enemies are nearby
        check2 = check2 || (this.isVisible(nearby[i]) && nearby[i].team != this.me.team);
    }
    check = check && !check2;
    if (check) {
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
        //i gots the drugs, now move to castle and give drugs
        if (this.distance([this.me.x, this.me.y], castleloc) <= 2) {
            //this.log("GIVING TO CASTLE");
            return this.give(castleloc[0] - this.me.x, castleloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
        } else {
            //this.log("MOVING BACK TO CASTLE TO GIVE DRUGS");
            return this.moveto(castleloc);
        }
    }
    return this._bc_null_action();
}
