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

class MyRobot extends BCAbstractRobot {

    canBuild(unit) {
        return this.fuel >= SPECS.UNITS[unit].CONSTRUCTION_FUEL && this.fuel >= SPECS.UNITS[unit].CONSTRUCTION_KARBONITE
    }

    hash(x, y) {
        return x * 99999 + y;
    }

    unhash(shit) {
        return [Math.floor(shit / 99999), shit % 99999];
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

    moveto(dest) {

        if (targetlocation == null) {
            moves = null;
        } else if (this.hash(...dest) != this.hash(...targetlocation)) {
            moves = null;
        }

        targetlocation = dest;

        if (moves != null) {
            //continue moving in moves
            var nextmove = this.unhash(moves.pop());
            this.log("MOVING");
            this.log([this.me.x, this.me.y]);
            this.log(nextmove);

            this.move(nextmove - this.me.x, nextmove - this.me.y);

        } else {
            var moverange = SPECS.UNITS[this.me.unit].SPEED;
            targetlocation = dest;
            var tempmoves = [];
            var queue = [];
            var visited = [];
            var backtrace = {};
            queue.push([this.me.x, this.me.y]);
            visited.push(this.hash(this.me.x, this.me.y));
            while (queue.length != 0) {
                var cur = queue.shift();
                this.log(cur);
                if (this.hash(...cur) == this.hash(...dest)) {
                    //reached dest
                    backtrace[this.hash(...dest)] = this.hash(...cur);
                    var current = this.hash(...dest);
                    this.log("CANCER");
                    while (current in backtrace) {
                        this.log(current);
                        tempmoves.push(current);
                        current = backtrace[current];
                    }
                    moves = tempmoves;
                    this.log("PATHFIND");
                    this.log([this.me.x, this.me.y]);
                    this.log(dest);
                    this.log(moves);
                    return this.moveto(dest);
                }

                //iterate all possible moves and add to queue
                for (var i = cur[0] - Math.sqrt(moverange); i < cur[0] + Math.sqrt(moverange); i++) {
                    for (var j = cur[1] - Math.sqrt(moverange); j < cur[1] + Math.sqrt(moverange); j++) {
                        if (visited.includes(this.hash(i, j)) == false && this._bc_check_on_map(i, j) && this.map[j][i] == true && this.distance([i, j], cur) <= moverange) {
                            queue.push([i, j]);
                            visited.push(this.hash(i, j));
                            backtrace[this.hash(i, j)] = this.hash(cur[0], cur[1]);
                        }
                    }
                }
            }
        }
    }

    turn() {


        if (this.me.unit == SPECS.CASTLE) {
            if (this.canBuild(SPECS.PILGRIM) && pilgrimcount < 1) {
                //can produce pilgrim
                var robotsnear = this.getVisibleRobotMap();
                for (var i = 0; i < alldirs.length; i++) {
                    if (robotsnear[this.me.y + alldirs[i][1]][this.me.x + alldirs[i][0]] == 0) {
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
                            churchloc = [alldirs[i][0] + this.me.x, alldirs[i][1] + this.me.y];
                            this.log(churchloc);
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

    }
}

var robot = new MyRobot();