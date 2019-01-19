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

    prophetSpread(enemyPreachers) {
        //used to defend against preachers
        var robotMap = this.getVisibleRobotMap();
        var adjacents = [];
        if (enemyPreachers.length > 0) {
            var check = false;
            for (var i = 0; i < enemyPreachers.length; i++) {
                check = check || this.distance([this.me.x, this.me.y], [enemyPreachers[i].x, enemyPreachers[i].y]) < 29;
                //29 means out of any possible AOE
            }
            if (!check) { return null; }
            var check2 = false;
            for (var i = 0; check && i < alldirs.length; i++) {
                var loc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                if (this.validCoords(loc) && this.map[loc[1]][loc[0]] && robotMap[loc[1]][loc[0]] > 0) {
                    var robot = this.getRobot(robotMap[loc[1]][loc[0]]);
                    if (robot.team == this.me.team) {
                        for (var j = 0; j < enemyPreachers.length; j++) {
                            check2 = check2 || this.distance([robot.x, robot.y], [enemyPreachers[j].x, enemyPreachers[j].y]) <= 16;
                            //if adjacent to someone in attack radius
                            adjacents.push(alldirs[i]);
                        }
                    }
                }
            }
            if (!check2) { return null; }
            for (var i = 0; i < otherdirs.length; i++) {
                var loc = [this.me.x + otherdirs[i][0], this.me.y + otherdirs[i][1]];
                if (this.validCoords(loc) && this.map[loc[1]][loc[0]] && robotMap[loc[1]][loc[0]] == 0) {
                    var isSafe = true;
                    for (var j = 0; j < enemyPreachers.length; j++) {
                        isSafe = isSafe && this.distance(loc, [enemyPreachers[j].x, enemyPreachers[j].y]) > 16;
                        //unsafe if its <= 16, as we're walking into their attach range
                    }
                    for (var j = 0; isSafe && j < alldirs.length; j++) {
                        var adjloc = [loc[0] + alldirs[j][0], loc[1] + alldirs[j][1]];
                        if (this.validCoords(adjloc) && this.map[adjloc[1]][adjloc[0]] && robotMap[adjloc[1]][adjloc[0]] > 0) {
                            var robot = this.getRobot(robotMap[adjloc[1]][adjloc[0]]);
                            if (robot.team == this.me.team) {
                                for (var k = 0; k < enemyPreachers.length; k++) {
                                    isSafe = isSafe && this.distance(adjloc, [enemyPreachers[k].x, enemyPreachers[k].y]) > 16;
                                    //unsafe if adjacent if next to unit in range
                                }
                            }
                        }
                    }
                    if (isSafe) {
                        //wow! good location!
                        return otherdirs[i];
                    }
                }
            }
        }
        return null;
    }

    nopreachermoveto(dest) {
        if (dest[0] == this.me.x && dest[1] == this.me.y) {
            return null; //at target, do nothing
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
            return this.nopreachermoveto(dest);
        } else {

            var moveradius = SPECS.UNITS[this.me.unit].SPEED;
            var distancetodest = dict[this.hash(...dest)];
            var smallest = distancetodest[this.me.x][this.me.y];
            var smallestcoord = [this.me.x, this.me.y];
            var visible = this.getVisibleRobotMap();
            var robotsnear = this.getVisibleRobots();

            for (var i = this.me.x - Math.sqrt(moveradius); i < this.me.x + Math.sqrt(moveradius); i++) {
                for (var j = this.me.y - Math.sqrt(moveradius); j < this.me.y + Math.sqrt(moveradius); j++) {
                    if (this.validCoords([i, j]) && distancetodest[i][j] != undefined && visible[j][i] == 0 && this.distance([this.me.x, this.me.y], [i, j]) <= moveradius) {
                        var good = true;
                        
                        for (var a = 0; a < robotsnear.length; a++) {
                            if (robotsnear[a].team == this.me.team && robotsnear[a].id != this.me.id && robotsnear[a].unit == SPECS.PREACHER && this.distance([i, j], [robotsnear[a].x, robotsnear[a].y]) <= 2) {
                                good = false;
                                break;
                            }
                        }
                        if (good) {
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
            }

            //this.log("MOVING");
            //this.log([this.me.x, this.me.y]);
            //this.log(smallestcoord);
            if (smallestcoord[0] - this.me.x == 0 && 0 == smallestcoord[1] - this.me.y) {
                return this.greedyMoveLoc(dest);
            }
            if (this.fuel >= this.distance([this.me.x, this.me.y], smallestcoord) * SPECS.UNITS[this.me.unit].FUEL_PER_MOVE) {
                return [smallestcoord[0] - this.me.x, smallestcoord[1] - this.me.y];
            } else {
                return null;
            }
        }
    }

    workermoveto(dest) {
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
            var robotsnear = this.getVisibleRobots();

            for (var i = this.me.x - Math.sqrt(moveradius); i < this.me.x + Math.sqrt(moveradius); i++) {
                for (var j = this.me.y - Math.sqrt(moveradius); j < this.me.y + Math.sqrt(moveradius); j++) {
                    if (this.validCoords([i, j]) && distancetodest[i][j] != undefined && visible[j][i] == 0 && this.distance([this.me.x, this.me.y], [i, j]) <= moveradius) {
                        var good = true;
                        for (var a = 0; a < robotsnear.length; a++) {
                            if (this.isVisible(robotsnear[a]) && robotsnear[a].team != this.me.team && robotsnear[a].unit >= 3 && SPECS.UNITS[robotsnear[a].unit].ATTACK_RADIUS != null && SPECS.UNITS[robotsnear[a].unit].ATTACK_RADIUS != 0 && this.distance([i, j], [robotsnear[a].x, robotsnear[a].y]) <= SPECS.UNITS[robotsnear[a].unit].ATTACK_RADIUS[1]) {
                                good = false;
                                break;
                            }
                        }
                        if (good) {
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
            }

            //this.log("MOVING");
            //this.log([this.me.x, this.me.y]);
            //this.log(smallestcoord);
            if (smallestcoord[0] - this.me.x == 0 && 0 == smallestcoord[1] - this.me.y) {
                return this._bc_null_action();
            }
            if (this.fuel >= this.distance([this.me.x, this.me.y], smallestcoord) * SPECS.UNITS[this.me.unit].FUEL_PER_MOVE) {
                return this.move(smallestcoord[0] - this.me.x, smallestcoord[1] - this.me.y);
            } else {
                return null;
            }
        }
    }

    generateInitialPosSignalVal(relDest) {
        //protocol specs
        //lsb 3 bits are used for what type of signal
        //rn "7" denotes starting pos
        //for starting pos, msb 6 bits will be dx, next msb 6 bits with be dy relative to position of church
        var ret = 0;
        for (var i = 0; i < 2; i++) {
            ret = ret << 6;
            if (relDest[i] < 0) {
                //negative
                ret += 32; //for signed xd
            }
            ret += Math.abs(relDest[i]);
        }
        ret = ret << 4; //shift to align bits
        ret += 7; //lsb 3 bits
        return ret;
    }

    generateDefenseInitialSignal(relDest, enemyType) {
        //used when building specifically for defense
        var ret = 0;
        for (var i = 0; i < 2; i++) {
            ret = ret << 5;
            if (relDest[i] < 0) {
                //negative
                ret += 16; //for signed xd
            }
            ret += Math.abs(relDest[i]);
        }
        ret = ret << 3;
        ret += enemyType;
        ret = ret << 3;
        ret += 3;
        return ret;
    }

    generateRepositionSignal(relDest) {
        //same as initial pos but msbs denote relative loc of enemy
        //lsb are "6"
        var ret = 0;
        for (var i = 0; i < 2; i++) {
            ret = ret << 6;
            if (relDest[i] < 0) {
                //negative
                ret += 32; //for signed xd
            }
            ret += Math.abs(relDest[i]);
        }
        ret = ret << 4; //shift to align bits
        ret += 6; //lsb 3 bits
        return ret;
    }


    generateRepositionSignal2(relDest, enemyType) {
        //same as initial pos but msbs denote relative loc of enemy
        //lsb are "6"
        //also sends type of enemy seen. 0->worker 1->preacher 2->prophet 3->crusader
        var ret = 0;
        for (var i = 0; i < 2; i++) {
            ret = ret << 5;
            if (relDest[i] < 0) {
                //negative
                ret += 16; //for signed xd
            }
            ret += Math.abs(relDest[i]);
        }
        ret = ret << 3;
        ret += enemyType;
        ret = ret << 3; //shift to align bits
        ret += 4; //lsb 3 bits
        return ret;
    }

    generateEnemyCastleSignal(dest, numCastles) {
        var ret = 0;
        ret += Math.floor(dest[0]/2); //coarsen by 1 bit for verification and such
        ret = ret << 5;
        ret += Math.floor(dest[1]/2);
        ret = ret << 1;
        ret += this.me.team; 
        ret = ret << 2;
        ret += numCastles; //so units know when to start attaccing
        ret = ret << 3;
        ret += 2; //identifier
        return ret;
    }

    decodeSignal(signal) {
        if (signal % 8 == 7 || signal % 8 == 6) { //decoding is the same
            //initial pos signal or reposition signal
            var ret = [signal >> 10,(signal >> 4) % 64];
            for (var i = 0; i < 2; i++) {
                if (ret[i] >= 32) {
                    ret[i] -= 32;
                    ret[i] = ret[i] * -1;
                }
            }
            return ret;
        }

        if (signal % 8 == 4 || signal % 8 == 3) {
            var ret = [signal >> 11,(signal >> 6) % 32, (signal >> 3) % 8];
            for (var i = 0; i < 2; i++) {
                if (ret[i] >= 16) {
                    ret[i] -= 16;
                    ret[i] = ret[i] * -1;
                }
            }
            return ret;
        }

        if (signal % 8 == 2) {
            //enemy castle loc signal, returns loc + number of enemy castles
            return [(signal >> 11)*2, ((signal >> 6) % 32)*2, (signal >> 3) % 4, (signal >> 5) % 2];
        }
    }

    build(unittype) {
        if (this.canBuild(unittype)) {
            var robotsnear = this.getVisibleRobotMap();
            for (var i = 0; i < alldirs.length; i++) {
                var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                if (this.validCoords(nextloc) && robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                    //this.log("Create unit!");
                    return alldirs[i];
                }
            }
        }
        return null;
    }

    buildAway(unittype, loc) {
        var dist = -1;
        var best = null;
        if (this.canBuild(unittype)) {
            var robotsnear = this.getVisibleRobotMap();
            for (var i = 0; i < alldirs.length; i++) {
                var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                if (this.validCoords(nextloc) && robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                    //this.log("Create unit!");
                    if(this.distance(loc, nextloc) > dist) {
                        dist = this.distance(loc, nextloc);
                        best = alldirs[i];
                    }
                }
            }
        }
        return best;
    }

    buildSpread(unittype, loc) {
        var dist = 999999;
        var best = null;
        if (this.canBuild(unittype)) {
            var robotsnear = this.getVisibleRobotMap();
            for (var i = 0; i < alldirs.length; i++) {
                var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                if (this.validCoords(nextloc) && robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                    var good = true;
                    for (var j = 0; j < alldirs.length; j++) {
                        var nextloc2 = [nextloc[0] + alldirs[j][0], nextloc[1] + alldirs[j][1]];
                        if (this.validCoords(nextloc2) && robotsnear[nextloc2[1]][nextloc2[0]] != 0 && this.getRobot(robotsnear[nextloc2[1]][nextloc2[0]]).unit >= 3) {
                            good = false;
                            break;
                        }
                    }
                    if (good) {
                        //this.log("Create unit!");
                        if(this.distance(loc, nextloc) < dist) {
                            dist = this.distance(loc, nextloc);
                            best = alldirs[i];
                        }
                    }
                    
                }
            }
        }
        return best;
    }

    buildNear(unittype, loc) {
        var dist = 999999;
        var best = null;
        if (this.canBuild(unittype)) {
            var robotsnear = this.getVisibleRobotMap();
            for (var i = 0; i < alldirs.length; i++) {
                var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                if (this.validCoords(nextloc) && robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                    //this.log("Create unit!");
                    if(this.distance(loc, nextloc) < dist) {
                        dist = this.distance(loc, nextloc);
                        best = alldirs[i];
                    }
                }
            }
        }
        return best;
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
        if (minDir == null) {
            this.log("no good directions for greedymove");
            return;
        }
        if (this.fuel >= this.distance(minDir, [0,0]) * SPECS.UNITS[this.me.unit].FUEL_PER_MOVE) {
            return this.move(minDir[0], minDir[1]);
        } else {
            return null
        }
    }

    greedyMoveLoc(dest) {
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
        if (minDir == null) {
            this.log("no good directions for greedymove");
            return null;
        }
        return minDir;
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
        if (maxDir == null) {
            this.log("no good directions for greedymoveaway");
            return;
        }
        if (this.fuel >= this.distance(maxDir, [0,0]) * SPECS.UNITS[this.me.unit].FUEL_PER_MOVE) {
            return this.move(maxDir[0], maxDir[1]);
        } else {
            return null
        }
    }

    oppositeCoords(loc) {
        //TODO: only switch one of the coords based on determined symmetry
        var size = this.map.length;
        var ret = [loc[0], loc[1]];
        ret[1 - symmetry] = (size - ret[1 - symmetry] - 1);
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

    canAttack(loc) {
        return (this.validCoords(loc) && (this.getVisibleRobotMap()[loc[1]][loc[0]] >= 0));
    }

    canBuild(unit) {
        return this.fuel >= SPECS.UNITS[unit].CONSTRUCTION_FUEL && this.karbonite >= SPECS.UNITS[unit].CONSTRUCTION_KARBONITE;
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
            if (smallestcoord[0] - this.me.x == 0 && 0 == smallestcoord[1] - this.me.y) {
                return this.greedyMove(dest);
            }
            if (this.fuel >= this.distance([this.me.x, this.me.y], smallestcoord) * SPECS.UNITS[this.me.unit].FUEL_PER_MOVE) {
                return this.move(smallestcoord[0] - this.me.x, smallestcoord[1] - this.me.y);
            } else {
                return null;
            }
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
