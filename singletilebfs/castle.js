import {SPECS} from 'battlecode';

//all variables
var alldirs = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]

//castle variables
var pilgrimcount = 0;

export var Castle = function() {
    if (this.canBuild(SPECS.PILGRIM) && pilgrimcount < 1) {
        //can produce pilgrim
        var robotsnear = this.getVisibleRobotMap();
        for (var i = 0; i < alldirs.length; i++) {
            var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
            if (this.validCoords(nextloc) && robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                this.log("Created pilgrim");
                pilgrimcount++;
                return this.buildUnit(SPECS.PILGRIM, alldirs[i][0], alldirs[i][1]);
            }
        }
    }
}
