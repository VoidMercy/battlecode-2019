import {SPECS} from 'battlecode';
import {getLocs} from 'churchloc.js'
import {Decompress12Bits, Compress12Bits} from 'communication.js'
import {alldirs, range10, CONTESTED_CHURCH_DIST} from 'constants.js'

var churches = null;
var church_index = null;
var plannedchurches = [];
var enemychurches = [];
var castleloc = null;
var karblocation = null;
var karbfuel = null;
var currentstatus = null;
var spawn_loc = null;
var suicide = false;
var serve = null;
var robotsnear;

var KARB = 0;
var FUEL = 1;
var NOT_CONTESTED = 0;
var CONTESTED = 1;
var VERY_CONTESTED = 2;
var MINER = 0;
var SETTLER = 1;
var POOR_THRESHOLD = 80;
var POOR_KARB_AMOUNT = 10;

function get_spawn_loc(tempmap) {
	// find location of church/castle and obtain which karb/fuel to go to
    for (var i = 0; i < alldirs.length; i++) {
        var nextLoc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
        if (this.validCoords(nextLoc)) {
            var robot = this.getRobot(tempmap[nextLoc[1]][nextLoc[0]]);
            if (tempmap[nextLoc[1]][nextLoc[0]] > 0 &&
            (robot.unit == SPECS.CASTLE || robot.unit == SPECS.CHURCH)) {
            	spawn_loc = nextLoc;
            	serve = robot.unit;
                if (robot.signal != -1) {
                	// parse for karb location
                	var directive = robot.signal >> 12;
                	if (directive == 0) {
                		currentstatus = MINER;
                		karblocation = Decompress12Bits(robot.signal & 0b111111111111);
                		// this.log("I'm a karb miner");
                		// this.log("Received Location: " + karblocation)
                   		if (this.fuel_map[karblocation[1]][karblocation[0]]) {
	                		karbfuel = FUEL;
	                	} else {
	                		karbfuel = KARB;
	                	}
	                	castleloc = nextLoc;
	                	return;
                	} else if (directive == 1) {
                		// this.log("I'm a settler");
                		currentstatus = SETTLER;
                		church_index = robot.signal & 0b111111111111;
                		serve = SPECS.CHURCH;
                		// this.log("Received church index: " + church_index);
                		return;
                	}
                } else {
                    this.log("NO SIGNAL?? wtf?");
                }
                break;
            }
        }
    }

    this.log("Castle Location: " + castleloc);

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
	var myloc = spawn_loc;

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
			if (my_dist_to <= enemy_dist_to) {
				if (dist_between_churches >= CONTESTED_CHURCH_DIST) {
					plannedchurches.push([NOT_CONTESTED, nextchurchloc, resources_obtained_by_this_church, false]);
				} else {
					plannedchurches.push([CONTESTED, nextchurchloc, resources_obtained_by_this_church, false]);
				}
			} else {
				plannedchurches.push([VERY_CONTESTED, nextchurchloc, resources_obtained_by_this_church, false]);
			}
		}
	}
	this.log("PLANNED CHURCHES");
	// this.log(plannedchurches);
}

function stay_away_from_danger() {
	for (var i = 0; i < robotsnear.length; i++) {
		if (this.isVisible(robotsnear[i]) && robotsnear[i].team != this.me.team) {
			if (SPECS.UNITS[robotsnear[i].unit].ATTACK_DAMAGE != null && SPECS.UNITS[robotsnear[i].unit].ATTACK_DAMAGE != 0) {
				var dist_to_robot = this.distance([this.me.x, this.me.y], [robotsnear[i].x, robotsnear[i].y]);
				if (robotsnear[i].unit != SPECS.PREACHER) {
					if (dist_to_robot <= SPECS.UNITS[robotsnear[i].unit].ATTACK_RADIUS[1]) {
						return this.greedyMoveAway([robotsnear[i].x, robotsnear[i].y]);;
					}
				} else {
					if (dist_to_robot <= SPECS.UNITS[robotsnear[i].unit].ATTACK_RADIUS[1] + 4) {
						return this.greedyMoveAway([robotsnear[i].x, robotsnear[i].y]);;
					}
				}
			}
		}
	}
	return false;
}

