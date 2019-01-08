import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'

//church vars
var crusadercount = 0;

export var Church = function() {
    if (this.canBuild(SPECS.CRUSADER)) {
        //can produce crusader
        var robotsnear = this.getVisibleRobotMap();
        for (var i = 0; i < alldirs.length; i++) {
            var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
            if (robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                this.log("Created crusader!");
                crusadercount++;
                return this.buildUnit(SPECS.CRUSADER, alldirs[i][0], alldirs[i][1]);
            }
        }
    }
}
