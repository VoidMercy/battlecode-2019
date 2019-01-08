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

//pathfinding vars
var targetlocation = null;
var moves = null;
var dict = {};

class MyRobot extends BCAbstractRobot {

    canBuild(unit) {
        return this.fuel > SPECS.UNITS[unit].CONSTRUCTION_FUEL && this.karbonite > SPECS.UNITS[unit].CONSTRUCTION_KARBONITE;
    }

    hash(x, y) {
        return x * 9999 + y;
    }

    unhash(shit) {
        return [Math.floor(shit / 9999), shit % 9999];
    }

    adjacent(loc1, loc2) {
        if (Math.abs(loc1[0] - loc2[0]) + Math.abs(loc1[1] - loc2[1]) > 2) {
            return false;
        }
        return true;
    }

    distance(loc1, loc2) {
        return (loc1[0] - loc2[0]) * (loc1[0] - loc2[0]) + (loc1[1] - loc2[1]) * (loc1[1] - loc2[1]);
    }

    createarr(width, height) {
        var x = new Array(width);

        for (var i = 0; i < x.length; i++) {
          x[i] = new Array(height);
        }

        return x;
    }

    moveto(dest) {
        if (!(this.hash(...dest) in dict)) {
            //run bfs
            var queue = [];
            var visited = [];
            queue.push(dest);
            var y = this.map.length;
            var x = this.map[0].length;
            var starthash = this.hash(this.me.x, this.me.y);
            var distancetodest = this.createarr(x, y);
            distancetodest[dest[0]][dest[1]] = 0;
            while (queue.length != 0) {
                var cur = queue.shift();
                for (var i = 0; i < alldirs.length; i++) {
                    var nextloc = [cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]];
                    if (this._bc_check_on_map(...nextloc) && this.map[nextloc[1]][nextloc[0]] == true) {
                        if (distancetodest[nextloc[0]][nextloc[1]] == undefined) {
                            queue.push(nextloc);
                            distancetodest[nextloc[0]][nextloc[1]] = distancetodest[cur[0]][cur[1]] + this.distance([0, 0], alldirs[i]);
                        }
                    }
                }
            }

            dict[this.hash(...dest)] = distancetodest;
            return this._bc_null_action();
        } else {
            var moveoff = [0, 0];
            var smallest = 99999999999;
            var smallestdir = null;
            var distancetodest = dict[this.hash(...dest)];
            var moveradius = SPECS.UNITS[this.me.unit].SPEED;
            var visible = this.getVisibleRobotMap();

            while (1 == 1) {
                smallest = 99999999999;
                smallestdir = null;
                for (var i = 0; i < alldirs.length; i++) {
                    var nextloc = [this.me.x + moveoff[0] + alldirs[i][0], this.me.y + moveoff[1] + alldirs[i][1]];
                    if (distancetodest[nextloc[0]][nextloc[1]] != undefined) {
                        var tempdist = distancetodest[nextloc[0]][nextloc[1]];
                        if (tempdist < smallest && visible[nextloc[1]][nextloc[0]] <= 0) {
                            smallest = tempdist;
                            smallestdir = alldirs[i];
                        }
                    }
                }
                if (this.distance([moveoff[0] + smallestdir[0], moveoff[1] + smallestdir[1]], [0, 0]) <= moveradius) {
                    moveoff[0] += smallestdir[0];
                    moveoff[1] += smallestdir[1];
                    if (smallest == 0) {
                        break;
                    }
                } else {
                    break;
                }
            }

            this.log("MOVING");
            this.log([this.me.x, this.me.y]);
            this.log(moveoff);
            return this.move(moveoff[0], moveoff[1]);
        }
    }

    turn() {

        if (this.me.unit == SPECS.CASTLE) {
            return this.runCastle();
        } else if (this.me.unit == SPECS.PILGRIM) {
            return this.runPilgrim();
        }

    }

    runPilgrim() {
        if (castleloc == null) {
            //find the castle i was spawned from
            var tempmap = this.getVisibleRobotMap();
            for (var i = 0; i < alldirs.length; i++) {
                var tempid = tempmap[this.me.y + alldirs[i][1]][this.me.x + alldirs[i][0]];
                if (tempid > 0) {
                    var robottype = this.getRobot(tempid).unit;
                    if (robottype == SPECS.CASTLE) {
                        this.log("FOUND CASTLE");
                        castleloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
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
                    return this._bc_null_action();
                    break;
                }
                for (var i = 0; i < alldirs.length; i++) {
                    var nextloc = [cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]];
                    if (this._bc_check_on_map(...nextloc) && visited.includes(this.hash(...nextloc)) == false) {
                        queue.push([cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]]);
                        visited.push(this.hash(cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]));
                    }
                }
            }
        }

        if (builtchurch == false) {
            // i didn't build a church yet
            if (this.canBuild(SPECS.CHURCH)) {
                //i have enough resources to build a church

                if (this.me.x != karblocation[0] || this.me.y != karblocation[1]) {
                    //move to karbonite location
                    return this.moveto(karblocation);
                } else {
                    this.log("TRY BUILDING CHURCH");
                    //build church
                    var robotsnear = this.getVisibleRobotMap();

                    for (var i = 0; i < alldirs.length; i++) {
                        var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                        if (robotsnear[nextloc[1]][nextloc[0]] <= 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                            builtchurch = true;
                            this.log("BUILD FUCKING CHURCH");
                            churchloc = [alldirs[i][0] + this.me.x, alldirs[i][1] + this.me.y];
                            this.log(churchloc);
                            return this.buildUnit(SPECS.CHURCH, alldirs[i][0], alldirs[i][1]);
                        }
                    }
                }
                
            } else {
                //fucking mine then move back to the castle so i get enough resources to build the shit...

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
                    //i gots the drugs, now move to castle and give drugs
                    if (this.adjacent([this.me.x, this.me.y], castleloc)) {
                        this.log("GIVING TO CASTLE");
                        return this.give(castleloc[0] - this.me.x, castleloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
                    } else {
                        this.log("MOVING BACK TO CASTLE TO GIVE DRUGS");
                        return this.moveto(castleloc);
                    }
                }
            }
        } else {
            if (this.adjacent([this.me.x, this.me.y], karblocation)) {
                //mine shit
                if (this.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
                    this.log("FUCKING MINE");
                    return this.mine();
                } else {
                    this.log("GIVE CHURCH KARB SHIT");
                    this.log(churchloc);
                    this.log(this.me.x);
                    this.log(this.me.y);
                    return this.give(churchloc[0] - this.me.x, churchloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
                }
            } else {
                return this.moveto(karblocation);
            }
            
        }
    }

    runCastle() {
        if (this.canBuild(SPECS.PILGRIM) && pilgrimcount < 1) {
            //can produce pilgrim
            var robotsnear = this.getVisibleRobotMap();
            for (var i = 0; i < alldirs.length; i++) {
                var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                if (robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                    this.log("Created pilgrim");
                    pilgrimcount++;
                    return this.buildUnit(SPECS.PILGRIM, alldirs[i][0], alldirs[i][1]);
                }
            }
        }
    }
}

var robot = new MyRobot();