import {SPECS} from 'battlecode';
import {getLocs} from 'churchloc.js'
import {range10, range15, alldirs, lattices} from 'constants.js'
import {Compress12Bits} from 'communication.js'

//worker vars
var churches = null;
var previous_working_on = [];
var plannedchurches = [];
var stronghold_info = [];
var is_stronghold = false;
var stronghold_karb = [];
var working_workers = [];
var active_strongholds = [];
var save_for_church = false;
var contest_units = [];

//combat vars
var underattack = false;
var used_lattice_locs = [];
var turns_since_used_lattice = [];
var robotmap = null;
var robotsnear = null;
var numenemy = null; // crusaders, prophets, preachers
var friendlies = null;
var defense_units = null;
var defense_robots = null;
var defensive_health = null;
var enemy_health = null;
var minDist = null;
var closestEnemy = null;
var smallestDist = 999999;
var closestNonAttacking = null;
var lategameUnitCount = 0;

//some constants
var NOT_CONTESTED = 0;
var CONTESTED = 1;
var TRY_TO_STEAL = 2;

function update_strongholds(castle_location) {
	var spaces_covered = [];
	var nextloc = null;
	for (var i = 0; i < range15.length; i++) {
		nextloc = [castle_location[0] + range15[i][0], castle_location[1] + range15[i][1]];
		if (this.validCoords(nextloc)) {
			spaces_covered.push(this.hash(...nextloc));
			if (this.karbonite_map[nextloc[1]][nextloc[0]] || this.fuel_map[nextloc[1]][nextloc[0]]) {
				stronghold_karb.push(nextloc);
			}
		}
	}
	var not_covered = null;
	for (var i = 0; i < plannedchurches.length; i++) {
		not_covered = false;
		for (var j = 0; j < range10.length; j++) {
			nextloc = [plannedchurches[i][1][0] + range10[j][0], plannedchurches[i][1][1] + range10[j][1]];
			if (this.validCoords(nextloc) && (this.karbonite_map[nextloc[1]][nextloc[0]] || this.fuel_map[nextloc[1]][nextloc[0]])) {
				if (!spaces_covered.includes(this.hash(...nextloc))) {
					not_covered = true;
					break;
				}
			}
		}
		if (!not_covered) {
			// good, replace church
			is_stronghold = true;

			this.log("REPLACE CHURCH");
			this.log([this.me.x, this.me.y]);
			this.log(plannedchurches[i][1]);
			plannedchurches[i] = null;
			return;
		}
	}
}

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
	var myloc = this.centerOurSide([this.me.x, this.me.y]);

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
		if (my_dist_to <= enemy_dist_to) {

			// on my side
			
			var resources_obtained_by_this_church = 0;

			for (var i = 0; i < range10.length; i++) {
				if (this.validCoords([range10[i][0] + nextchurchloc[0], range10[i][1] + nextchurchloc[1]]) && (temp_fuel_map[range10[i][1] + nextchurchloc[1]][range10[i][0] + nextchurchloc[0]] || temp_karb_map[range10[i][1] + nextchurchloc[1]][range10[i][0] + nextchurchloc[0]])) {
					resources_obtained_by_this_church += 1;
					temp_karb_map[range10[i][1] + nextchurchloc[1]][range10[i][0] + nextchurchloc[0]] = false;
					temp_fuel_map[range10[i][1] + nextchurchloc[1]][range10[i][0] + nextchurchloc[0]] = false;
				}
			}

			if (resources_obtained_by_this_church != 0) {
				total_resources_obtained += resources_obtained_by_this_church;
				// add to planned churches
				if (dist_between_churches > 16) {
					plannedchurches.push([NOT_CONTESTED, nextchurchloc, resources_obtained_by_this_church, false]);
				} else {
					plannedchurches.push([CONTESTED, nextchurchloc, resources_obtained_by_this_church, false]);
				}
			}
			
		} else if (dist_between_churches <= 36) {

			var resources_obtained_by_this_church = 0;

			for (var i = 0; i < range10.length; i++) {
				if (this.validCoords([range10[i][0] + nextchurchloc[0], range10[i][1] + nextchurchloc[1]]) && (temp_fuel_map[range10[i][1] + nextchurchloc[1]][range10[i][0] + nextchurchloc[0]] || temp_karb_map[range10[i][1] + nextchurchloc[1]][range10[i][0] + nextchurchloc[0]])) {
					resources_obtained_by_this_church += 1;
					temp_karb_map[range10[i][1] + nextchurchloc[1]][range10[i][0] + nextchurchloc[0]] = false;
					temp_fuel_map[range10[i][1] + nextchurchloc[1]][range10[i][0] + nextchurchloc[0]] = false;
				}
			}

			if (resources_obtained_by_this_church != 0) {
				total_resources_obtained += resources_obtained_by_this_church;
				plannedchurches.push([TRY_TO_STEAL, nextchurchloc, resources_obtained_by_this_church, false]);
			}
		} 
	}

	this.log(plannedchurches);

}

