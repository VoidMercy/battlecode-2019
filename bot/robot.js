import {BCAbstractRobot, SPECS} from 'battlecode';

//all variables
var alldirs = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]

//castle variables
var pilgrimcount = 0;

//pilgrim variables
var karblocation = null;
var builtchurch = false;
var churchloc = null;
var castleloc = null;

class MyRobot extends BCAbstractRobot {

    checkEmpty(xloc, yloc) {
        var robotsnear = this.getVisibleRobotMap();
    }

    canBuild(unit) {
        return this.fuel >= SPECS.UNITS[unit].CONSTRUCTION_FUEL && this.fuel >= SPECS.UNITS[unit].CONSTRUCTION_KARBONITE
    }

    hash(x, y) {
        return x * 99999 + y;
    }

    adjacent(loc1, loc2) {
        if (Math.abs(loc1[0] - loc2[0]) + Math.abs(loc1[1] - loc2[1]) > 2) {
            return false;
        }
        return true;
    }

    moveto(dest) {
        var dirvec = [dest[0] - this.me.x, dest[1] - this.me.y];
        var mag = Math.sqrt(dirvec[0] * dirvec[0] + dirvec[1] * dirvec[1]);
        dirvec[0] = Math.trunc(dirvec[0] / mag * Math.sqrt(SPECS.UNITS[this.me.unit].SPEED));
        dirvec[1] = Math.trunc(dirvec[1] / mag * Math.sqrt(SPECS.UNITS[this.me.unit].SPEED));
        this.log("Fucking move");
        this.log(this.me.x);
        this.log(this.me.y);
        this.log(dest);

        return this.move(dirvec[0], dirvec[1]);
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
                        return this.buildUnit(SPECS.PILGRIM, alldirs[i][0], alldirs[i][1]);
                    }
                }
            }
        } else if (this.me.unit == SPECS.PILGRIM) {

            if (castleloc == null) {
                var tempmap = this.getVisibleRobotMap();
                for (var i = 0; i < alldirs.length; i++) {
                    var tempid = tempmap[this.me.y + alldirs[i][1]][this.me.x + alldirs[i][0]];
                    if (tempid > 0) {
                        var robottype = this.getRobot(tempid);
                        if (robottype == SPECS.CASTLE) {
                            castleloc = [this.me.x + alldirs[i][0]][this.me.y + alldirs[i][1]];
                            break;
                        }
                    }
                }
            }

            if (karblocation == null) {
                //find closest karbonite
                var queue = [];
                var visited = [];
                queue.push([this.me.x, this.me.y]);
                visited.push(this.hash(this.me.x, this.me.y));
                while (queue.length != 0) {
                    var cur = queue.shift();
                    if (this.karbonite_map[cur[1]][cur[0]] == true) {
                        karblocation = cur;
                        this.log("FOUND KARBONITE");
                        this.log(cur);
                        break;
                    }
                    for (var i = 0; i < alldirs.length; i++) {
                        if (visited.includes(this.hash(cur[0] + alldirs[i][0], cur[1] + alldirs[i][1])) == false) {
                            queue.push([cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]]);
                            visited.push(this.hash(cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]));
                        }
                    }
                }
            }

            if (builtchurch == false) {
                if (this.canBuild(SPECS.CHURCH)) {
                    if (this.me.x != karblocation[0] || this.me.y != karblocation[1]) {
                        //move to karbonite
                        return this.moveto(karblocation);
                    }
                    //build church
                    var robotsnear = this.getVisibleRobotMap();

                    for (var i = 0; i < alldirs.length; i++) {
                        if (robotsnear[this.me.y + alldirs[i][1]][this.me.x + alldirs[i][0]] != -1) {
                            builtchurch = true;
                            this.log("BUILD FUCKING CHURCH");
                            churchloc = [alldirs[i][0], alldirs[i][1]];
                            return this.buildUnit(SPECS.CHURCH, alldirs[i][0], alldirs[i][1]);
                        }
                    }
                } else {
                    //fucking mine then move back to the castle ...

                    if (this.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
                        //i didn't finish mining yet
                        if (this.me.x != karblocation[0] || this.me.y != karblocation[1]) {
                            //move to karbonite
                            this.log("HEADING TOWARDS KARBONITE TO MINE FOR CASTLE");
                            return this.moveto(karblocation);
                        } else {
                            this.log("MINING FOR CASTLE");
                            return this.mine();
                        }
                    } else {
                        //i gots the drugs, not move to castle and give drugs
                        if (adjacent([this.me.x, this.me.y], castleloc)) {
                            this.log("GIVING TO CASTLE");
                            return this.give(castleloc[0] - this.me.x, castleloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
                        } else {
                            this.log("MOVING BACK TO CASTLE TO GIVE DRUGS");
                            return this.moveto(castleloc);
                        }
                    }
                }
            } else {
                if (adjacent([this.me.x, this.me.y], karblocation)) {
                    //mine shit
                    if (this.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
                        this.log("FUCKING MINE");
                        return this.mine();
                    } else {
                        this.log("GIVE CHURCH KARB SHIT");
                        return this.give(churchloc[0] - this.me.x, churchloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
                    }
                } else {
                    return this.moveto(karblocation);
                }
                
            }
        }

    }
}

var robot = new MyRobot();