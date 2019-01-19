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
var receivedCastleLocs = 0;
var enemy_castle_locs = [];

export var Pilgrim = function(self) {

    if (this.me.turn > 3) { //to avoid conflicting with castle locations 
        this.castleTalk((receivedCastleLocs << 3) + this.me.unit + 1); //signifies "im a pilgrim and im alive"
    }
    var tempmap = this.getVisibleRobotMap();
    if (castleloc == null) {
        //find the castle i was spawned from
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
        //generate church heuristic map
        potentialChurchLocs = getLocs.call(this);
        //this.log(potentialChurchLocs);
    }

    //if u can see a church or castle closer to ur current karb deposit, start depositing there.
    var findChurchCastle = this.getVisibleRobots();
    for (var i = 0; i < findChurchCastle.length; i++) {
        var tmprobot = findChurchCastle[i];
        if (this.isVisible(tmprobot) && tmprobot.team == this.me.team &&
           (tmprobot.unit == SPECS.CHURCH || tmprobot.unit == SPECS.CASTLE) &&
           karblocation != null && this.distance([tmprobot.x, tmprobot.y], karblocation) < this.distance(castleloc, karblocation)) {
            //if robot is visible, same team, either church or castle, i have a carb location, and its closer, then switch locs
            castleloc = [tmprobot.x, tmprobot.y];
        }
        //read signal for castle locations
        if (findChurchCastle[i].signal != 0 && findChurchCastle[i].signal % 8 == 2) {
            var decoded = this.decodeSignal(findChurchCastle[i].signal);
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
                    this.log("klodd is a big fat retard!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                    //receivedCastleLocs++;
                }
            }
        }
    }

    //if we have excess resources and are far enough away from our nearest church/castle, then build a church
    //filler values for now idk
    if (this.karbonite > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE * 2 && 
        this.fuel > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL * 2 && karblocation != null && 
        this.distance(karblocation, castleloc) > 25 && this.me.x == karblocation[0] && this.me.y == karblocation[1]) {
        //only build if on my karblocation cuz thats easy and ensures at least somewhat good placements
        //now check around to pick highest value from kevins crusty heuristic
        var highestVal = 0;
        var buildDir = null;
        for (var i = 0; i < alldirs.length; i++) {
            var loc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
            if (this.validCoords(loc) && tempmap[loc[1]][loc[0]] == 0 && potentialChurchLocs[loc[0]][loc[1]] > highestVal) {
                //this.log(potentialChurchLocs[loc[0]][loc[1]]);
                //this.log(highestVal);
                highestVal = potentialChurchLocs[loc[0]][loc[1]];
                buildDir = alldirs[i];
            }
        }
        if (buildDir != null) {
            //checks all passed and have picked best dir, build teh church :OO
            this.log("build church :OOO");
            return this.buildUnit(SPECS.CHURCH, buildDir[0], buildDir[1]);
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
        if (this.isVisible(nearby[i]) && nearby[i].team != this.me.team && SPECS.UNITS[nearby[i].unit].ATTACK_RADIUS != null && SPECS.UNITS[nearby[i].unit].ATTACK_RADIUS[1] >= this.distance([this.me.x, this.me.y], [nearby[i].x, nearby[i].y]) - 4) {
            goback = true;
            break;
        }
    }
    if (check && !goback) {
        //i didn't finish mining yet
        if (this.me.x != karblocation[0] || this.me.y != karblocation[1]) {
            //move to karbonite
            //this.log("HEADING TOWARDS KARBONITE TO MINE FOR CASTLE");
            return this.workermoveto(karblocation);
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
            if (this.isVisible(enemies[i]) && enemies[i].team != this.me.team && SPECS.UNITS[enemies[i].unit].ATTACK_RADIUS != null && this.distance([this.me.x, this.me.y], [enemies[i].x, enemies[i].y]) < minDist) {
                minDist = this.distance([this.me.x, this.me.y], [enemies[i].x, enemies[i].y]);
                closest = enemies[i];
                //find closest attacking unit
            }
        }
        if (closest != null && this.me.fuel == 0 && this.me.karbonite == 0) {
            //i gave the drugs and enemies are coming!!
            
            //this.log(enemies);
            //this.log(this.me);
            //this.log("running awaay after giving resources!");
            //this.log(typeof closest);
            //this.log(closest);
            return this.greedyMoveAway([closest.x, closest.y]);
        } else if (this.distance([this.me.x, this.me.y], castleloc) <= 2) {
            //i gots the drugs, now move to castle and give drugs
            //this.log("GIVING TO CASTLE");
            var castle_there = this.getVisibleRobotMap()[castleloc[1]][castleloc[0]];
            if (castle_there <= 0 || (this.getRobot(castle_there).unit != SPECS.CASTLE && this.getRobot(castle_there).unit != SPECS.CHURCH)) {
                //shit we lost a castle, rebuild a church here instead :^). at least the other workers wont get fucked
                // in the future move the church to a better location and add a different check in workers to re-base.
                this.log("fuck castle is gone???--------------------------");
                if (this.validCoords(castleloc) && castle_there == 0 && this.karbonite > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE * 2 && 
                    this.fuel > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL * 2) {
                    return this.buildUnit(SPECS.CHURCH, castleloc[0] - this.me.x, castleloc[1] - this.me.y);
                }

            } else {
                goback = false;
                return this.give(castleloc[0] - this.me.x, castleloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
            }
            return this.give(castleloc[0] - this.me.x, castleloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
        } else {
            //this.log("MOVING BACK TO CASTLE TO GIVE DRUGS");
            return this.moveto(castleloc);
        }
    }
    return this._bc_null_action();
}
