import {SPECS} from 'battlecode';
import {getLocs} from 'churchloc.js'
import {alldirs, range10, lattices} from 'constants.js'
import {Decompress12Bits, Compress12Bits} from 'communication.js'

//worker vars
var churches = null;
var church_index = null;
var plannedchurches = [];
var baseloc = null;
var stronghold_karb = [];
var working_workers = [];

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
var lategameUnitCount = 0

//some constants
var NOT_CONTESTED = 0;
var CONTESTED = 1;
var TRY_TO_STEAL = 2;

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
	var myloc = baseloc;

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
					plannedchurches.push([NOT_CONTESTED, nextchurchloc, resources_obtained_by_this_church]);
				} else {
					plannedchurches.push([CONTESTED, nextchurchloc, resources_obtained_by_this_church]);
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
				plannedchurches.push([TRY_TO_STEAL, nextchurchloc, resources_obtained_by_this_church]);
			}
		}
	}
}

function find_myself() {
	var myhash = this.hash(this.me.x, this.me.y);
	for (var i = 0; i < plannedchurches.length; i++) {
		if (plannedchurches[i] != null && this.hash(...plannedchurches[i][1]) == myhash) {
			return i;
		}
	}
}

function get_spawn_loc(tempmap) {
	for (var i = 0; i < alldirs.length; i++) {
		var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
		if (this.validCoords(nextloc) && tempmap[nextloc[1]][nextloc[0]] != 0) {
			var robotthere = this.getRobot(tempmap[nextloc[1]][nextloc[0]]);
			if (robotthere.unit == SPECS.PILGRIM && robotthere.signal != -1) {
				baseloc = Decompress12Bits(robotthere.signal);
				this.log("Original location: " + baseloc);

				// add worker who created me to working workers
				var mindist = 999999;
				var bestloc = null;
				var dist = null;
				for (var i = 0; i < range10.length; i++) {
					nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
					if (this.validCoords(nextloc) && (this.karbonite_map[nextloc[1]][nextloc[0]] || this.fuel_map[nextloc[1]][nextloc[0]])) {
						dist = this.distance([0, 0], range10[i]);
						if (dist < mindist) {
							mindist = dist;
							bestloc = nextloc;
						}
					}
				}
				if (bestloc == null) {
					this.log("THIS SHOULD NEVER HAPPEN");
				}
				working_workers.push(this.hash(...bestloc));
			}
		}
	}
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
		this.log("Castle building Pilgrim Towards: " + closestloc);
		working_workers.push(this.hash(...closestloc));
		return res;
	}
	return null;
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
    if (this.karbonite > 200 + 5*friendlyAttackUnits && this.fuel > 500) {
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

export var Church = function() {

	if (this.me.turn == 1) {

		var tempmap = this.getVisibleRobotMap();

		get_spawn_loc.call(this, tempmap);
		find_church_locs.call(this);
		church_index = find_myself.call(this);
		this.log("I'm church index: " + church_index);

		// find karbonite around me
		var nextloc = null;
		for (var i = 0; i < range10.length; i++) {
			nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
			if (this.validCoords(nextloc) && (this.karbonite_map[nextloc[1]][nextloc[0]] || this.fuel_map[nextloc[1]][nextloc[0]])) {
				stronghold_karb.push(nextloc);
			}
		}
	}

	var talk = 1 << 7;
	if (church_index <= 15) {
		talk = talk | church_index;
	} else {
		this.log("This shouldn't happen, more than 16 churches??");
	}
	this.castleTalk(talk);

	var res = defend.call(this);
	if (res != null) {
		return res;
	}

	var res = handle_my_stronghold.call(this);
	if (res != null) {
		return res;
	}

	var res = offense.call(this);
	if (res != null) {
		return res;
	}
}