function build_pilgrim_toward(loc) {
	if (!this.canBuild(SPECS.PILGRIM)) {
		return null;
	}
	var nextloc = null;
	var mindist = 999999;
	var bestindex = null;
	var temp = null;
    var robotsnear = this.getVisibleRobotMap();
	for (var i = 0; i < alldirs.length; i++) {
		nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
        if (this.validCoords(nextloc) && robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
        	temp = this.distance(nextloc, loc);
            if (temp < mindist) {
            	mindist = temp;
            	bestindex = i;
            }
        }
	}
	if (bestindex != null) {
		return this.buildUnit(SPECS.PILGRIM, ...alldirs[bestindex]);
	}
	return null;
}

function find_target_stronghold() {
	// find next closest church location
	var mindist = 99999;
	var bestindex = null;
	var tempdist = null;
	for (var i = 0; i < plannedchurches.length; i++) {
		if (plannedchurches[i] == null) {
			continue;
		}
		tempdist = this.distance([this.me.x, this.me.y], plannedchurches[i][1]);
		if (!plannedchurches[i][3] && !active_strongholds[i] && tempdist < mindist) {
			mindist = tempdist;
			bestindex = i;
		}
	}
	if (bestindex == null) {
		return null;
	}
	return bestindex;
}

function handle_my_stronghold() {
	// if i have karbonite around me and a worker is not working on it already
	var closestloc = null;
	var tempdist;
	var mindist = 99999;
	for (var i = 0; i < stronghold_karb.length; i++) {
		if (!working_workers.includes(this.hash(...stronghold_karb[i]))) {
			tempdist = this.distance([this.me.x, this.me.y], stronghold_karb[i]);
			if (tempdist < mindist) {
				mindist = tempdist;
				closestloc = stronghold_karb[i];
			}
		}
	}
	if (closestloc == null) {
		return null;
	}
	var res = build_pilgrim_toward.call(this, closestloc);
	if (res != null) {
		this.signal(Compress12Bits(...closestloc), 2);
		this.log("Building Pilgrim Towards: " + closestloc);
		working_workers.push(this.hash(...closestloc));
		return res;
	}
	return null;
}

function handle_castle_talk() {
	var robotsnear = this.getVisibleRobots();

	for (var i = 0; i < robotsnear.length; i++) {
		if (robotsnear[i].castle_talk != null && robotsnear[i].castle_talk > 0) {
			var church_index = robotsnear[i].castle_talk & 0b1111; // the church this unit is serving
			// this.log("Castle received Church Index: " + church_index);
			var unit_type = (robotsnear[i].castle_talk >> 4) & 1; // 5th bit, 1 == pilgrim, 0 == church
			if (plannedchurches[church_index] == null) {
				// a castle is replaced the church lol
				continue;
			}
			if (unit_type == 1 && robotsnear[i].castle_talk >> 7 == 1) {
				var occupied = (robotsnear[i].castle_talk >> 5) & 1 // if 6th bit is set, then church has been replaced
				if (occupied == 1) {
					this.log("CHURCH LOCATION OCCUPIED");
					plannedchurches[church_index] = null;
					continue;
				}  else {
					plannedchurches[church_index][3] = true;
				}
				// if (plannedchurches[church_index][3] && !active_strongholds[church_index]) {
				// 	this.log("SAVE FOR CHURCH");
				// 	save_for_church = true;
				// }
			} else if (unit_type == 0 && robotsnear[i].castle_talk >> 7 == 1) {
				active_strongholds[church_index] = true;
			}
		}
	}
}

