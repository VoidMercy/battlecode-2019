import {BCAbstractRobot, SPECS} from 'battlecode';
import { Castle } from 'castle.js'
import { Church } from 'church.js'
import { Pilgrim } from 'pilgrim.js'
import { Prophet } from 'prophet.js'
import { Crusader } from 'crusader.js'
import { Preacher } from 'preacher.js'
import {alldirs, crusaderdirs, otherdirs, lattices} from 'constants.js'

var symmetry; //1 is vertical, 0 is horizontal

//pathfinding vars
var dict = {};

class MyRobot extends BCAbstractRobot {

    isTowardsTheirSide(relloc, oursideloc) {
        var baseloc = oursideloc;
        var oppRelLoc = this.oppositeCoords(baseloc);
        var iToCheck = 1 - this.get_symmetry();
        //this.log(iToCheck);
        //this.log(oppRelLoc);
        //this.log(baseloc);
        //this.log(relloc);
        if ((oppRelLoc[iToCheck] > baseloc[iToCheck] && relloc[iToCheck] >= 0) || (oppRelLoc[iToCheck] < baseloc[iToCheck] && relloc[iToCheck] <= 0)) {
            return true;
        } else {
            return false;
        }
    }

    get_symmetry() {
        return symmetry;
    }

    find_idle_spot(castleLoc) {
        //assume theres a spot since if we're rushing it isnt gonna be full of units lol
        var robotmap = this.getVisibleRobotMap();
        for (var index = 0; index < lattices.length; index++) {
            var latticeloc = [this.me.x + lattices[index][0], this.me.y + lattices[index][1]];
            if (this.validCoords(latticeloc) /* coordinates are valid */ && 
                this.map[latticeloc[1]][latticeloc[0]] /* is passable terrain */ && 
                robotmap[latticeloc[1]][latticeloc[0]] == 0 /* not occupied */ &&
                !this.karbonite_map[latticeloc[1]][latticeloc[0]] /* not karbonite */ &&
                !this.fuel_map[latticeloc[1]][latticeloc[0]] /* not fuel */) {
                var num_adjacent_deposits = 0;
                for (var i = 0; i < alldirs.length; i++) {
                    var checkloc = [latticeloc[0] + alldirs[i][0], latticeloc[1] + alldirs[i][1]];
                    if (this.validCoords(checkloc) && (this.karbonite_map[checkloc[1]][checkloc[0]] || this.fuel_map[checkloc[1]][checkloc[0]])) {
                        num_adjacent_deposits++;
                    }
                }
                if (num_adjacent_deposits <= 1 && this.isTowardsTheirSide(lattices[index], castleLoc)) {
                    return latticeloc;
                }
            }
        }
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

    distanceFromCenter(loc) {
        var otherloc = this.oppositeCoords(loc);
        var middle = [this.map[0].length / 2, this.map.length / 2];
        return this.distance(loc, otherloc) + this.distance(loc, middle);
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
            return null;
        }
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
        if (signal % 8 == 1) {
            //absolute decode cuz im a lazy fuck
            return [(signal >> 10), (signal >> 4) % 64];
        }
    }

