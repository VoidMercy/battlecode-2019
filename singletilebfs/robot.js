import {BCAbstractRobot, SPECS} from 'battlecode';
import { Crusader } from 'crusader.js'
import { Castle } from 'castle.js'
import { Church } from 'church.js'
import { Pilgrim } from 'pilgrim.js'
import { Prophet } from 'prophet.js'
import { Preacher } from 'preacher.js'

import {alldirs, crusaderdirs, otherdirs} from 'constants.js'

var symmetry; //1 is vertical, 0 is horizontal

//pathfinding vars
var targetlocation = null;
var moves = null;
var dict = {};

class MyRobot extends BCAbstractRobot {

    build(unittype) {
        if (this.canBuild(unittype)) {
            var robotsnear = this.getVisibleRobotMap();
            for (var i = 0; i < alldirs.length; i++) {
                var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                if (robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                    //this.log("Create unit!");
                    return this.buildUnit(unittype, alldirs[i][0], alldirs[i][1]);
                }
            }
        }
        return null;
    }

    greedyMove(dest) {
        //TODO: make it possible to move multiple tiles at once xd
        //note: this moves backwards if it cant move closer lol
        var dirs = ((this.me.unit == SPECS.CRUSADER) ? crusaderdirs : otherdirs);
        var minVal = 999999999;
        var minDir = null;
        for (var i = 0; i < dirs.length; i++) {
            var newloc = [this.me.x + dirs[i][0], this.me.y + dirs[i][1]];
            var dist = this.distance(newloc, dest);
            var visMap = this.getVisibleRobotMap();
            if (this.validCoords(newloc) && visMap[newloc[1]][newloc[0]] == 0 && this.map[newloc[1]][newloc[0]] && dist < minVal) {
                minVal = dist;
                minDir = dirs[i];
            }
        }
        return this.move(minDir[0], minDir[1]);
    }

    greedyMoveAway(dest) {
        var dirs = ((this.me.unit == SPECS.CRUSADER) ? crusaderdirs : otherdirs);
        var maxVal = -1;
        var maxDir = null;
        for (var i = 0; i < dirs.length; i++) {
            const newloc = [this.me.x + dirs[i][0], this.me.y + dirs[i][1]];
            const dist = this.distance(newloc, dest);
            const visMap = this.getVisibleRobotMap();
            if (this.validCoords(newloc) && visMap[newloc[1]][newloc[0]] == 0 && this.map[newloc[1]][newloc[0]] && dist > maxVal) {
                maxVal = dist;
                maxDir = dirs[i];
            }
        }
        return this.move(maxDir[0], maxDir[1]);
    }

    oppositeCoords(loc) {
        //TODO: only switch one of the coords based on determined symmetry
        var size = this.map.length;
        var ret = [loc[0], loc[1]];
        ret[1 - symmetry] = (size - ret[1 - symmetry]) % size;
        return ret;
    }

    arraysEqual(arr1, arr2) {
        if(arr1.length !== arr2.length)
            return false;
        for(var i = arr1.length; i--;) {
            if(arr1[i] !== arr2[i])
                return false;
        }

        return true;
    }

    symmetricType() {
        // determine if map is horizontally or vertically symmetric
        const ysize = this.map.length;
        for (var i=0; i < ysize/2; i++) {
            if (!this.arraysEqual(this.map[i], this.map[ysize-i-1])) {
                // row is not equal to corresponding row, must be vertically(?) symmetric
                return 1;
            }
        }
        return 0;

    }

    validCoords(loc) {
        var xsize = this.map[0].length; //should be square but justin case
        var ysize = this.map.length;
        return loc[0] >= 0 && loc[0] < xsize && loc[1] >= 0 && loc[1] < ysize;
    }

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
        if (dest[0] == this.me.x && dest[1] == this.me.y) {
            return; //at target, do nothing
        }
        if (!(this.hash(...dest) in dict)) {
            //this.log("START BFS");
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
                    if (this._bc_check_on_map(...nextloc) && this.map[nextloc[1]][nextloc[0]]) {
                        if (distancetodest[nextloc[0]][nextloc[1]] == undefined) {
                            queue.push(nextloc);
                            distancetodest[nextloc[0]][nextloc[1]] = distancetodest[cur[0]][cur[1]] + 1;
                        }
                    }
                }
            }

            dict[this.hash(...dest)] = distancetodest;
            //this.log("BFS DONE");
            return this.moveto(dest);
        } else {

            var moveradius = SPECS.UNITS[this.me.unit].SPEED;
            var distancetodest = dict[this.hash(...dest)];
            var smallest = distancetodest[this.me.x][this.me.y];
            var smallestcoord = [this.me.x, this.me.y];
            var visible = this.getVisibleRobotMap();

            for (var i = this.me.x - Math.sqrt(moveradius); i < this.me.x + Math.sqrt(moveradius); i++) {
                for (var j = this.me.y - Math.sqrt(moveradius); j < this.me.y + Math.sqrt(moveradius); j++) {
                    if (this.validCoords([i, j]) && distancetodest[i][j] != undefined && visible[j][i] == 0 && this.distance([this.me.x, this.me.y], [i, j]) <= moveradius) {
                        if (distancetodest[i][j] < smallest) {
                            smallest = distancetodest[i][j];
                            smallestcoord = [i, j];
                        } else if (distancetodest[i][j] == smallest && this.distance([i, j], dest) < this.distance(smallestcoord, dest)) {
                            smallest = distancetodest[i][j];
                            smallestcoord = [i, j];
                        }
                    }
                }
            }
            

            //this.log("MOVING");
            //this.log([this.me.x, this.me.y]);
            //this.log(smallestcoord);
            return this.move(smallestcoord[0] - this.me.x, smallestcoord[1] - this.me.y);
        }
    }

    turn() {
        if (this.me.turn == 1) {
            // first turn, calc symmetry
            symmetry = this.symmetricType();
        }
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
