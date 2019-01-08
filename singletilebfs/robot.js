import {BCAbstractRobot, SPECS} from 'battlecode';
import { Crusader } from 'crusader.js'
import { Castle } from 'castle.js'
import { Church } from 'church.js'
import { Pilgrim } from 'pilgrim.js'
import { Prophet } from 'prophet.js'
import { Preacher } from 'preacher.js'

//moved global vars to their respective file
var alldirs = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]

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

        if (this.me.unit === SPECS.CRUSADER) {
            return Crusader.call(this);
        }
        else if (this.me.unit === SPECS.CASTLE) {
            return Castle.call(this);
        }
        else if (this.me.unit === SPECS.CHURCH) {
            return Church.call(this);
        }
        else if (this.me.unit === SPECS.PILGRIM) {
            return Pilgrim.call(this);
        }
        else if (this.me.unit === SPECS.PROPHET) {
            return Prophet.call(this);
        }
        else if (this.me.unit === SPECS.PREACHER) {
            return Preacher.call(this);
        }

    }

}

var robot = new MyRobot();