    generateAbsoluteTarget(dest) {
        var ret = 0;
        for (var i = 0; i < 2; i++) {
            ret = ret << 6;
            ret += dest[i];
        }
        ret = ret << 4; //shift to align bits
        ret += 1; //lsb 3 bits
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

    centerOurSide(point_on_our_side) {
        var point = null;
        var oppositePoint = null;
        if (symmetry == 1) {
            point = [0, Math.floor(this.map.length / 2)];
            oppositePoint = this.oppositeCoords(point);
        } else {
            point = [Math.floor(this.map[0].length / 2), 0];
            oppositePoint = this.oppositeCoords(point);
        }
        if (this.distance(point_on_our_side, oppositePoint) < this.distance(point_on_our_side, point)) {
            return oppositePoint;
        }
        return point;
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

    // 1 = vertical symmetry
    // 0 = horizontal symmetry

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

    greedyMove(dest) {
        //TODO: make it possible to move multiple tiles at once xd
        //note: this moves backwards if it cant move closer lol
        var dirs = ((this.me.unit == SPECS.CRUSADER) ? crusaderdirs : otherdirs);
        var minVal = 9999999999999;
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
            //this.log("no good directions for greedymove");
            return null;;
        }
        if (this.fuel >= this.distance(minDir, [0,0]) * SPECS.UNITS[this.me.unit].FUEL_PER_MOVE) {
            return this.move(minDir[0], minDir[1]);
        } else {
            return null;
        }
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
                    if (this.validCoords(...nextloc) && this.map[nextloc[1]][nextloc[0]]) {
                        if (distancetodest[nextloc[0]][nextloc[1]] == undefined) {
                            queue.push(nextloc);
                            distancetodest[nextloc[0]][nextloc[1]] = distancetodest[cur[0]][cur[1]] + this.distance([0, 0], alldirs[i]);
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

            for (var i = this.me.x - Math.sqrt(moveradius); i <= this.me.x + Math.sqrt(moveradius); i++) {
                for (var j = this.me.y - Math.sqrt(moveradius); j <= this.me.y + Math.sqrt(moveradius); j++) {
                    if (this.validCoords([i, j]) && distancetodest[i][j] != undefined && this.distance([this.me.x, this.me.y], [i, j]) <= moveradius) {
                        if (visible[j][i] <= 0) {
                                if (distancetodest[i][j] < smallest) {
                                smallest = distancetodest[i][j];
                                smallestcoord = [i, j];
                            } else if (distancetodest[i][j] == smallest && this.distance([i, j], dest) <= this.distance(smallestcoord, dest)) {
                                smallest = distancetodest[i][j];
                                smallestcoord = [i, j];
                            }
                        }
                    }
                }
            }

            //this.log("MOVING");
            //this.log(this.me.id);
            //this.log([this.me.x, this.me.y]);
            //this.log(smallestcoord);
            if (smallestcoord[0] - this.me.x == 0 && 0 == smallestcoord[1] - this.me.y) {
                return this.singlebfs(dest);//this.greedyMove(idealcoord);
            }
            if (this.fuel >= this.distance([this.me.x, this.me.y], smallestcoord) * SPECS.UNITS[this.me.unit].FUEL_PER_MOVE) {
                return this.move(smallestcoord[0] - this.me.x, smallestcoord[1] - this.me.y);
            } else {
                return null;
            }
        }
    }

    singlebfs(dest) {
        var robotmap = this.getVisibleRobotMap();
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
                if (this._bc_check_on_map(...nextloc) && this.map[nextloc[1]][nextloc[0]] && robotmap[nextloc[1]][nextloc[0]] <= 0) {
                    if (distancetodest[nextloc[0]][nextloc[1]] == undefined) {
                        queue.push(nextloc);
                        distancetodest[nextloc[0]][nextloc[1]] = distancetodest[cur[0]][cur[1]] + this.distance([0, 0], alldirs[i]);
                    }
                }
            }
        }

        var moveradius = SPECS.UNITS[this.me.unit].SPEED;
        var smallest = 999999999;
        var smallestcoord = [this.me.x, this.me.y];
        var visible = this.getVisibleRobotMap();

        for (var i = this.me.x - Math.ceil(Math.sqrt(moveradius)); i <= this.me.x + Math.ceil(Math.sqrt(moveradius)); i++) {
            for (var j = this.me.y - Math.ceil(Math.sqrt(moveradius)); j <= this.me.y + Math.ceil(Math.sqrt(moveradius)); j++) {
                if (this.validCoords([i, j]) && distancetodest[i][j] != undefined && this.distance([this.me.x, this.me.y], [i, j]) <= moveradius) {
                    if (visible[j][i] <= 0) {
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

        if (smallestcoord[0] - this.me.x == 0 && 0 == smallestcoord[1] - this.me.y) {
            return null;
        }

        if (this.fuel >= this.distance([this.me.x, this.me.y], smallestcoord) * SPECS.UNITS[this.me.unit].FUEL_PER_MOVE) {
            return this.move(smallestcoord[0] - this.me.x, smallestcoord[1] - this.me.y);
        } else {
            return null;
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