function gomine() {
	// go mine
	var check = false;
	if (this.karbonite < POOR_THRESHOLD && karbfuel == KARB) {
		check = this.me.karbonite < POOR_KARB_AMOUNT;
	} else {
		if (karbfuel == KARB) {
        check = this.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY;
	    } else {
	        check = this.me.fuel < SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY;
	    }
	}

	var res = stay_away_from_danger.call(this);
	if (res != false) {
		return res;
	}

	var robotmap = this.getVisibleRobotMap();
	var robotsnear = this.getVisibleRobots();
	var robot;

	var castle_there = false;
	if (robotmap[castleloc[1]][castleloc[0]] > 0 && this.getRobot(robotmap[castleloc[1]][castleloc[0]]).unit == SPECS.CHURCH && this.getRobot(robotmap[castleloc[1]][castleloc[0]]).team == this.me.team) {
		castle_there = true;
	}
	for (var i = 0; i < robotsnear.length; i++) {
		robot = robotsnear[i];
		if (this.isVisible(robot) && robot.team != this.me.team && !castle_there) {
			check = false;
			break;
		}
	}

	if (robotmap[castleloc[1]][castleloc[0]] == 0 && plannedchurches[church_index][0] == CONTESTED) {
		check = false;
	}
    
	if (check && this.me.x == karblocation[0] && this.me.y == karblocation[1]) {
		return this.mine();
	} else if (!check) {
		if (this.distance(castleloc, karblocation) > 10) {
			// try to build church, otherwise wait here
			this.log("This shouldn't happen");
			return null;
		} else {
			if (this.distance([this.me.x, this.me.y], castleloc) <= 2) {
				if (this.me.x == castleloc[0] && this.me.y == castleloc[1]) {
					return this.greedyMoveAway(castleloc);
				}
				// build a church if there isn't a castle or church there
				
				if (robotmap[castleloc[1]][castleloc[0]] == 0) {
					// build church
					if (this.canBuild(SPECS.CHURCH)) {
						//build a church
						this.log("Building a Church :o");
						var signal = Compress12Bits(...spawn_loc);
						this.signal(signal, 2);
						return this.buildUnit(SPECS.CHURCH, castleloc[0] - this.me.x, castleloc[1] - this.me.y);
					}
				} else {
					var robotthere = this.getRobot(robotmap[castleloc[1]][castleloc[0]]);
					if (robotthere != null && robotthere.team == this.me.team && (robotthere.unit == SPECS.CASTLE || robotthere.unit == SPECS.CHURCH)) {
						return this.give(castleloc[0] - this.me.x, castleloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
					}
				}
				return null;
			} else {
				return this.workermoveto(castleloc);
			}
		}
		
	} else {
		// if i would be walking into enemy range, then do nothing
		return this.workermoveto(karblocation);
	}
}

function gosettle() {
	// Go build a church
	if (this.distance([this.me.x, this.me.y], castleloc) <= 10) {
		// I'm in vision of destination, check around for a castle
		var nextloc = null;
		var robotmap = this.getVisibleRobotMap();
		for (var i = 0; i < range10.length; i++) {
			nextloc = [castleloc[0] + range10[i][0], castleloc[1] + range10[i][1]];
			if (this.validCoords(nextloc) && robotmap[nextloc[1]][nextloc[0]] > 0) {
				var robotthere = this.getRobot(robotmap[nextloc[1]][nextloc[0]]);
				if (robotthere.unit == SPECS.CASTLE) {
					this.log("Darn there's already a settlement there, guess i'm gonna die");
					suicide = true;
					return gosuicide.call(this);
				}
			}
		}

		// I'm in vision of my destination, pick closest karbonite
		var mindist = 999999;
		var bestloc = null;
		var dist = null;
		for (var i = 0; i < range10.length; i++) {
			nextloc = [castleloc[0] + range10[i][0], castleloc[1] + range10[i][1]];
			if (this.validCoords(nextloc) && (this.karbonite_map[nextloc[1]][nextloc[0]] || this.fuel_map[nextloc[1]][nextloc[0]])) {
				dist = this.distance(castleloc, nextloc);
				if (dist < mindist) {
					mindist = dist;
					bestloc = nextloc;
				}
			}
		}
		if (bestloc == null) {
			this.log("THIS SHOULD NEVER EVER HAPPEN");
		}
		currentstatus = MINER;
		karblocation = bestloc;
		if (this.fuel_map[karblocation[1]][karblocation[0]]) {
    		karbfuel = FUEL;
    	} else {
    		karbfuel = KARB;
    	}
	} else {
		var res = stay_away_from_danger.call(this);
		if (res != false) {
			return res;
		}
		return this.moveto(castleloc);
	}
}

function gosuicide() {
	this.log("SUICIDING!!!");
	return this.workermoveto([0, 0]);
}

function get_church_index() {
	var mindist = 999999;
	var closest_index = null;
	var tempdist = null;
	var myloc = [this.me.x, this.me.y];
	for (var i = 0; i < plannedchurches.length; i++) {
		tempdist = this.distance(spawn_loc, plannedchurches[i][1]);
		if (tempdist < mindist) {
			mindist = tempdist;
			closest_index = i;
		}
	}
	return closest_index;
}

export var Pilgrim = function() {

	var tempmap = this.getVisibleRobotMap();
	robotsnear = this.getVisibleRobots();

	if (this.me.turn == 1) {

		get_spawn_loc.call(this, tempmap);
		find_church_locs.call(this);
		if (currentstatus == SETTLER) {
			castleloc = plannedchurches[church_index][1];
			this.log("Church Settle Location: " + castleloc);
		} else {
			church_index = get_church_index.call(this);
		}
	}

	if (suicide) {
		return gosuicide.call(this);
	}

	// not turn 1 stuff

	if (church_index != null) {
		// i was sent out to build a church
		var talk = 3 << 5;
		if (serve == SPECS.CASTLE) {
			talk = talk | (1 << 7);
		}
		if (church_index <= 31) {
			talk = talk | church_index;
		} else {
			this.log("This shouldn't happen, more than 16 churches??");
		}
		this.castleTalk(talk);
	} else {
		this.log("WHAT THE FUCK THIS SHOULDN'T HAPPEN SOMETHING BROKE");
	}

	// go mine
	if (currentstatus == MINER) {
		return gomine.call(this);
	} else if (currentstatus == SETTLER) {
		return gosettle.call(this);
	}

}