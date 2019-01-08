import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'

//church vars
var prophetcount = 0;
var pilgrimcount = 0;

export var Church = function() {
    if (prophetcount < 3 || pilgrimcount > 0) {
        var result = this.build(SPECS.PROPHET);
        if (result != null) {
            prophetcount++;
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
