import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'

//church vars
var crusadercount = 0;
var pilgrimcount = 0;

export var Church = function() {
    if (crusadercount < 3 || pilgrimcount > 0) {
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
    }
    return this._bc_null_action();
}
