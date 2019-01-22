import {SPECS} from 'battlecode';
import {getLocs} from 'churchloc.js'
import {range10, range15, alldirs} from 'constants.js'
import {Compress12Bits} from 'communication.js'

var churches = null;
var plannedchurches = [];
var stronghold_info = [];
var is_stronghold = false;
var stronghold_karb = [];
var working_workers = [];
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
				if (!spaces_covered.includes(this.hash(nextloc))) {
					not_covered = true;
					break;
				}
			}
		}
		if (!not_covered) {
			// good, replace church
			is_stronghold = true;

			this.log("REPLACE CHURCH");
			this.log(spaces_covered);
			this.log(stronghold_karb);
			plannedchurches.splice(i, 1);
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

	var temp_karb_map = Array.from(this.karbonite_map);
	var temp_fuel_map = Array.from(this.fuel_map);

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
		return this.buildUnit(SPECS.PILGRIM, ...alldirs[i]);
	}
	return null;
}

function find_target_stronghold() {
	// find next closest church location
	var mindist = 99999;
	var bestindex = null;
	var tempdist = null;
	for (var i = 0; i < plannedchurches.length; i++) {
		tempdist = this.distance([this.me.x, this.me.y], plannedchurches[i][1]);
		if (!plannedchurches[i][3] && tempdist < mindist) {
			mindist = tempdist;
			bestindex = i;
		}
	}
	if (bestindex == null) {
		return null;
	}
	return plannedchurches[bestindex];
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
				mindst = tempdist;
				closestloc = stronghold_karb[i];
			}
		}
	}
	if (closestloc == null) {
		this.log("All Workers Working");
		this.log(stronghold_karb);
		return null;
	}
	var res = build_pilgrim_toward.call(this, closestloc);
	if (res != null) {
		this.signal(Compress12Bits(...closestloc));
		this.log("Building Pilgrim Towards: " + closestloc);
		working_workers.push(this.hash(...closestloc));
		return res;
	}
	return null;
}

export var Castle = function() {

	if (this.me.turn == 1) {

		find_church_locs.call(this);
		
		update_strongholds.call(this, [this.me.x, this.me.y]);
		
	}

	// build pilgrims
	if (this.canBuild(SPECS.PILGRIM)) {
		if (is_stronghold) {
			var res = handle_my_stronghold.call(this);
			if (res != null) {
				return res;
			}
		}

		var next_stronghold = find_target_stronghold.call(this);

		this.log("Next Stronghold: " + next_stronghold);

		// var res = build_pilgrim_toward.call(this, target_karb);
		// if (res != null) {
			// return res;
		// }
	}

	//do nothing
	return null;
}