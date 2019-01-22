import {SPECS} from 'battlecode';
import {alldirs, range10, lattices, range25} from 'constants.js'
import * as Comms from 'communication.js'

//castle variables
var underattack = false;
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

var karbonite_patches = 0;
var fuel_patches = 0;
var karbonite_locs = [];
var fuel_locs = [];
var all_resources = [];
var karbonite_index = 0, fuel_index = 0;
var pilgrim_status = {};
var blacklisted_patches = {};
var used_patches;
var pilgrim_id_map = {};
var partial_locator = {};
var pilgrim_timer = {};
var new_pilgrim_used_patch_timer = {};  // This is to prevent blocking of used patches by pilgrims who die right after they are spawned
var all_pilgrims_seen = {};
var karb_fuel_toggle = -1;

export var Castle = function() {
    var unitcounts = [0, 0, 0, 0, 0, 0]; //only valid after turn 3

    if (this.me.turn > 3) { //to avoid conflicting with castle locations
        this.castleTalk((receivedCastleLocs << 3) + this.me.unit + 1); //signifies "im a castle and im alive"
    }
    var myloc = [this.me.x, this.me.y];
    if (minFuel == -1) {
        this.log("set minfuel");
        //this.log([this.distance(myloc, [0,0]), this.distance(myloc, [this.map.length-1, 0]), this.distance(myloc, [this.map.length -1, this.map.length -1]), this.distance(myloc, [0,this.map.length-1])]);
        minFuel = Math.max(this.distance(myloc, [0,0]), this.distance(myloc, [this.map.length-1, 0]), this.distance(myloc, [this.map.length -1, this.map.length -1]), this.distance(myloc, [0,this.map.length-1]));
        this.log(minFuel);
    }

    var robotsnear = this.getVisibleRobots();
    var robotmap = this.getVisibleRobotMap();
    turnsSinceLastReposition++;
    if (this.me.turn == 1) {
        this.log([["CASTLE_AT"], [this.me.x, this.me.y]]);
        for (var i = 0; i < this.map[0].length; i++) {
            for (var j = 0; j < this.map.length; j++) {
                if (this.karbonite_map[j][i]) {
                    karbonite_patches++;
                    karbonite_locs.push([i, j]);
                    all_resources.push([i, j]);
                } else if (this.fuel_map[j][i]) {
                    fuel_patches++;
                    fuel_locs.push([i, j]);
                    all_resources.push([i, j]);
                }
            }
        }
        this.log("checking castle talk");
        for(var i = 0; i < robotsnear.length; i++) {
            if(robotsnear[i].castle_talk) {
                first_castle = false;
                castle_locs.push(Comms.Decompress8Bits(robotsnear[i].castle_talk));
            }
        }
        this.castleTalk(Comms.Compress8Bits(this.me.x, this.me.y));

        var compare_func = function(a, b) {
            var quanta = this.distance(this.oppositeCoords(a), a) + (this.distance([this.me.x, this.me.y], a));
            var quantb = this.distance(this.oppositeCoords(b), b) + (this.distance([this.me.x, this.me.y], b));
            if (this.distance([this.me.x, this.me.y], a) <= this.distance([this.me.x, this.me.y], this.oppositeCoords(a))) {
                //is on our side, negate
                quanta = -1 / quanta;
            }
            if (this.distance([this.me.x, this.me.y], b) <= this.distance([this.me.x, this.me.y], this.oppositeCoords(b))) {
                //is on our side, negate
                quantb = -1 / quantb;
            }
            return quanta - quantb;
        };
        karbonite_locs.sort(compare_func.bind(this));
        fuel_locs.sort(compare_func.bind(this));

        used_patches = this.createarr(this.map.length, this.map[0].length);
        for(var y = 0; y < this.map.length; y++) {
            for(var x = 0; x < this.map[0].length; x++) {
                used_patches[y][x] = 0;
            }
        }
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
    } else if(this.me.turn == 3) {
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
            if (robotsnear[i].castle_talk != 0 && robotsnear[i].castle_talk % 8 <= 6 && (robotsnear[i].castle_talk >> 3) < enemy_castle_locs.length && (robotsnear[i].castle_talk >> 5) == 0) {
                //counts units that have not yet received all castle locations
                unitcounts[robotsnear[i].castle_talk-1]++;
            }

            //read signals from castle and track which enemy locs have been broadcasted
            //this way, we know not to repeat the same signal without first cycling through all of them
            if (robotsnear[i].signal != 0 && robotsnear[i].signal % 8 == 2 && (robotsnear[i].signal >> 3) % 8 == enemy_castle_locs.length) {
                var decoded = this.decodeSignal(robotsnear[i].signal);
                var check = decoded[3] != this.me.team; //check same team
                var check2 = false;
                for (var j = 0; j < castle_locs.length; j++) {
                    //verify signal was from our own castle
                    check2 = check2 || this.distance([robotsnear[i].x, robotsnear[i].y], castle_locs[j]) <= 18;
                }
                check = check || !check2;
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
    if (this.fuel > 2000 && unitcounts[SPECS.PREACHER] + unitcounts[SPECS.PROPHET] + unitcounts[SPECS.CRUSADER] > 50 /*&& unitcounts[SPECS.CASTLE] != castle_locs.length*/) {
        var locIndex = 0;
        for (var i = 1; i < coarseEnemyLocs.length; i++) {
            if (castleLocCount[coarseEnemyLocs[i]] < castleLocCount[coarseEnemyLocs[locIndex]]) {
                locIndex = i;
                break;
            }
        }
        this.log("!!!!!!! sending enemy castle loc");
        this.log(minFuel);
        this.log(castleLocCount);
        this.log(coarseEnemyLocs[locIndex]);
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
    var smallestDist = 999999;
    var closestNonAttacking = null;
    for (var i = 0; i < robotsnear.length; i++) {
        robot = robotsnear[i];
        if (robot.team != this.me.team) {
            numenemy[robot.unit]++;
            enemy_health += robot.health;
            if(this.isVisible(robot)) {
                var dist = this.distance([this.me.x, this.me.y], [robot.x, robot.y])
                if (dist < minDist && (SPECS.UNITS[robot.unit].ATTACK_RADIUS != null && SPECS.UNITS[robot.unit].ATTACK_RADIUS != 0)) {
                    minDist = dist;
                    closestEnemy = robot;
                    lastenemyseen = closestEnemy;
                }
                if (dist < smallestDist) {
                    smallestDist = dist;
                    closestNonAttacking = robotsnear[i];
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

    for(var i = 0; i < robotsnear.length; i++) {
        robot = robotsnear[i];
        if(robot.castle_talk !== undefined && robot.castle_talk !== 0) {
            var talk_value = robot.castle_talk;
            if((talk_value >> 6) == 0b10) {
                partial_locator[robot.id] = talk_value % 64;
            }
            else if((talk_value >> 6) == 0b11) {
                if(partial_locator[robot.id] === undefined) {
                    throw "This shouldn't happen, only got second part of pilgrim data";
                }
                else {
                    partial_locator[robot.id] += (talk_value % 64) << 6;
                    pilgrim_id_map[robot.id] = partial_locator[robot.id]
                    delete partial_locator[robot.id];
                    var patch = all_resources[pilgrim_id_map[robot.id]];
                    if(new_pilgrim_used_patch_timer[patch] === undefined) {
                        used_patches[patch[1]][patch[0]] += 1;
                    }
                    delete new_pilgrim_used_patch_timer[patch];
                    this.log("Pilgrim #" + robot.id + " communicated back " + all_resources[pilgrim_id_map[robot.id]]);
                    pilgrim_timer[robot.id] = 3;
                    pilgrim_timer[robot.id]++;
                    pilgrim_status[robot.id] = 0;
                    all_pilgrims_seen[robot.id] = 1;
                }
            }
            else if(talk_value == 0b01111110) {
                if(pilgrim_id_map[robot.id] !== undefined) {
                    pilgrim_timer[robot.id]++;
                    pilgrim_status[robot.id]++;
                    this.log("Pilgrim #" + robot.id + " is going to " + all_resources[pilgrim_id_map[robot.id]]);
                }
            }
            else if(talk_value == 0b01111111) {
                if(pilgrim_id_map[robot.id] !== undefined) {
                    pilgrim_timer[robot.id]++;
                    pilgrim_status[robot.id] = 0;
                    this.log("Pilgrim #" + robot.id + " is working on " + all_resources[pilgrim_id_map[robot.id]]);
                }
            }
        }
    }

    // If a pilgrim has timed out, we assume it's dead and discard it.
    for(var pilgrim in pilgrim_timer) {
        pilgrim_timer[pilgrim]--;
        if(pilgrim_timer[pilgrim] == 0) {
            if(pilgrim_id_map[pilgrim] === undefined) throw "Invalid Data State in pilgrim_id_map";
            var resource_loc = all_resources[pilgrim_id_map[pilgrim]];
            used_patches[resource_loc[1]][resource_loc[0]] -= 1;
            if(used_patches[resource_loc[1]][resource_loc[0]] < 0) {
                this.log("Invalid Data in used_patches, race condition or double counting: " + [used_patches[resource_loc[1]][resource_loc[0]], resource_loc]);
                used_patches[resource_loc[1]][resource_loc[0]] = 0;
                // throw "Invalid Data in used_patches, race condition or double counting";
            }
            delete pilgrim_timer[pilgrim];
            delete pilgrim_id_map[pilgrim];
            delete pilgrim_status[pilgrim];
            if(blacklisted_patches[resource_loc] === undefined) {
                blacklisted_patches[resource_loc] = 0;
            }
            blacklisted_patches[resource_loc] += 75;
            this.log("Pilgrim #" + pilgrim + " timed out (pilgrim_timer) on " + resource_loc);
        }
    }

    // If a pilgrim has done nothing useful for 64 turns, we discard him and free up the patch
    for(var pilgrim in pilgrim_status) {
        if(pilgrim_status[pilgrim] == 64) {
            var curr_patch = all_resources[pilgrim_id_map[pilgrim]];
            used_patches[curr_patch[1]][curr_patch[0]] -= 1;
            if(used_patches[curr_patch[1]][curr_patch[0]] < 0) {
                this.log("Invalid Data in used_patches, race condition or double counting: " + [used_patches[curr_patch[1]][curr_patch[0]], curr_patch]);
                used_patches[curr_patch[1]][curr_patch[0]] = 0;
                // throw "Invalid Data in used_patches, race condition or double counting";
            }
            delete pilgrim_timer[pilgrim];
            delete pilgrim_id_map[pilgrim];
            delete pilgrim_status[pilgrim];
            if(blacklisted_patches[curr_patch] === undefined) {
                blacklisted_patches[curr_patch] = 0;
            }
            blacklisted_patches[curr_patch] += 75;
            this.log("Pilgrim #" + pilgrim + " timed out (pilgrim_status) on " + curr_patch);
        }
    }

    // remove a patch from the blacklist once the timer hits 0.
    // The timer is set based upon how many troops the pilgrim reports back
    for(var patch in blacklisted_patches) {
        blacklisted_patches[patch]--;
        if(blacklisted_patches[patch] == 0) {
            delete blacklisted_patches[patch];
        }
    }

    for(var patch in new_pilgrim_used_patch_timer) {
        new_pilgrim_used_patch_timer[patch]--;
        if(new_pilgrim_used_patch_timer[patch] == 0) {
            used_patches[patch[1]][patch[0]] -= 1;
            if(used_patches[patch[1]][patch[0]] < 0) {
                this.log("Invalid Data in used_patches, race condition or double counting: " + [used_patches[patch[1]][patch[0]], patch]);
                used_patches[patch[1]][patch[0]] = 0;
                // throw "Invalid Data in used_patches, race condition or double counting";
            }
            delete new_pilgrim_used_patch_timer[patch];
            this.log("Pilgrim to " + patch + " timed out before communicating back");
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
            //produce prophet to counter prophet or attack
            var minDist = 999999;
            var toAttack = null;
            for (var i = 0; i < robotsnear.length; i++) {
                var robot = robotsnear[i];
                if (this.isVisible(robot) && robot.team != this.me.team && robot.unit == SPECS.PROPHET &&
                    this.distance([this.me.x, this.me.y], [robot.x, robot.y]) <= minDist) {
                    minDist = this.distance([this.me.x, this.me.y], [robot.x, robot.y]);
                    toAttack = [robot.x - this.me.x, robot.y - this.me.y];
                }
            }
            if (minDist <= 64) { //attack if i can
                this.log("CASTLE ATTACK PROPHETS");
                return this.attack(...toAttack);
            }
            //otherwise, make a prophet
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

    if (!underattack && closestEnemy == null && closestNonAttacking != null) {
        //produce these even tho not "under attack" technically
        if ((numenemy[SPECS.CASTLE] + numenemy[SPECS.CHURCH]) * 2 > defense_units[SPECS.PREACHER] && smallestDist <= 25) {
            //spawn preacher for enemy castles/churches
            //todo: make sure distance is low
            this.log("CREATE PREACHER FOR ATTACKING ENEMY CHURCH/CASTLE");
            var result = this.buildNear(SPECS.PREACHER, [closestNonAttacking.x, closestNonAttacking.y]);
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
        } else if (numenemy[SPECS.PILGRIM] > (friendlies[SPECS.PROPHET] + friendlies[SPECS.CRUSADER])*2 && smallestDist <= 64) {
            //spawn crusaders for enemy pilgrims
            this.log("CREATE prophet/crusader FOR ATTACKING ENEMY PILGRIM");
            var toBuild = smallestDist <= 16 ? SPECS.CRUSADER : SPECS.PROPHET;
            var result = this.build(toBuild);
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
                return this.buildUnit(toBuild, result[0], result[1]);
            }
        }
    }

    //im under attack and not enough karbt o build a unit (havent returned)
    //attack pls
    var bestTarget = null;
    var bestScore = -1;
    for (var i = 0; i < robotsnear.length; i++) {

        if (this.isVisible(robotsnear[i])) {
            if (robotsnear[i].team != this.me.team) {
                var enemyLoc = [robotsnear[i].x, robotsnear[i].y];

                const dist = this.distance(enemyLoc, [this.me.x, this.me.y]);
                if (dist <= 64) {
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
            }

        }
    }

    if (bestTarget != null) {
        // this.log("attacc");
        return this.attack(...bestTarget);
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

    if (this.me.turn == 1 && this.karbonite == 100 /* first castle */) {
        //spawn prophet to reach ideal resource cucking (if exists)
        var highestResources = 1;
        var siceLoc = null;
        for (var i = 0; i < all_resources.length; i++) {
            var inbetween = [Math.floor((all_resources[i][0] + this.oppositeCoords(all_resources[i])[0]) / 2), Math.floor((all_resources[i][1] + this.oppositeCoords(all_resources[i])[1]) / 2)];
            var distFromCenter = this.distance(inbetween, all_resources[i]);
            if (this.distance(myloc, all_resources[i]) > this.distance(myloc, this.oppositeCoords(all_resources[i]))
                && distFromCenter <= 36) {
                //if it is on enemy side and close enough to center (values arbitrary right now)
                //count karb within radius 5 to choose best one to steal
                //only do semicircle closer to center as we dont want to consider what may be unreachable deposits
                var count = 0;
                for (var j = 0; j < range25.length; j++) {
                    var sourceloc = [all_resources[i][0] + range25[j][0], all_resources[i][1] + range25[j][1]];
                    var nextDistFromCenter = this.distance(sourceloc, [Math.floor((sourceloc[0] + this.oppositeCoords(sourceloc)[0]) / 2), Math.floor((sourceloc[1] + this.oppositeCoords(sourceloc)[1]) / 2)]);
                    if (this.validCoords(sourceloc) && nextDistFromCenter <= distFromCenter && (this.fuel_map[sourceloc[1]][sourceloc[0]] || this.karbonite_map[sourceloc[1]][sourceloc[0]])) {
                        count++;
                    }
                }
                if (count > highestResources) {
                    var symmetry = this.symmetricType();

                    var tmpLoc = inbetween;
                    /*var tmpLoc1 = [all_resources[i][0],all_resources[i][1]];
                    var tmpLoc2 = [all_resources[i][0],all_resources[i][1]];
                    tmpLoc1[1 - symmetry] += 7;
                    tmpLoc2[1 - symmetry] -= 7; //7 is necessary radius to see all detected resources

                    if (this.distance(myloc, tmpLoc1) > this.distance(myloc, tmpLoc2)) {
                        //loc2 is on our side
                        tmpLoc = tmpLoc2;
                    } else {
                        //loc1 is our side
                        tmpLoc = tmpLoc1;
                    }*/
                    if (tmpLoc != null && this.map[tmpLoc[1]][tmpLoc[0]]) {
                        //passable
                        highestResources = count;
                        siceLoc = tmpLoc;
                    }
                }
            }
        }
        if (siceLoc != null) {
            this.log("good cuck spot?");
            this.log(siceLoc);
            this.log("produce prophet to hog resources lol");
            var result = this.buildNear(SPECS.PROPHET, siceLoc);
            if (result != null) {
                var signal = this.generateAbsoluteTarget(siceLoc);
                this.signal(signal, 2);
                return this.buildUnit(SPECS.PROPHET, result[0], result[1]);
            }
        } else {
            this.log("no good cuck spot");
        }
    }

    var mine_karb = function() {
        karb_fuel_toggle++;
        return karb_fuel_toggle % 2 == 0; //0 for karb, 1 for fuel
    }

    if (this.canBuild(SPECS.PILGRIM) &&
          this.karbonite > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_KARBONITE * 2 &&
          this.fuel > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_FUEL * 2) {
          var cnt = 0;
          if(!mine_karb()) {
              while(used_patches[fuel_locs[fuel_index][1]][fuel_locs[fuel_index][0]] > 0 ||
                    blacklisted_patches[fuel_locs[fuel_index]] !== undefined) {
                  fuel_index = (fuel_index + 1) % fuel_patches;
                  cnt++;
                  if(cnt == fuel_locs.length) return;
              }
              var target = fuel_locs[fuel_index];
              var result = this.buildNear(SPECS.PILGRIM, fuel_locs[fuel_index]);
              if(result != null) {
                  used_patches[target[1]][target[0]] += 1;
                  // ALL THIS BULLSHIT BECAUSE POOORTHO IS  RETARDED
                  var translated = [target[0] - 32, target[1] - 32];
                  var signal = this.generateInitialPosSignalVal(translated);
                  this.log("Pilgrim sent to: " + target);
                  this.log("Pilgrim signal: " + translated + " -> " + signal);
                  this.signal(signal, 2);
                  return this.buildUnit(SPECS.PILGRIM, result[0], result[1]);
              }
          }
          else {
              while(used_patches[karbonite_locs[karbonite_index][1]][karbonite_locs[karbonite_index][0]] > 0 ||
                    blacklisted_patches[karbonite_locs[karbonite_index]] !== undefined) {
                  karbonite_index = (karbonite_index + 1) % karbonite_patches;
                  cnt++;
                  if(cnt == karbonite_locs.length) return;
              }
              var target = karbonite_locs[karbonite_index];
              var result = this.buildNear(SPECS.PILGRIM, karbonite_locs[karbonite_index]);
              if(result != null) {
                  used_patches[target[1]][target[0]] += 1;
                  new_pilgrim_used_patch_timer[target] = 4;
                  var translated = [target[0] - 32, target[1] - 32];
                  var signal = this.generateInitialPosSignalVal(translated);
                  this.log("Pilgrim sent to: " + target);
                  this.log("Pilgrim signal: " + translated + " -> " + signal);
                  this.signal(signal, 2);
                  return this.buildUnit(SPECS.PILGRIM, result[0], result[1]);
              }
          }
    }
}