function defend() {
	//defensive church code
	robotmap = this.getVisibleRobotMap();
    robotsnear = this.getVisibleRobots();
    var robot = null;
    numenemy = [0, 0, 0, 0, 0, 0]; // crusaders, prophets, preachers
    friendlies = [0, 0, 0, 0, 0, 0];
    defense_units = [0, 0, 0, 0, 0, 0];
    defense_robots = [];
    defensive_health = 0;
    enemy_health = 0;
    minDist = 9999999;
    closestEnemy = null;
    smallestDist = 999999;
    closestNonAttacking = null;
    for (var i = 0; i < robotsnear.length; i++) {
        robot = robotsnear[i];
        if (this.isVisible(robot) && robot.team != this.me.team) {
            numenemy[robot.unit]++;
            enemy_health += robot.health;
            var dist = this.distance([this.me.x, this.me.y], [robot.x, robot.y])
            if (dist < minDist && (SPECS.UNITS[robot.unit].ATTACK_RADIUS != null && SPECS.UNITS[robot.unit].ATTACK_RADIUS != 0)) {
                minDist = dist;
                closestEnemy = robot;
            }
            if (dist < smallestDist) {
                smallestDist = dist;
                closestNonAttacking = robotsnear[i];
            }
        } else if (this.isVisible(robot)) {
            friendlies[robot.unit]++;
            if (this.distance([this.me.x, this.me.y], [robot.x, robot.y]) < 10) {
                defense_units[robot.unit]++;
                defense_robots.push(robot.unit);
                if (robot.unit >= 3) {
                    defensive_health += robot.health;
                }
            }
        }
    }

    if (numenemy[SPECS.CRUSADER] + numenemy[SPECS.PROPHET] + numenemy[SPECS.PREACHER] == 0 && underattack) {
        underattack = false;
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
    return null;
}

function offense() {
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
}

export var Castle = function() {

	if (this.me.turn != 1) {
		// reset workers working on planned churches
		previous_working_on = []
		for (var i = 0; i < plannedchurches.length; i++) {
			if (plannedchurches[i] != null) {
				previous_working_on.push(plannedchurches[i][3]);
				plannedchurches[i][3] = false;
			} else {
				previous_working_on.push(false);
			}
		}

		// find strongholds that were being worked on last time, but now are not (enemy killed it prob)
		for (var i = 0; i < plannedchurches.length; i++) {
			if (plannedchurches[i] != null && previous_working_on[i] && !plannedchurches[i][3]) {
				// make it contested
				save_for_church = false;
				plannedchurches[i][0] = CONTESTED;
				contest_units[i] = 0;
			}
		}
	}

	handle_castle_talk.call(this);

	// find if i need to save for church
	for (var i = 0; i < plannedchurches.length; i++) {
		if (plannedchurches[i] != null && plannedchurches[i][3] && !active_strongholds[i]) {
			save_for_church = true;
		}
	}

	if (this.me.turn == 1) {
		find_church_locs.call(this);
		update_strongholds.call(this, [this.me.x, this.me.y]);
		this.log(plannedchurches);
		for (var i = 0; i < plannedchurches.length; i++) {
			active_strongholds.push(false);
			contest_units.push(0);
		}
	}

	var res = defend.call(this);
	if (res != null) {
		return res;
	}

	// build pilgrims
	if (this.canBuild(SPECS.PILGRIM)) {
		if (is_stronghold) {
			var res = handle_my_stronghold.call(this);
			if (res != null) {
				return res;
			}
		}

		if (!save_for_church) {
			// send out a worker to establish a new church settlement
			var next_stronghold_index = find_target_stronghold.call(this);

			if (next_stronghold_index != null) {

				this.log("Try sicing new location");

				if (plannedchurches[next_stronghold_index][0] == NOT_CONTESTED) {
					var res = build_pilgrim_toward.call(this, plannedchurches[next_stronghold_index][1]);
					if (res != null) {
						this.signal(next_stronghold_index | ((1) << 12), 2);
						this.log("Next Stronghold Index: " + next_stronghold_index);
						this.log("Next Stronghold coord: " + plannedchurches[next_stronghold_index][1]);
						// plannedchurches[next_stronghold_index][3] = true;
						return res;
					}
				} else if (plannedchurches[next_stronghold_index][0] == CONTESTED || plannedchurches[next_stronghold_index][0] == TRY_TO_STEAL) {
					this.log("CONTESTED SICE");
					// send prophets first, then send worker
					if (contest_units[next_stronghold_index] < 3 && this.karbonite >= (SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE) * (3 - contest_units[next_stronghold_index])) {
						this.log("Build prophet for rush :o");
						// build prophet and send her to the front lines
						//TODO: need bugfixes on choosing rush positions
						var churchloc = plannedchurches[next_stronghold_index][1];
						var res = this.buildNear(SPECS.PROPHET, churchloc);
						if (res != null) {
							var otherchurchloc = this.oppositeCoords(churchloc);
							var middle = null;
							if (this.symmetry == 1) {
								middle = [Math.floor((churchloc[0] + otherchurchloc[0]) / 2), Math.floor((churchloc[1] + otherchurchloc[1]) / 2) - 1 + contest_units[next_stronghold_index]];
							} else {
								middle = [Math.floor((churchloc[0] + otherchurchloc[0]) / 2) - 1 + contest_units[next_stronghold_index], Math.floor((churchloc[1] + otherchurchloc[1]) / 2)];
							}
							var signal = this.generateAbsoluteTarget(middle);
							this.signal(signal, 2);
							contest_units[next_stronghold_index]++;
							return this.buildUnit(SPECS.PROPHET, ...res);
						}
					} else if (contest_units[next_stronghold_index] >= 3) {
						var res = build_pilgrim_toward.call(this, plannedchurches[next_stronghold_index][1]);
						if (res != null) {
							this.log("Go for contested place!");
							this.signal(next_stronghold_index | ((1) << 12), 2);
							this.log("Next Stronghold Index: " + next_stronghold_index);
							this.log("Next Stronghold coord: " + plannedchurches[next_stronghold_index][1]);
							// plannedchurches[next_stronghold_index][3] = true;
							return res;
						}
					}
				}
			}
		}
	}

	var res = offense.call(this);
	if (res != null) {
		return res;
	}

	//do nothing
	return null;
}