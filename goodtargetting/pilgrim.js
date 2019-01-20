import {SPECS} from 'battlecode'
import {alldirs} from 'constants.js'
import {getLocs} from 'churchbuildingheuristics.js'

//pilgrim variables
var karbfuel = null;
var builtchurch = false;
var churchloc = null;
var castleloc = null;
var goback = false;
var blacklistkarb = [];
var potentialChurchLocs = null;

var target = null;
var all_resources = [];
var reached_target = false;

var GOING_SIGNAL = 0b01111110;
var DOING_SIGNAL = 0b01111111;

export var Pilgrim = function() {
    var tempmap = this.getVisibleRobotMap();
    if (this.me.turn == 1) {
        for (var i = 0; i < this.map[0].length; i++) {
            for (var j = 0; j < this.map.length; j++) {
                if (this.karbonite_map[j][i]) {
                    all_resources.push([i, j]);
                } else if (this.fuel_map[j][i]) {
                    all_resources.push([i, j]);
                }
            }
        }

        //first turn, find location of church/castle and obtain initial pos
        for (var i = 0; i < alldirs.length; i++) {
            var nextLoc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
            if (this.validCoords(nextLoc)) {
                var robot = this.getRobot(tempmap[nextLoc[1]][nextLoc[0]]);
                if (tempmap[nextLoc[1]][nextLoc[0]] > 0 &&
                (robot.unit == SPECS.CASTLE)) {
                    //church/castle i spawned on
                    if (robot.signal != -1) {
                        this.log("PILGRIM SIGNAL");
                        this.log(robot.signal);
                        var relStartPos = this.decodeSignal(robot.signal);
                        target = [32 + relStartPos[0], 32 + relStartPos[1]];
                        this.log("Received: ");
                        this.log(target);
                    } else {
                        this.log("NO INITAL PILGRIM SIGNAL!");
                        target = null;
                    }
                    castleloc = nextLoc;
                    break;
                }
            }
        }
        this.log(castleloc);

        if(target == null) {
            target = all_resources[Math.floor(Math.random()*all_resources.length)];
        }
        if(this.indexOf2D(all_resources, target) === -1) {
            target = all_resources[Math.floor(Math.random()*all_resources.length)];
        }

        if(this.karbonite_map[target[1]][target[0]]) {
            karbfuel = 0;
        }
        else if(this.fuel_map[target[1]][target[0]]) {
            karbfuel = 1;
        }
        else {
            throw "Target is not fuel or karbonite??!?!?!??!";
        }
    }
    else if(this.me.turn == 2) {
        var target_index = this.indexOf2D(all_resources, target);
        target_index %= 64;
        target_index += 0b10000000;
        this.castleTalk(target_index);
    }
    else if(this.me.turn == 3) {
        var target_index = this.indexOf2D(all_resources, target);
        target_index >>= 6;
        target_index += 0b11000000;
        this.castleTalk(target_index);
    }

    if (potentialChurchLocs == null) {
        //generate church heuristic map
        potentialChurchLocs = getLocs.call(this);
        //this.log(potentialChurchLocs);
    }

    if(this.me.x == target[0] && this.me.y == target[1]) {
        reached_target = true;
    }

    if(!reached_target) {
        if(this.me.turn > 3) this.castleTalk(GOING_SIGNAL);
        return this.moveto(target, true);
    }

    //if u can see a church or castle closer to ur current karb deposit, start depositing there.
    var findChurchCastle = this.getVisibleRobots();
    for (var i = 0; i < findChurchCastle.length; i++) {
        var tmprobot = findChurchCastle[i];
        if (this.isVisible(tmprobot) && tmprobot.team == this.me.team &&
           (tmprobot.unit == SPECS.CHURCH || tmprobot.unit == SPECS.CASTLE) &&
           this.distance([tmprobot.x, tmprobot.y], target) < this.distance(castleloc, target)) {
            //if robot is visible, same team, either church or castle, i have a carb location, and its closer, then switch locs
            castleloc = [tmprobot.x, tmprobot.y];
        }
    }

    //if we have excess resources and are far enough away from our nearest church/castle, then build a church
    //filler values for now idk
    if (this.karbonite > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE * 2 &&
        this.fuel > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL * 2 &&
        this.distance(target, castleloc) > 25 && this.me.x == target[0] && this.me.y == target[1]) {
        //only build if on my target cuz thats easy and ensures at least somewhat good placements
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
            if(this.me.turn > 3) this.castleTalk(DOING_SIGNAL);
            return this.buildUnit(SPECS.CHURCH, buildDir[0], buildDir[1]);
        }
    }

    // TODO: Add code for when your current karb location is blocked

    // check my surroundings


    var check = false;
    if (karbfuel == 0) {
        check = this.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY;
    } else {
        check = this.me.fuel < SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY;
    }


    if (check) {
        //i didn't finish mining yet
        if (this.me.x != target[0] || this.me.y != target[1]) {
            //move to resource
            if(this.me.turn > 3) this.castleTalk(GOING_SIGNAL);
            return this.moveto(target, true);
        } else {
            //this.log("MINING FOR CASTLE");
            if(this.me.turn > 3) this.castleTalk(DOING_SIGNAL);
            return this.mine();
        }
    } else {
        if (this.distance([this.me.x, this.me.y], castleloc) <= 2) {
            //i gots the drugs, now move to castle and give drugs
            //this.log("GIVING TO CASTLE");
            var castle_there = this.getVisibleRobotMap()[castleloc[1]][castleloc[0]];
            if (castle_there <= 0 || (this.getRobot(castle_there).unit != SPECS.CASTLE && this.getRobot(castle_there).unit != SPECS.CHURCH)) {
                //shit we lost a castle, rebuild a church here instead :^). at least the other workers wont get fucked
                // in the future move the church to a better location and add a different check in workers to re-base.
                this.log("fuck castle is gone???--------------------------");
                if (this.validCoords(castleloc) && castle_there == 0 && this.karbonite > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE * 2 &&
                    this.fuel > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL * 2) {
                    if(this.me.turn > 3) this.castleTalk(DOING_SIGNAL);
                    return this.buildUnit(SPECS.CHURCH, castleloc[0] - this.me.x, castleloc[1] - this.me.y);
                }

            } else {
                goback = false;
                if(this.me.turn > 3) this.castleTalk(DOING_SIGNAL);
                return this.give(castleloc[0] - this.me.x, castleloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
            }
        } else {
            //this.log("MOVING BACK TO CASTLE TO GIVE DRUGS");
            if(this.me.turn > 3) this.castleTalk(GOING_SIGNAL);
            return this.moveto(castleloc);
        }
    }
    return this._bc_null_action();
}
