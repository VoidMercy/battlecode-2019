import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'

//church vars
var crusadercount = 0;
var pilgrimcount = 0;

export var Church = function() {
    if (crusadercount < 3 || pilgrimcount > 0) {
        var result = this.build(SPECS.CRUSADER);
        if (result != null) {
            crusadercount++;
            return result;
        } else {
            //failed to build unit
        }
        return this._bc_null_action();
    } else if (pilgrimcount == 0) {
        var result = this.build(SPECS.PILGRIM);
        if (result != null) {
            pilgrimcount++;
            return result;
        } else {
            return this._bc_null_action();
            //failed to build unit
        }
    }
}
