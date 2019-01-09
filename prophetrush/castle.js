import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'


export var Castle = function() {
    if (this.canBuild(SPECS.PROPHET)) {
        //can produce pilgrim
        var robotsnear = this.getVisibleRobotMap();
        for (var i = 0; i < alldirs.length; i++) {
            var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
            if (this.validCoords(nextloc) && robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                this.log("Created prophet");
                return this.buildUnit(SPECS.PROPHET, alldirs[i][0], alldirs[i][1]);
            }
        }
    }
}
