import {SPECS} from 'battlecode';
import {alldirs, range10} from 'constants.js'

//church vars
var crusadercount = 0;
var pilgrimcount = 0;

export var Church = function() {

    var prophetCount = 0;
    var robotsnear = this.getVisibleRobots();
    var robot = null;
    for (var i=0; i < robotsnear.length; i++) {
        robot = robotsnear[i];
        if (this.isVisible(robot) && robot.team == this.me.team && robot.unit == SPECS.PROPHET) {
            prophetCount++;
        }
    }
    this.log(prophetCount);
    if (prophetCount > 5 && this.fuel > 500) {
        this.log("signalling to go away ")
        this.signal(69, 100);

    }

    if (this.karbonite > 250 && this.fuel > 500) {
        // lmoa build a prophet
        this.log("BUILDING RANGER!!!")
        var result = this.build(SPECS.PROPHET);
        if (result != null) {
            var nextloc = null;
            var bestIndex = null;
            for (var i = 0; i < range10.length; i++) {
                nextloc = [this.me.x + range10[i][0], this.me.y + range10[i][1]];
                if (this.validCoords(nextloc) && this.map[nextloc[1]][nextloc[0]]) {
                    bestIndex = i;
                    break;
                }
            }
            if (bestIndex != null) {
                var signal = this.generateInitialPosSignalVal(range10[bestIndex]);
                this.log("sent: ");
                this.log(range10[bestIndex]);
                this.log(signal);
                this.signal(signal, 2); // todo maybe: check if required r^2 is 1
                return this.buildUnit(SPECS.PROPHET, result[0], result[1]);
            }
        }
    }


    /*if (crusadercount < 3 || pilgrimcount > 0) {
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
    }*/
    return this._bc_null_action();
}
