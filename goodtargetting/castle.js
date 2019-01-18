import {SPECS} from 'battlecode';
import {alldirs, range10, lattices} from 'constants.js'
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
var enemy_castle_locs = [];
var lategameUnitCount = 0;
var nearest_enemy_castle = null;
var lastenemyseen = [];
var used_lattice_locs = [];
var turns_since_used_lattice = [];
var receivedCastleLocs = 0;
var castleLocCount = {};
var coarseEnemyLocs = [];
var minFuel = -1;

export var Castle = function() {
    var unitcounts = [0, 0, 0, 0, 0, 0]; //only valid after turn 3

    if (this.me.turn > 3) { //to avoid conflicting with castle locations 
        this.castleTalk((receivedCastleLocs << 3) + this.me.unit + 1); //signifies "im a castle and im alive"
    }
    if (minFuel == -1) {
        var myloc = [this.me.x, this.me.y];
        this.log("set minfuel");
        //this.log([this.distance(myloc, [0,0]), this.distance(myloc, [this.map.length-1, 0]), this.distance(myloc, [this.map.length -1, this.map.length -1]), this.distance(myloc, [0,this.map.length-1])]);
        minFuel = Math.max(this.distance(myloc, [0,0]), this.distance(myloc, [this.map.length-1, 0]), this.distance(myloc, [this.map.length -1, this.map.length -1]), this.distance(myloc, [0,this.map.length-1]));
        this.log(minFuel);
    }

    var robotsnear = this.getVisibleRobots();
    var robotmap = this.getVisibleRobotMap();
    turnsSinceLastReposition++;
    pilgrimcount = 0;
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
    } else if(this.me.turn == 2) {
        for(var i = 0; i < robotsnear.length; i++) {
            if(robotsnear[i].castle_talk) {
                castle_locs.push(Comms.Decompress8Bits(robotsnear[i].castle_talk));
            }
        }
        var best_dist = 99999;
        for(var i = 0; i < castle_locs.length; i++) {
            enemy_castle_locs.push(this.oppositeCoords(castle_locs[i]));
            if(this.distance([this.me.x, this.me.y], enemy_castle_locs[i]) < best_dist) {
                best_dist = this.distance([this.me.x, this.me.y], enemy_castle_locs[i]);
                nearest_enemy_castle = enemy_castle_locs[i];
            }
        }
        this.castleTalk(Comms.Compress8Bits(this.me.x, this.me.y));
    } else if(this.me.turn == 3) {
        this.castleTalk(0);
        this.log(["CASTLES", castle_locs]);
        this.log(["ENEMY CASTLES", enemy_castle_locs]);
        this.log(["NEAREST ENEMY CASTLE", nearest_enemy_castle]);
        if(first_castle) this.log("is first castle");
        for (var i = 0; i < enemy_castle_locs.length; i++) {
            castleLocCount[[Math.floor(enemy_castle_locs[i][0]/2)*2, Math.floor(enemy_castle_locs[i][1]/2)*2]] = 0;
            coarseEnemyLocs.push([Math.floor(enemy_castle_locs[i][0]/2)*2, Math.floor(enemy_castle_locs[i][1]/2)*2]);
        }
    } else { // turn > 3
        for (var i = 0; i < robotsnear.length; i++) {
            if (robotsnear[i].castle_talk != 0 && robotsnear[i].castle_talk % 8 <= 6 && (robotsnear[i].castle_talk >> 3) < enemy_castle_locs.length) {
                //counts units that have not yet received all castle locations
                unitcounts[robotsnear[i].castle_talk-1]++;
            }
            if (robotsnear[i].castle_talk == SPECS.PILGRIM+1) {
                pilgrimcount++;
            }

            //read signals from castle and track which enemy locs have been broadcasted
            //this way, we know not to repeat the same signal without first cycling through all of them
            if (robotsnear[i].signal != 0 && robotsnear[i].signal % 8 == 2 && (robotsnear[i].signal >> 3) % 8 == enemy_castle_locs.length) {
                var decoded = this.decodeSignal(robotsnear[i].signal);
                var check = decoded[3] != this.me.team; //check same team
                for (var j = 0; j < castle_locs.length; j++) {
                    //verify signal was from our own castle
                    check = check || this.distance([robotsnear[i].x, robotsnear[i].y], castle_locs[j]) > 18;
                }
                //this.log("diagnose counter");
                //this.log([decoded[0], decoded[1]]);
                //this.log(castleLocCount[[decoded[0], decoded[1]]]);
                //this.log(check);
                //this.log([robotsnear[i].x, robotsnear[i].y]);
                //this.log(castle_locs);
                if (!check && castleLocCount[[decoded[0], decoded[1]]] != undefined) {
                    castleLocCount[[decoded[0], decoded[1]]]++;
                }
                //this.log(castleLocCount[[decoded[0], decoded[1]]]);
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

    //send castle locs if enough units and enough fuel, arbitrary values right now
    if (this.fuel > 1000 && unitcounts[SPECS.PREACHER] + unitcounts[SPECS.PROPHET] + unitcounts[SPECS.CRUSADER] > 50) {
        var locIndex = 0;
        for (var i = 1; i < coarseEnemyLocs.length; i++) {
            if (castleLocCount[coarseEnemyLocs[i]] < castleLocCount[coarseEnemyLocs[locIndex]]) {
                locIndex = i;
                break;
            }
        }
        this.log("!!!!!!! sending enemy castle loc");
        this.log(minFuel);
        //this.log(this.generateEnemyCastleSignal(coarseEnemyLocs[locIndex], coarseEnemyLocs.length));
        //this.log(coarseEnemyLocs[locIndex]);
        //this.log(this.decodeSignal(this.generateEnemyCastleSignal(coarseEnemyLocs[locIndex], coarseEnemyLocs.length)));
        //this.log(castleLocCount);
        this.signal(this.generateEnemyCastleSignal(coarseEnemyLocs[locIndex], coarseEnemyLocs.length), minFuel);
    }

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
                minDist = 9999999; //reuse var
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
                //this.log("sent: ");
                //this.log(lattices[index]);
                //this.log(signal);
                this.signal(signal, 2); // todo maybe: check if required r^2 is 1
                return this.buildUnit(unitBuilder, result[0], result[1]);
            }
        }
    }

    if (this.canBuild(SPECS.PILGRIM) && (friendlies[SPECS.PILGRIM] == 0 ||
        (pilgrimcount < karbonite_patches / (2 - this.me.turn / 1000) + fuel_patches / (2 - this.me.turn / 1000) &&
         this.karbonite > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_KARBONITE * 3 &&
          this.fuel > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_FUEL * 3))) {
        //can produce pilgrim
        var result = this.build(SPECS.PILGRIM);
        if(result != null) {
            pilgrimcount++;
            this.log("Created pilgrim");
            return this.buildUnit(SPECS.PILGRIM, result[0], result[1]);
        }
    }
    
    
}
