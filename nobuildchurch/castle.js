import {SPECS} from 'battlecode';
import {alldirs, range10} from 'constants.js'
import * as Comms from 'communication.js'

//castle variables
var pilgrimcount = 0;
var underattack = false;
var karbonite_patches = 0;
var fuel_patches = 0;
var usedDefensePositions = []; //used for assigning where units go
var curFlatEnemyVector = null;
var turnsSinceLastReposition = 0; //prevent spamming if we're surrounded lol
var first_castle = true;
var castle_locs = [];

export var Castle = function() {
    var robotsnear = this.getVisibleRobots();

    turnsSinceLastReposition++;
    if (this.me.turn == 1) {
        this.log([["CASTLE_AT"], [this.me.x, this.me.y]]);
        for (var i = 0; i < this.map[0].length; i++) {
            for (var j = 0; j < this.map.length; j++) {
                if (this.karbonite_map[j][i]) {
                    karbonite_patches++;
                } else if (this.fuel_map[j][i]) {
                    fuel_patches++;
                }
            }
        }
        this.log("checking castle talk");
        for(var i = 0; i < robotsnear.length; i++) {
            if(robotsnear[i].castle_talk) {
                first_castle = false;
            }
        }
        this.castleTalk(Comms.Compress8Bits(this.me.x, this.me.y));
    }
    if(this.me.turn == 2) {
        for(var i = 0; i < robotsnear.length; i++) {
            if(robotsnear[i].castle_talk) {
                castle_locs.push(Comms.Decompress8Bits(robotsnear[i].castle_talk));
            }
        }
        this.castleTalk(Comms.Compress8Bits(this.me.x, this.me.y));
    }
    if(this.me.turn == 3) {
        this.castleTalk(0);
        this.log(["CASTLES", castle_locs]);
        if(first_castle) this.log("is first castle");
    }

    var robot = null;
    var numenemy = [0, 0, 0, 0, 0, 0]; // crusaders, prophets, preachers
    var friendlies = [0, 0, 0, 0, 0, 0];
    var defense_units = [0, 0, 0, 0, 0, 0];
    var defense_robots = [];
    var minDist = 9999999;
    var closestEnemy = null;
    for (var i = 0; i < robotsnear.length; i++) {
        robot = robotsnear[i];
        if (robot.team != this.me.team) {
            numenemy[robot.unit]++;
            var dist = this.distance([this.me.x, this.me.y], [robot.x, robot.y])
            if (dist < minDist && SPECS.UNITS[robot.unit].ATTACK_RADIUS != null) {
                minDist = dist;
                closestEnemy = robot;
            }
        } else {
            friendlies[robot.unit]++;
            if (this.distance([this.me.x, this.me.y], [robot.x, robot.y]) < 10) {
                defense_units[robot.unit]++;
                defense_robots.push(robot.unit);
            }
        }
    }

    if (closestEnemy != null && this.fuel >= 10 && turnsSinceLastReposition >= 10) {
        var enemVector = [closestEnemy.x - this.me.x, closestEnemy.y - this.me.y];
        for (var i = 0; i < 2; i++) {
            enemVector[i] = Math.round(enemVector[i] / Math.max(...enemVector));
        }
        if (curFlatEnemyVector == null || curFlatEnemyVector[0] != enemVector[0] || curFlatEnemyVector[1] != enemVector[1]) {
            //enemies are in a different direction, broadcast to erry1
            curFlatEnemyVector = enemVector;
            var signal = this.generateRepositionSignal([closestEnemy.x - this.me.x, closestEnemy.y - this.me.y]);
            this.log("sending reposition signal!");
            this.signal(signal, 10);
            turnsSinceLastReposition = 0;
        }
    }

    if (numenemy[SPECS.CRUSADER] + numenemy[SPECS.PROPHET] + numenemy[SPECS.PREACHER] == 0 && underattack) {
        underattack = false;
    } else {
        if (numenemy[SPECS.CRUSADER] > defense_units[SPECS.PREACHER]) {
            this.log("CREATE PREACHER FOR DEFENSE");
            var result = this.build(SPECS.PREACHER);
            if (result != null) {
                minDist = 9999999; //reuse var
                var bestIndex = -1;
                for (var i = 0; i < range10.length; i++) {
                    var nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
                    if (this.validCoords(nextloc) && this.map[nextloc[1]][nextloc[0]] && !usedDefensePositions.includes(i) && this.distance(nextloc, [closestEnemy.x, closestEnemy.y]) < minDist) {
                        minDist = this.distance(nextloc, [closestEnemy.x, closestEnemy.y]);
                        bestIndex = i;
                    }
                }
                //send signal for starting pos
                var signal = this.generateInitialPosSignalVal(range10[bestIndex]);
                this.log("sent: ");
                this.log(range10[bestIndex]);
                this.log(signal);
                usedDefensePositions.push(bestIndex);
                this.signal(signal, 2); // todo maybe: check if required r^2 is 1
                return this.buildUnit(SPECS.PREACHER, result[0], result[1]);
            }
        } else if ((numenemy[SPECS.PROPHET] + numenemy[SPECS.PREACHER]) * 2 > defense_units[SPECS.PROPHET]) {
            //produce preacher to counter crusader
            this.log("CREATE PROPHET FOR DEFENSE");
            var result = this.build(SPECS.PROPHET);
            if (result != null) {
                minDist = 9999999; //reuse var
                var bestIndex;
                for (var i = 0; i < range10.length; i++) {
                    var nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
                    if (this.validCoords(nextloc) && this.map[nextloc[1]][nextloc[0]] && !usedDefensePositions.includes(i) && this.distance(nextloc, [closestEnemy.x, closestEnemy.y]) < minDist) {
                        minDist = this.distance(nextloc, [closestEnemy.x, closestEnemy.y]);
                        bestIndex = i;
                    }
                }
                //send signal for starting pos
                var signal = this.generateInitialPosSignalVal(range10[bestIndex]);
                this.log("sent: ");
                this.log(range10[bestIndex]);
                this.log(signal);
                usedDefensePositions.push(bestIndex);
                this.signal(signal, 2); // todo maybe: check if required r^2 is 1
                return this.buildUnit(SPECS.PROPHET, result[0], result[1]);
            }
        }
        /*
        if (numenemy[SPECS.CRUSADER] + numenemy[SPECS.PROPHET] + numenemy[SPECS.PREACHER] > defense_units[SPECS.PROPHET]) {
            //produce prophet to counter attack
            var result = this.build(SPECS.PROPHET);
            if (result != null) {
                return result;
            }
        }*/
        underattack = true;
    }
    
    if (this.canBuild(SPECS.PILGRIM) && (friendlies[SPECS.PILGRIM] == 0 || (friendlies[SPECS.PILGRIM] < karbonite_patches / 3 + fuel_patches / 3 && this.karbonite > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_KARBONITE * 3 && this.fuel > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_FUEL * 3))) {
        //can produce pilgrim
        var robotsnear = this.getVisibleRobotMap();
        for (var i = 0; i < alldirs.length; i++) {
            var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
            if (this.validCoords(nextloc) && robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                this.log("Created pilgrim");
                pilgrimcount++;
                return this.buildUnit(SPECS.PILGRIM, alldirs[i][0], alldirs[i][1]);
            }
        }
    }
    
    
}
