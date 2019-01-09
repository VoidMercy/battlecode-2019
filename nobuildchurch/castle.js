import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'

//castle variables
var pilgrimcount = 0;
var underattack = false;

export var Castle = function() {

    var robotsnear = this.getVisibleRobots();
    var robot = null;
    var numenemy = [0, 0, 0, 0, 0, 0]; // crusaders, prophets, preachers
    var friendlies = [0, 0, 0, 0, 0, 0];
    var defense_units = [0, 0, 0, 0, 0, 0];
    var defense_robots = [];
    for (var i = 0; i < robotsnear.length; i++) {
        robot = robotsnear[i];
        if (robot.team != this.me.team) {
            numenemy[robot.unit]++;
        } else {
            friendlies[robot.unit]++;
            if (this.distance([this.me.x, this.me.y], [robot.x, robot.y]) < 10) {
                defense_units[robot.unit]++;
                defense_robots.push(robot.unit);
            }
        }
    }
    
    if (this.canBuild(SPECS.PILGRIM) && friendlies[SPECS.PILGRIM] == 0) {
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
    
    if (numenemy[SPECS.CRUSADER] + numenemy[SPECS.PROPHET] + numenemy[SPECS.PREACHER] == 0 && underattack) {
        underattack = false;
    } else {
        /*
        if (numenemy[0] > numenemy[1] && numenemy[0] > numenemy[2] && numenemy[0] / 5 > friendlies[2]) {
            //produce preacher to counter crusader
            var result = this.build(SPECS.PREACHER);
            if (result != null) {
                return result;
            }
        } else if (numenemy[1] > friendlies[1]) {
            //produce prophet to counter prophet
            var result = this.build(SPECS.PROPHET);
            if (result != null) {
                return result;
            }
        }*/
        if (numenemy[SPECS.CRUSADER] + numenemy[SPECS.PROPHET] + numenemy[SPECS.PREACHER] > defense_units[SPECS.PROPHET]) {
            //produce prophet to counter attack
            var result = this.build(SPECS.PROPHET);
            if (result != null) {
                return result;
            }
        }
        underattack = true;
    }
}
