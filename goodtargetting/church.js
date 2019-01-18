import {SPECS} from 'battlecode';
import {alldirs, range10, lattices} from 'constants.js'

//church vars
var crusadercount = 0;
var pilgrimcount = 0;
var lategameUnitCount = 0;
var underattack = false;
var usedDefensePositions = []; //used for assigning where units go
var curFlatEnemyVector = null;
var turnsSinceLastReposition = 0;
var lastenemyseen = [];
var used_lattice_locs = [];
var turns_since_used_lattice = [];
var receivedCastleLocs = 0;
var enemy_castle_locs = [];

export var Church = function() {

    if (this.me.turn > 3) { //to avoid conflicting with castle locations 
        this.castleTalk((receivedCastleLocs << 3) + this.me.unit + 1); //signifies "im a church and im alive"
    }

    var prophetCount = 0;
    var preacherCount = 0;
    var crusaderCount = 0;
    var robotsnear = this.getVisibleRobots();
    var robotmap = this.getVisibleRobotMap();
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

        //read signal for castle locations
        if (robotsnear[i].signal != 0 && robotsnear[i].signal % 8 == 2) {
            var decoded = this.decodeSignal(robotsnear[i].signal);
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
                    receivedCastleLocs++;
                }
            }
        }

    }

    for (var i = 0; i < used_lattice_locs.length; i++) {
        if (turns_since_used_lattice[i] > 5) {
            //pop since its been long enough probably
            turns_since_used_lattice.splice(i, 1);
            used_lattice_locs.splice(i, 1);
        } else {
            turns_since_used_lattice[i]++;
        }
    }

    //defensive church code
    var robot = null;
    var numenemy = [0, 0, 0, 0, 0, 0]; // crusaders, prophets, preachers
    var friendlies = [0, 0, 0, 0, 0, 0];
    var defense_units = [0, 0, 0, 0, 0, 0];
    var defense_robots = [];
    var defensive_health = 0;
    var enemy_health = 0;
    var minDist = 9999999;
    var closestEnemy = null;
    for (var i = 0; i < robotsnear.length; i++) {
        robot = robotsnear[i];
        if (robot.team != this.me.team) {
            numenemy[robot.unit]++;
            enemy_health += robot.health;
            if(this.isVisible(robot)) {
                var dist = this.distance([this.me.x, this.me.y], [robot.x, robot.y])
                if (dist < minDist && SPECS.UNITS[robot.unit].ATTACK_RADIUS != null) {
                    minDist = dist;
                    closestEnemy = robot;
                    lastenemyseen = closestEnemy;
                }
            }
        } else {
            friendlies[robot.unit]++;
            if (this.isVisible(robot) && this.distance([this.me.x, this.me.y], [robot.x, robot.y]) < 10) {
                defense_units[robot.unit]++;
                defense_robots.push(robot.unit);
                if (robot.unit >= 3) {
                    defensive_health += robot.health;
                }
            }
        }
    }

    /*if (closestEnemy != null && this.fuel >= 10 && turnsSinceLastReposition >= 10) {
        underattack = true;
        var enemVector = [closestEnemy.x - this.me.x, closestEnemy.y - this.me.y];
        for (var i = 0; i < 2; i++) {
            enemVector[i] = Math.round(enemVector[i] / Math.max(...enemVector));
        }
        if (curFlatEnemyVector == null || curFlatEnemyVector[0] != enemVector[0] || curFlatEnemyVector[1] != enemVector[1]) {
            //enemies are in a different direction, broadcast to erry1
            curFlatEnemyVector = enemVector;
            sicecoords = [];
            var minDist = 9999;
            var bestIndex = null;
            for (var i = 0; i < range10.length; i++) {
                var nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
                if (this.validCoords(nextloc) && this.map[nextloc[1]][nextloc[0]] && !usedDefensePositions.includes(i) && this.distance(nextloc, [closestEnemy.x, closestEnemy.y]) < minDist) {
                    minDist = this.distance(nextloc, [closestEnemy.x, closestEnemy.y]);
                    bestIndex = i;
                }
            }
            if (bestIndex != null) {
                var signal = this.generateRepositionSignal(range10[bestIndex]);
                this.log("sending reposition signal!");
                this.signal(signal, 10);
                turnsSinceLastReposition = 0;
            } else {
                this.log("SOMETHING BORKED");
            }
            
        }
    }*/

    if (numenemy[SPECS.CRUSADER] + numenemy[SPECS.PROPHET] + numenemy[SPECS.PREACHER] == 0 && underattack) {
        underattack = false;
        this.log("broadcast we are se-fu");
        this.signal(6969, 10);
    } else {
        if (numenemy[SPECS.CRUSADER] + numenemy[SPECS.PREACHER] > defense_units[SPECS.PREACHER] || defensive_health < enemy_health) {
            this.log("CREATE PREACHER FOR DEFENSE");
            var result = null;
            if (closestEnemy == null) {
                this.log("THIS SHOULD RARELY HAPPEN");
                result = this.buildNear(SPECS.PREACHER, [lastenemyseen.x, lastenemyseen.y]);
            } else {
                if (underattack && closestEnemy.unit == SPECS.PREACHER) {
                    this.log("ohno");
                    result = this.buildSpread(SPECS.PREACHER, [closestEnemy.x, closestEnemy.y]);
                } else {
                    result = this.buildNear(SPECS.PREACHER, [closestEnemy.x, closestEnemy.y]);
                }
            }

            
            if (result != null) {
                var index = -1;
                for (index = 0; index < lattices.length; index++) {
                     var latticeloc = [this.me.x + lattices[index][0], this.me.y + lattices[index][1]];
                     if (this.validCoords(latticeloc) /* coordinates are valid */ && 
                        this.map[latticeloc[1]][latticeloc[0]] /* is passable terrain */ && 
                        robotmap[latticeloc[1]][latticeloc[0]] == 0 /* not occupied */ &&
                        !this.karbonite_map[latticeloc[1]][latticeloc[0]] /* not karbonite */ &&
                        !this.fuel_map[latticeloc[1]][latticeloc[0]] /* not fuel */ &&
                        !used_lattice_locs.includes(index) /* havent used in past few turns */) {
                        used_lattice_locs.push(index);
                        turns_since_used_lattice.push(0);
                        break; //found tile :O
                    }
                }
                //send signal for starting pos
                if (index != -1 && index != lattices.length) {
                    var signal = this.generateDefenseInitialSignal(lattices[index], closestEnemy.unit);
                    //this.log("sent: ");
                    //this.log(lattices[index]);
                    //this.log(signal);
                    this.signal(signal, 2); // todo maybe: check if required r^2 is 1
                }
                return this.buildUnit(SPECS.PREACHER, result[0], result[1]);
            }
        } else if ((numenemy[SPECS.PROPHET]) * 2 > defense_units[SPECS.PROPHET] || defense_robots[SPECS.PROPHET] + defense_robots[SPECS.PREACHER] == 0) {
            //produce preacher to counter crusader
            this.log("CREATE PROPHET FOR DEFENSE");
            var result = this.buildNear(SPECS.PROPHET, [closestEnemy.x, closestEnemy.y]);
            if (result != null) {
                var index = -1;
                for (index = 0; index < lattices.length; index++) {
                     var latticeloc = [this.me.x + lattices[index][0], this.me.y + lattices[index][1]];
                     if (this.validCoords(latticeloc) /* coordinates are valid */ && 
                        this.map[latticeloc[1]][latticeloc[0]] /* is passable terrain */ && 
                        robotmap[latticeloc[1]][latticeloc[0]] == 0 /* not occupied */ &&
                        !this.karbonite_map[latticeloc[1]][latticeloc[0]] /* not karbonite */ &&
                        !this.fuel_map[latticeloc[1]][latticeloc[0]] /* not fuel */ &&
                        !used_lattice_locs.includes(index) /* havent used in past few turns */) {
                        used_lattice_locs.push(index);
                        turns_since_used_lattice.push(0);
                        break; //found tile :O
                    }
                }
                //send signal for starting pos
                if (index != -1 && index != lattices.length) {
                    var signal = this.generateDefenseInitialSignal(lattices[index], closestEnemy.unit);
                    //this.log("sent: ");
                    //this.log(lattices[index]);
                    //this.log(signal);
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
    }

    if (!underattack && closestEnemy == null) {
        //produce these even tho not "under attack" technically
        if ((numenemy[SPECS.CASTLE] + numenemy[SPECS.CHURCH]) * 2 > defense_units[SPECS.PREACHER]) {
            //spawn preacher for enemy castles/churches
            this.log("CREATE PREACHER FOR ATTACKING ENEMY CHURCH/CASTLE");
            var result = this.build(SPECS.PREACHER);
            if (result != null) {
                var index = -1;
                for (index = 0; index < lattices.length; index++) {
                     var latticeloc = [this.me.x + lattices[index][0], this.me.y + lattices[index][1]];
                     if (this.validCoords(latticeloc) /* coordinates are valid */ && 
                        this.map[latticeloc[1]][latticeloc[0]] /* is passable terrain */ && 
                        robotmap[latticeloc[1]][latticeloc[0]] == 0 /* not occupied */ &&
                        !this.karbonite_map[latticeloc[1]][latticeloc[0]] /* not karbonite */ &&
                        !this.fuel_map[latticeloc[1]][latticeloc[0]] /* not fuel */ &&
                        !used_lattice_locs.includes(index) /* havent used in past few turns */) {
                        used_lattice_locs.push(index);
                        turns_since_used_lattice.push(0);
                        break; //found tile :O
                    }
                }
                //send signal for starting pos
                if (index != -1 && index != lattices.length) {
                    var signal = this.generateDefenseInitialSignal(lattices[index], SPECS.CHURCH);
                    //this.log("sent: ");
                    //this.log(lattices[index]);
                    //this.log(signal);
                    this.signal(signal, 2); // todo maybe: check if required r^2 is 1
                }
                return this.buildUnit(SPECS.PREACHER, result[0], result[1]);
            }
        } else if (numenemy[SPECS.PILGRIM] > friendlies[SPECS.CRUSADER]*5) {
            //spawn crusaders for enemy pilgrims
            this.log("CREATE crusader FOR ATTACKING ENEMY PILGRIM");
            var result = this.build(SPECS.CRUSADER);
            if (result != null) {
                var index = -1;
                for (index = 0; index < lattices.length; index++) {
                     var latticeloc = [this.me.x + lattices[index][0], this.me.y + lattices[index][1]];
                     if (this.validCoords(latticeloc) /* coordinates are valid */ && 
                        this.map[latticeloc[1]][latticeloc[0]] /* is passable terrain */ && 
                        robotmap[latticeloc[1]][latticeloc[0]] == 0 /* not occupied */ &&
                        !this.karbonite_map[latticeloc[1]][latticeloc[0]] /* not karbonite */ &&
                        !this.fuel_map[latticeloc[1]][latticeloc[0]] /* not fuel */ &&
                        !used_lattice_locs.includes(index) /* havent used in past few turns */) {
                        used_lattice_locs.push(index);
                        turns_since_used_lattice.push(0);
                        break; //found tile :O
                    }
                }
                //send signal for starting pos
                if (index != -1 && index != lattices.length) {
                    var signal = this.generateDefenseInitialSignal(lattices[index], SPECS.PILGRIM);
                    //this.log("sent: ");
                    //this.log(lattices[index]);
                    //this.log(signal);
                    this.signal(signal, 2); // todo maybe: check if required r^2 is 1
                }
                return this.buildUnit(SPECS.CRUSADER, result[0], result[1]);
            }
        }
    }

    //offensive code lategame
    var friendlyAttackUnits = friendlies[SPECS.CRUSADER] + friendlies[SPECS.PREACHER] + friendlies[SPECS.PROPHET];
    if (this.karbonite > 150 + 5*friendlyAttackUnits && this.fuel > 500) {
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
            var index = -1;
            for (index = 0; index < lattices.length; index++) {
                var latticeloc = [this.me.x + lattices[index][0], this.me.y + lattices[index][1]];
                if (this.validCoords(latticeloc) /* coordinates are valid */ && 
                    this.map[latticeloc[1]][latticeloc[0]] /* is passable terrain */ && 
                    robotmap[latticeloc[1]][latticeloc[0]] == 0 /* not occupied */ &&
                    !this.karbonite_map[latticeloc[1]][latticeloc[0]] /* not karbonite */ &&
                    !this.fuel_map[latticeloc[1]][latticeloc[0]] /* not fuel */ &&
                    !used_lattice_locs.includes(index) /* havent used in past few turns */) {
                    used_lattice_locs.push(index);
                    turns_since_used_lattice.push(0);
                    break; //found tile :O
                }
            }

            //send signal for starting pos
            if (index != -1 && index != lattices.length) {
                var signal = this.generateInitialPosSignalVal(lattices[index]);
               // this.log("sent: ");
                //this.log(lattices[index]);
                //this.log(signal);
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
