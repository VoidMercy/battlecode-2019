import {SPECS} from 'battlecode';
import {alldirs, range10} from 'constants.js'

//church vars
var crusadercount = 0;
var pilgrimcount = 0;
var lategameUnitCount = 0;
var underattack = false;
var usedDefensePositions = []; //used for assigning where units go
var curFlatEnemyVector = null;
var turnsSinceLastReposition = 0;

export var Church = function() {

    var prophetCount = 0;
    var preacherCount = 0;
    var crusaderCount = 0;
    var robotsnear = this.getVisibleRobots();
    var robot = null;
    for (var i=0; i < robotsnear.length; i++) {
        robot = robotsnear[i];
        if (this.isVisible(robot) && robot.team == this.me.team) {
            if (robot.unit == SPECS.PROPHET) {
                prophetCount++;
            } else if (robot.unit == SPECS.PREACHER) {
                preacherCount++;
            } else if (robot.unit == SPECS.CRUSADER) {
                crusaderCount++;
            }
        }
    }
    //this.log(prophetCount);
    if (prophetCount + preacherCount + crusaderCount > 8 && this.fuel > 500) {
        this.log("signalling to go away ")
        this.signal(69, 25);
    }

    //defensive church code
    var robot = null;
    var numenemy = [0, 0, 0, 0, 0, 0]; // crusaders, prophets, preachers
    var friendlies = [0, 0, 0, 0, 0, 0];
    var defense_units = [0, 0, 0, 0, 0, 0];
    var defense_robots = [];
    var minDist = 9999999;
    var closestEnemy = null;
    var closestEnemyWNonattacking = null;
    var nonattackingMinDist = 9999999
    for (var i = 0; i < robotsnear.length; i++) {
        robot = robotsnear[i];
        if (robot.team != this.me.team) {
            numenemy[robot.unit]++;
            var dist = this.distance([this.me.x, this.me.y], [robot.x, robot.y])
            if (dist < minDist && SPECS.UNITS[robot.unit].ATTACK_RADIUS != null) {
                minDist = dist;
                closestEnemy = robot;
            }
            if (dist < nonattackingMinDist) {
                nonattackingMinDist = dist;
                closestEnemyWNonattacking = robot;
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
            //var signal = this.generateRepositionSignal([closestEnemy.x - this.me.x, closestEnemy.y - this.me.y]);
            var signal = this.generateRepositionSignal([closestEnemy.x - this.me.x, closestEnemy.y - this.me.y], closestEnemy.unit);
            this.log("sending reposition signal!");
            this.signal(signal, 10);
            turnsSinceLastReposition = 0;
        }
    }

    if (numenemy[SPECS.CRUSADER] + numenemy[SPECS.PROPHET] + numenemy[SPECS.PREACHER] == 0 && underattack) {
        underattack = false;
    } else {
        if (numenemy[SPECS.CRUSADER] + numenemy[SPECS.PREACHER] > defense_units[SPECS.PREACHER]) {
            this.log("CREATE PREACHER FOR DEFENSE");
            var result = this.buildNear(SPECS.PREACHER, [closestEnemy.x, closestEnemy.y]);
            if (result != null) {
                minDist = 9999999; //reuse var
                var bestIndex = -1;
                var check = 0;
                for (var i = 0; i < range10.length; i++) {
                    var nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
                    if (!this.validCoords(nextloc)) {
                        check++;
                    }
                }
                //if all remaining positions are impassable, reset
                if (check == range10.length - usedDefensePositions.length) {
                    usedDefensePositions = [];
                }
                for (var i = 0; i < range10.length; i++) {
                    var nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
                    if (this.validCoords(nextloc) && this.map[nextloc[1]][nextloc[0]] && !usedDefensePositions.includes(i) && this.distance(nextloc, [closestEnemy.x, closestEnemy.y]) < minDist) {
                        minDist = this.distance(nextloc, [closestEnemy.x, closestEnemy.y]);
                        bestIndex = i;
                    }
                }
                //send signal for starting pos
                if (bestIndex != -1) {
                    var signal = this.generateDefenseInitialSignal(range10[bestIndex], closestEnemy.unit);
                    this.log("sent: ");
                    this.log(range10[bestIndex]);
                    this.log(signal);
                    usedDefensePositions.push(bestIndex);
                    this.signal(signal, 2); // todo maybe: check if required r^2 is 1
                }
                return this.buildUnit(SPECS.PREACHER, result[0], result[1]);
            }
        } else if ((numenemy[SPECS.PROPHET]) * 2 > defense_units[SPECS.PROPHET]) {
            //produce preacher to counter crusader
            this.log("CREATE PROPHET FOR DEFENSE");
            var result = this.buildNear(SPECS.PROPHET, [closestEnemy.x, closestEnemy.y]);
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
                if (bestIndex != -1) {
                    var signal = this.generateDefenseInitialSignal(range10[bestIndex], closestEnemy.unit);
                    this.log("sent: ");
                    this.log(range10[bestIndex]);
                    this.log(signal);
                    usedDefensePositions.push(bestIndex);
                    this.signal(signal, 2); // todo maybe: check if required r^2 is 1
                }
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

    if (!underattack && closestEnemyWNonattacking != null) {
        //produce these even tho not "under attack" technically
        if ((numenemy[SPECS.CASTLE] + numenemy[SPECS.CHURCH]) * 2 > defense_units[SPECS.PREACHER]) {
            //spawn preacher for enemy castles/churches
            var result = this.build(SPECS.PREACHER);
            if (result != null) {
                this.log("CREATE PREACHER FOR ATTACKING ENEMY CHURCH/CASTLE");
                minDist = 9999999; //reuse var
                var bestIndex = -1;
                var check = 0;
                for (var i = 0; i < range10.length; i++) {
                    var nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
                    if (!this.validCoords(nextloc)) {
                        check++;
                    }
                }
                //if all remaining positions are impassable, reset
                if (check == range10.length - usedDefensePositions) {
                    usedDefensePositions = [];
                }
                for (var i = 0; i < range10.length; i++) {
                    var nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
                    if (this.validCoords(nextloc) && this.map[nextloc[1]][nextloc[0]] && !usedDefensePositions.includes(i) && this.distance(nextloc, [closestEnemyWNonattacking.x, closestEnemyWNonattacking.y]) < minDist) {
                        minDist = this.distance(nextloc, [closestEnemyWNonattacking.x, closestEnemyWNonattacking.y]);
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
        } else if (numenemy[SPECS.PILGRIM] > defense_units[SPECS.CRUSADER] * 4) {
            //spawn crusaders for enemy pilgrims
            var result = this.build(SPECS.CRUSADER);
            if (result != null) {
                this.log("CREATE crusader FOR ATTACKING ENEMY PILGRIM");
                minDist = 9999999; //reuse var
                var bestIndex = -1;
                var check = 0;
                for (var i = 0; i < range10.length; i++) {
                    var nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
                    if (!this.validCoords(nextloc)) {
                        check++;
                    }
                }
                //if all remaining positions are impassable, reset
                if (check == range10.length - usedDefensePositions) {
                    usedDefensePositions = [];
                }
                for (var i = 0; i < range10.length; i++) {
                    var nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
                    if (this.validCoords(nextloc) && this.map[nextloc[1]][nextloc[0]] && !usedDefensePositions.includes(i) && this.distance(nextloc, [closestEnemyWNonattacking.x, closestEnemyWNonattacking.y]) < minDist) {
                        minDist = this.distance(nextloc, [closestEnemyWNonattacking.x, closestEnemyWNonattacking.y]);
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
                return this.buildUnit(SPECS.CRUSADER, result[0], result[1]);
            }
        }
    }

    //offensive code lategame
    if (this.karbonite > 250 && this.fuel > 500) {
        // lmoa build a prophet
        lategameUnitCount++;
        var unitBuilder;
        if (lategameUnitCount % 3 == 0) {
            //make preacher
            unitBuilder = SPECS.PREACHER;
        } else {
            //make prophet
            unitBuilder = SPECS.PROPHET;
        }
        this.log("BUILDING RANGER!!!")
        var result = this.build(unitBuilder);
        if (result != null) {
            var nextloc = null;
            var bestIndex = null;
            for (var i = 0; i < range10.length; i++) {
                nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
                if (this.validCoords(nextloc) && this.map[nextloc[1]][nextloc[0]]) {
                    bestIndex = i;
                    break;
                }
            }
            if (bestIndex != null) {
                var signal = this.generateInitialPosSignalVal(range10[bestIndex]);
                this.log("sent: ");
                this.log(range10[bestIndex]);
                this.log(signal);
                this.signal(signal, 2); // todo maybe: check if required r^2 is 1
                return this.buildUnit(unitBuilder, result[0], result[1]);
            }
        }
    }


    /*if (crusadercount < 3 || pilgrimcount > 0) {
        if (this.karbonite > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE + SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE && this.fuel > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL) {
            var result = this.build(SPECS.CRUSADER);
            if (result != null) {
                crusadercount++;
                return result;
            }
        }
    } else if (pilgrimcount == 0) {
        var result = this.build(SPECS.PILGRIM);
        if (result != null) {
            pilgrimcount++;
            return result;
        }
    }*/
    return this._bc_null_action();
}
