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
var castlelocs = [];
var my_church_loc = null;
var i_got_attacked = false;

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
var VERY_CONTESTED = 2;
var CONTESTED_UNITS = [0, 0, 0, 0, 2, 1];
var VERY_CONTESTED_UNITS = [0, 0, 0, 2, 4, 0];

function update_strongholds(castle_location) {
	for (var i = 0; i < plannedchurches.length; i++) {
		if (this.distance([this.me.x, this.me.y], plannedchurches[i][1]) <= 10) {
			// good, replace church
			is_stronghold = true;

			var nextloc = null;
			for (var j = 0; j < range15.length; j++) {
				nextloc = [this.me.x + range15[j][0], this.me.y + range15[j][1]];
				if (this.validCoords(nextloc) && (this.karbonite_map[nextloc[1]][nextloc[0]] || this.fuel_map[nextloc[1]][nextloc[0]])) {
					stronghold_karb.push(nextloc);
				}
			}

			this.log(stronghold_karb);

			this.log("REPLACE CHURCH");
			this.log([this.me.x, this.me.y]);
			this.log(plannedchurches[i][1]);
			my_church_loc = plannedchurches[i][1];
			plannedchurches[i] = null;

			return;
		}
	}
	/*
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
	var not_covered_count = null;
	for (var i = 0; i < plannedchurches.length; i++) {
		not_covered_count = 0;
		for (var j = 0; j < range10.length; j++) {
			nextloc = [plannedchurches[i][1][0] + range10[j][0], plannedchurches[i][1][1] + range10[j][1]];
			if (this.validCoords(nextloc) && (this.karbonite_map[nextloc[1]][nextloc[0]] || this.fuel_map[nextloc[1]][nextloc[0]])) {
				if (!spaces_covered.includes(this.hash(...nextloc))) {
					not_covered_count++;
				}
			}
		}
		if (not_covered_count <= 1) {
			// good, replace church
			is_stronghold = true;

			this.log("REPLACE CHURCH");
			this.log([this.me.x, this.me.y]);
			this.log(plannedchurches[i][1]);
			plannedchurches[i] = null;
			return;
		}
	}*/
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
	// this.log(parsed_churches);

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
	this.log("SAMe LOC");
	this.log(myloc);

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

			if (resources_obtained_by_this_church > 1) {
				total_resources_obtained += resources_obtained_by_this_church;
				// add to planned churches
				if (dist_between_churches >= 64) {
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

			if (resources_obtained_by_this_church > 1) {
				total_resources_obtained += resources_obtained_by_this_church;
				plannedchurches.push([VERY_CONTESTED, nextchurchloc, resources_obtained_by_this_church, false]);
			}
		} 
	}
	this.log("PLANNED CHURCHES");
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

	var tempdist = null;
	var mindist = 999999;
	var closest_stronghold_index = null;

	for (var i = 0; i < plannedchurches.length; i++) {
		for (var j = 0; j < castlelocs.length; j++) {
			if (plannedchurches[i] == null || plannedchurches[i][0] == VERY_CONTESTED) {
				continue;
			}
			tempdist = this.distanceFromCenter(plannedchurches[i][1]);
			if (tempdist < mindist && !plannedchurches[i][3]) {
				mindist = tempdist;
				closest_stronghold_index = i;
			}
		}
	}

	if (closest_stronghold_index != null) {
		mindist = 9999999;
		var closest_castle = null;
		var tempdist;
		for (var i = 0; i < castlelocs.length; i++) {
			tempdist = this.distance(plannedchurches[closest_stronghold_index][1], castlelocs[i]);
			if (tempdist < mindist) {
				mindist = tempdist;
				closest_castle = castlelocs[i];
			}
		}
		// this.log("Closest castle");
		// this.log(closest_castle);
		// this.log([this.me.x, this.me.y]);
		// this.log(my_church_loc);
		// this.log(closest_stronghold_index);
		if (this.hash(...closest_castle) == this.hash(...my_church_loc)) {
			return closest_stronghold_index;
		}
	}

	return null;


	// find closest two castle loc and stronghold loc

	/*
	var tempdist = null;
	var mindist = 999999;
	var closest_stronghold_index = null;
	var closest_castle = null;

	var min_contest_dist = 999999;
	var closest_contest_index = null;
	var closest_contest_castle = null;
	for (var i = 0; i < plannedchurches.length; i++) {
		for (var j = 0; j < castlelocs.length; j++) {
			if (plannedchurches[i] == null) {
				continue;
			}
			tempdist = this.distance(plannedchurches[i][1], castlelocs[j]);
			if (plannedchurches[i][0] == CONTESTED) {
				if (tempdist < min_contest_dist && !plannedchurches[i][3]) {
					min_contest_dist = tempdist;
					closest_contest_index = i;
					closest_contest_castle = castlelocs[j];
				}
			} else if (plannedchurches[i][0] == NOT_CONTESTED) {
				if (tempdist < mindist && !plannedchurches[i][3]) {
					mindist = tempdist;
					closest_stronghold_index = i;
					closest_castle = castlelocs[j];
				}
			}
			
		}
	}

	// this.log(closest_contest_castle);
	// this.log(my_church_loc);
	// this.log(min_contest_dist);

	if (min_contest_dist - 200 < mindist) {
		if (closest_contest_castle != null && this.hash(...closest_contest_castle) == this.hash(...my_church_loc)) {
			this.log("new contested settlmeent");
			this.log(closest_contest_castle);
			this.log([this.me.x, this.me.y]);
			this.log(plannedchurches[closest_contest_index]);
			return closest_contest_index;
		}
	} else if (closest_castle != null && this.hash(...closest_castle) == this.hash(...my_church_loc)) {
		this.log("new settlmeent");
		this.log(closest_castle);
		this.log([this.me.x, this.me.y]);
		this.log(plannedchurches[closest_stronghold_index]);
		return closest_stronghold_index;
	}
	
	return null;*/
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
				// it's a castle bro
				continue;
			}
			if (unit_type == 1 && robotsnear[i].castle_talk >> 7 == 1) {
				var occupied = (robotsnear[i].castle_talk >> 5) & 1 // if 6th bit is set, then it's a castle
				if (occupied == 1) {
					// there's already a castle here
					var already_added = false;
					for (var j = 0; j < castlelocs.length; j++) {
						if (this.hash(...castlelocs[j]) == this.hash(...plannedchurches[church_index][1])) {
							already_added = true;
							break;
						}
					}
					if (!already_added) {
						this.log("Castle sice");
						castlelocs.push(plannedchurches[church_index][1]);
						this.log(castlelocs);
						plannedchurches[church_index] = null;
						this.log(plannedchurches);
					}
					
					continue;
				}  else {
					plannedchurches[church_index][3] = true;
				}
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
    }

    if (numenemy[SPECS.CRUSADER] + numenemy[SPECS.PROPHET] + numenemy[SPECS.PREACHER] != 0 || i_got_attacked) {
        if (numenemy[SPECS.CRUSADER] + numenemy[SPECS.PREACHER] > defense_units[SPECS.PREACHER] * 3) {
        	underattack = true;
    		i_got_attacked = true;
            this.log("CREATE PREACHER FOR DEFENSE");
            var result = null;
            if (closestEnemy == null) {
            	closestEnemy = {"x":this.map[0].length / 2, "y":this.map.length / 2, "unit":SPECS.PREACHER};
            }
            if (closestEnemy.unit == SPECS.PREACHER) {
                this.log("ohno");
                result = this.buildSpread(SPECS.PREACHER, [closestEnemy.x, closestEnemy.y]);
            } else {
                result = this.buildNear(SPECS.PREACHER, [closestEnemy.x, closestEnemy.y]);
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
						var num_adjacent_deposits = 0;
						for (var i = 0; i < alldirs.length; i++) {
							var checkloc = [latticeloc[0] + alldirs[i][0], latticeloc[1] + alldirs[i][1]];
							if (this.validCoords(checkloc) && (this.karbonite_map[checkloc[1]][checkloc[0]] || this.fuel_map[checkloc[1]][checkloc[0]])) {
								num_adjacent_deposits++;
							}
						}
						if (num_adjacent_deposits <= 1) {
							//dont want too many fuel depos
							used_lattice_locs.push(index);
							turns_since_used_lattice.push(0);
							break; //found tile :O
						}
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
            return null;
        } else if ((numenemy[SPECS.PROPHET] + numenemy[SPECS.PREACHER] >= defense_units[SPECS.PROPHET] + defense_units[SPECS.PREACHER]) || (i_got_attacked && (defense_units[SPECS.PROPHET] < 2 || defensive_health < 40))) {
			underattack = true;
    		i_got_attacked = true;
			//produce prophet to counter prophet or attack
			//TODO: @void add a condition to attack here if enemy is within attack range
			//also add attack at the end of all the ifs
			//otherwise, make a prophet
			//technically thisll always build a prophet as it will attack if its close enough for a preacher but for consistency i thought i'd add it here
            var toBuild = SPECS.PROPHET;
            var result = null;
            if (closestEnemy == null) {
            	closestEnemy = {"x":this.map[0].length / 2, "y":this.map.length / 2, "unit":SPECS.PREACHER};
            	this.log("CAN I PLEASE DEFEND");
            	this.log(this.karbonite);
            }
            if (numenemy[SPECS.PREACHER] > 0) {
            	result = this.buildAway(toBuild, [closestEnemy.x, closestEnemy.y]);
            } else {
            	result = this.buildNear(toBuild, [closestEnemy.x, closestEnemy.y]);
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
						var num_adjacent_deposits = 0;
						for (var i = 0; i < alldirs.length; i++) {
							var checkloc = [latticeloc[0] + alldirs[i][0], latticeloc[1] + alldirs[i][1]];
							if (this.validCoords(checkloc) && (this.karbonite_map[checkloc[1]][checkloc[0]] || this.fuel_map[checkloc[1]][checkloc[0]])) {
								num_adjacent_deposits++;
							}
						}
						if (num_adjacent_deposits <= 1) {
							//dont want too many fuel depos
							used_lattice_locs.push(index);
							turns_since_used_lattice.push(0);
							break; //found tile :O
						}
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
                this.log("CREATE PROPHET BITCH");
                return this.buildUnit(toBuild, result[0], result[1]);
            }
            return null;
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
						var num_adjacent_deposits = 0;
						for (var i = 0; i < alldirs.length; i++) {
							var checkloc = [latticeloc[0] + alldirs[i][0], latticeloc[1] + alldirs[i][1]];
							if (this.validCoords(checkloc) && (this.karbonite_map[checkloc[1]][checkloc[0]] || this.fuel_map[checkloc[1]][checkloc[0]])) {
								num_adjacent_deposits++;
							}
						}
						if (num_adjacent_deposits <= 1) {
							//dont want too many fuel depos
							used_lattice_locs.push(index);
							turns_since_used_lattice.push(0);
							break; //found tile :O
						}
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
            return null;
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
						var num_adjacent_deposits = 0;
						for (var i = 0; i < alldirs.length; i++) {
							var checkloc = [latticeloc[0] + alldirs[i][0], latticeloc[1] + alldirs[i][1]];
							if (this.validCoords(checkloc) && (this.karbonite_map[checkloc[1]][checkloc[0]] || this.fuel_map[checkloc[1]][checkloc[0]])) {
								num_adjacent_deposits++;
							}
						}
						if (num_adjacent_deposits <= 1) {
							//dont want too many fuel depos
							used_lattice_locs.push(index);
							turns_since_used_lattice.push(0);
							break; //found tile :O
						}
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
            return null;
        }
    }
    return false;
}

