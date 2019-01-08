import {BCAbstractRobot, SPECS} from 'battlecode';

//all variables
var alldirs = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]

//castle variables
var pilgrimcount = 0;

//pilgrim variables
var karblocation = null;
var builtchurch = false;
var churchloc = null;

class MyRobot extends BCAbstractRobot {

    checkEmpty(xloc, yloc) {
        var robotsnear = this.getVisibleRobotMap();
    }

    canBuild(unit) {
        return this.fuel >= SPECS.UNITS[unit].CONSTRUCTION_FUEL && this.fuel >= SPECS.UNITS[unit].CONSTRUCTION_KARBONITE
    }

    turn() {

        if (this.me.unit == SPECS.CASTLE) {
            if (this.canBuild(SPECS.PILGRIM) && pilgrimcount < 1) {
                //can produce pilgrim
                var robotsnear = this.getVisibleRobotMap();
                for (var i = 0; i < alldirs.length; i++) {
                    if (robotsnear[this.me.x + alldirs[i][0]][this.me.y + alldirs[i][0]] == -1) {
                        this.log("Created pilgrim");
                        pilgrimcount++;
                        return this.buildUnit(SPECS.PILGRIM, alldirs[i][0], alldirs[i][0]);
                    }
                }
            }
        } else if (this.me.unit == SPECS.PILGRIM) {
            if (karblocation == null) {
                //find closest karbonite
                var map = this.karbonite_map;
                var queue = [];
                queue.push([this.x, this.y]);
                while (queue.length != 0) {
                    var cur = queue.shift();
                    if (map[cur[0]][cur[1]] == true) {
                        karblocation = cur;
                        break;
                    }
                    for (var i = 0; i < alldirs.length; i++) {
                        queue.push([cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]]);
                    }
                }
            }

            if (this.me.x != karblocation[0] || this.me.y != karblocation[1]) {
            //move to karbonite
                var dirvec = [karblocation[0] - this.me.x, karblocation[1] - this.me.y];
                var mag = Math.sqrt(dirvec[0] * dirvec[0] + dirvec[1] * dirvec[1]);
                dirvec[0] = Math.trunc(dirvec[0] / mag * SPECS.UNITS[SPECS.PILGRIM].SPEED);
                dirvec[1] = Math.trunc(dirvec[1] / mag * SPECS.UNITS[SPECS.PILGRIM].SPEED);
                this.log("Fucking move direction");
                this.log(dirvec[0].toString());
                this.log(dirvec[1].toString());

                return this.move(dirvec[0] - this.me.x, dirvec[1] - this.me.y);
            } else {
                if (builtchurch == false && this.canBuild(SPECS.CHURCH)) {
                    //build factory
                    var robotsnear = this.getVisibleRobotMap();

                    for (var i = 0; i < alldirs.length; i++) {
                        if (robotsnear[this.me.x + alldirs[i][0]][this.me.y + alldirs[i][0]] == -1) {
                            builtchurch = true;
                            log("BUILD FUCKING CHURCH");
                            churchloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][0]];
                            return this.buildUnit(SPECS.CHURCH, alldirs[i][0], alldirs[i][0]);
                        }
                    }
                } else {
                    //mine shit
                    if (this.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
                        log("FUCKING MINE");
                        return this.mine();
                    } else {
                        log("GIVE CHURCH KARB SHIT");
                        return this.give(churchloc[0] - this.me.x, churchloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
                    }
                }
            }

            
        }

    }
}

var robot = new MyRobot();