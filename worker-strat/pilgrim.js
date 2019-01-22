import {SPECS} from 'battlecode';
import {getLocs} from 'churchloc.js'
import {Decompress12Bits} from 'communication.js'
import {alldirs, range10} from 'constants.js'

var churches = null;
var plannedchurches = [];
var castleloc = null;
var karblocation = null;
var karbfuel = null;
var KARB = 0;
var FUEL = 1;
var NOT_CONTESTED = 0;
var CONTESTED = 1;
var TRY_TO_STEAL = 2;

function get_spawn_loc(tempmap) {
	// find location of church/castle and obtain which karb/fuel to go to
    for (var i = 0; i < alldirs.length; i++) {
        var nextLoc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
        if (this.validCoords(nextLoc)) {
            var robot = this.getRobot(tempmap[nextLoc[1]][nextLoc[0]]);
            if (tempmap[nextLoc[1]][nextLoc[0]] > 0 &&
            (robot.unit == SPECS.CASTLE || robot.unit == SPECS.CHURCH)) {
                if (robot.signal != -1) {
                	// parse for karb location
                	karblocation = Decompress12Bits(robot.signal);
                	this.log("Received Location: " + karblocation)
                	if (this.fuel_map[karblocation[1]][karblocation[0]]) {
                		karbfuel = FUEL;
                	} else {
                		karbfuel = KARB;
                	}
                } else {
                    this.log("NO SIGNAL?? wtf?");
                }
                castleloc = nextLoc;
                break;
            }
        }
    }

    this.log("Castle Location: " + castleloc);

}

function update_strongholds() {
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
	var myloc = [0, 0];

	var temp_karb_map = this.karbonite_map.slice();
	var temp_fuel_map = this.fuel_map.slice();

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

export var Pilgrim = function() {

	var tempmap = this.getVisibleRobotMap();

	if (this.me.turn == 1) {

		get_spawn_loc.call(this, tempmap);

		update_strongholds.call(this);

	}

	// not turn 1 stuff

	// go mine
	var check = false;
    if (karbfuel == KARB) {
        check = this.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY;
    } else {
        check = this.me.fuel < SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY;
    }

	if (check && this.me.x == karblocation[0] && this.me.y == karblocation[1]) {
		return this.mine();
	} else if (!check) {
		if (this.distance(castleloc, karblocation) > 10) {
			// try to build church, otherwise wait here
			this.log("Need to build church tbh");
			return null;
		} else {
			if (this.distance([this.me.x, this.me.y], castleloc) <= 2) {
				return this.give(castleloc[0] - this.me.x, castleloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
			} else {
				return this.moveto(castleloc, true);
			}
		}
		
	} else {
		return this.moveto(karblocation, true);
	}
}