function castleAttack() {
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
    } else {
		return null;
	}
}

function offense() {
	//offensive code lategame
    var friendlyAttackUnits = friendlies[SPECS.CRUSADER] + friendlies[SPECS.PREACHER] + friendlies[SPECS.PROPHET];
    var distanceToCenter = this.distanceFromCenter([this.me.x, this.me.y]);
    if (this.karbonite > 120 + 5*friendlyAttackUnits + distanceToCenter/4 && this.fuel > 450 + distanceToCenter/4) {
    // if (this.karbonite > 150 + 5*friendlyAttackUnits && this.fuel > 500) { // old lattice code
        // lmoa build a prophet
        lategameUnitCount++;
        var unitBuilder;
        unitBuilder = SPECS.PROPHET;
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
					var num_adjacent_deposits = 0;
					for (var i = 0; i < alldirs.length; i++) {
						var checkloc = [latticeloc[0] + alldirs[i][0], latticeloc[1] + alldirs[i][1]];
						if (this.validCoords(checkloc) && (this.karbonite_map[checkloc[1]][checkloc[0]] || this.fuel_map[checkloc[1]][checkloc[0]])) {
							num_adjacent_deposits++;
						}
					}
					if (num_adjacent_deposits <= 1) {
						//dont want too many fuel depos
						used_lattice_locs.push(index);
						turns_since_used_lattice.push(0);
						break; //found tile :O
					}
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

function build_contest_units(target_amount, next_stronghold_index) {
	// check if meet amount
	var karb_needed = 0;
	var units_needed = 0;
	var total_units_needed = 0;
	for (var i = 0; i < contest_units[next_stronghold_index].length; i++) {
		if (contest_units[next_stronghold_index][i] < target_amount[i]) {
			this.log(contest_units[next_stronghold_index]);
			units_needed += target_amount[i] - contest_units[next_stronghold_index][i];
			total_units_needed += target_amount[i];
			karb_needed += (target_amount[i] - contest_units[next_stronghold_index][i]) * SPECS.UNITS[i].CONSTRUCTION_KARBONITE;
		}
	}
	this.log("KARB NEEDED:");
	this.log(karb_needed);
	this.log(this.karbonite);
	if (units_needed == 0) {
		// build a pilgrim
		this.log("Build pilgrim to sice me!");
		var res = build_pilgrim_toward.call(this, plannedchurches[next_stronghold_index][1]);
		if (res != null) {
			this.log("Go for contested place!");
			this.signal(next_stronghold_index | ((1) << 12), 2);
			this.log("Next Stronghold Index: " + next_stronghold_index);
			this.log("Next Stronghold coord: " + plannedchurches[next_stronghold_index][1]);
			// plannedchurches[next_stronghold_index][3] = true;
			return res;
		}
		return null;
	}
	/*
	if (units_needed == total_units_needed) {
		karb_needed += 30;
	}*/
	if (karb_needed - 20 > this.karbonite) {
		return null;
	}
	if (contest_units[next_stronghold_index][SPECS.PREACHER] < target_amount[SPECS.PREACHER]) {
		// build preacher
		var churchloc = plannedchurches[next_stronghold_index][1];
		var res = this.buildNear(SPECS.PREACHER, churchloc);
		if (res != null) {
			var otherchurchloc = this.oppositeCoords(churchloc);
			var middle = null;
			if (this.symmetry == 1) {
				middle = [Math.floor((churchloc[0] + otherchurchloc[0]) / 2), Math.floor((churchloc[1] + otherchurchloc[1]) / 2)];
			} else {
				middle = [Math.floor((churchloc[0] + otherchurchloc[0]) / 2), Math.floor((churchloc[1] + otherchurchloc[1]) / 2)];
			}
			var signal = this.generateAbsoluteTarget(middle);
			this.signal(signal, 2);
			contest_units[next_stronghold_index][SPECS.PREACHER]++;
			return this.buildUnit(SPECS.PREACHER, ...res);
		}
		this.log("Failed to build preacher to frontlines");
		return null;
	} if (contest_units[next_stronghold_index][SPECS.PROPHET] < target_amount[SPECS.PROPHET]) {
		// build propheto
		var churchloc = plannedchurches[next_stronghold_index][1];
		var res = this.buildNear(SPECS.PROPHET, churchloc);
		if (res != null) {
			var otherchurchloc = this.oppositeCoords(churchloc);
			var middle = null;
			if (this.symmetry == 1) {
				middle = [Math.floor((churchloc[0] + otherchurchloc[0]) / 2), Math.floor((churchloc[1] + otherchurchloc[1]) / 2)];
			} else {
				middle = [Math.floor((churchloc[0] + otherchurchloc[0]) / 2), Math.floor((churchloc[1] + otherchurchloc[1]) / 2)];
			}
			var signal = this.generateAbsoluteTarget(middle);
			this.signal(signal, 2);
			contest_units[next_stronghold_index][SPECS.PROPHET]++;
			return this.buildUnit(SPECS.PROPHET, ...res);
		}
		this.log("Failed to build prophet to frontlines");
		return null;
	} else if (contest_units[next_stronghold_index][SPECS.CRUSADER] < target_amount[SPECS.CRUSADER]) {
		var churchloc = plannedchurches[next_stronghold_index][1];
		var res = this.buildNear(SPECS.CRUSADER, churchloc);
		if (res != null) {
			var otherchurchloc = this.oppositeCoords(churchloc);
			var middle = null;
			if (this.symmetry == 1) {
				middle = [Math.floor((churchloc[0] + otherchurchloc[0]) / 2), Math.floor((churchloc[1] + otherchurchloc[1]) / 2)];
			} else {
				middle = [Math.floor((churchloc[0] + otherchurchloc[0]) / 2), Math.floor((churchloc[1] + otherchurchloc[1]) / 2)];
			}
			var signal = this.generateAbsoluteTarget(middle);
			this.signal(signal, 2);
			contest_units[next_stronghold_index][SPECS.CRUSADER]++;
			return this.buildUnit(SPECS.CRUSADER, ...res);
		}
		this.log(this.karbonite);
		return null;
	}
	return null;
}

function handle_unit_production(next_stronghold_index) {
	if (plannedchurches[next_stronghold_index][0] == NOT_CONTESTED) {
		var res = build_pilgrim_toward.call(this, plannedchurches[next_stronghold_index][1]);
		if (res != null) {
			this.signal(next_stronghold_index | ((1) << 12), 2);
			this.log("Next Stronghold Index: " + next_stronghold_index);
			this.log("Next Stronghold coord: " + plannedchurches[next_stronghold_index][1]);
			// plannedchurches[next_stronghold_index][3] = true;
			return res;
		}
	} else if (plannedchurches[next_stronghold_index][0] == CONTESTED) {
		this.log("CONTESTED SICE");
		return build_contest_units.call(this, CONTESTED_UNITS, next_stronghold_index);
	} else if (plannedchurches[next_stronghold_index][0] == VERY_CONTESTED) {
		this.log("VERY CONTESTED");
		this.log(plannedchurches[next_stronghold_index][1]);
		return build_contest_units.call(this, VERY_CONTESTED_UNITS, next_stronghold_index);
	}
	return null;
}

export var Castle = function() {

    for (var i = 0; i < used_lattice_locs.length; i++) {
        if (turns_since_used_lattice[i] > used_lattice_locs[i][0] + used_lattice_locs[i][1] + 2) {
            //pop since its been long enough probably
            turns_since_used_lattice.splice(i, 1);
            used_lattice_locs.splice(i, 1);
        } else {
            turns_since_used_lattice[i]++;
        }
	}
	
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
				plannedchurches[i][0] = VERY_CONTESTED;
				contest_units[i] = [0, 0, 0, 0, 0, 0];
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
			contest_units.push([0, 0, 0, 0, 0, 0]);
		}
		castlelocs.push(my_church_loc);
	}

	var res = defend.call(this);
	if (res != false) {
		if (res == null) {
			return castleAttack.call(this);
		}
		return res;
	}

	res = castleAttack.call(this);
	if (res != null) {
		return res;
	}

	// build pilgrims
	if (this.canBuild(SPECS.PILGRIM)) {
		if (is_stronghold) {
			var res = handle_my_stronghold.call(this);
			if (res != null) {
				this.log("Doing stronghold stuff");
				return res;
			}
		}

		if (!save_for_church || this.karbonite > 150) {
			// send out a worker to establish a new church settlement
			var next_stronghold_index = find_target_stronghold.call(this);

			if (next_stronghold_index != null) {

				var res = handle_unit_production.call(this, next_stronghold_index);
				if (res != null) {
					return res;
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