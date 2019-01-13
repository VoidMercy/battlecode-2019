import {BCAbstractRobot, SPECS} from 'battlecode';
import { Castle } from 'castle.js'
import { Pilgrim } from 'pilgrim.js'
import { Preacher } from 'preacher.js'
import { Prophet } from 'prophet.js'
import * as Comms from 'communication.js'

import {alldirs, crusaderdirs, otherdirs} from 'constants.js'

var symmetry; //1 is vertical, 0 is horizontal

//pathfinding vars
var targetlocation = null;
var moves = null;
var dict = {};

//prophetvars
var enemylocs = [];
var curtarget = 0;
var attackmode = [0, 0, 0];
var lastchangedtarget = 0;

class MyRobot extends BCAbstractRobot {

    prophetattack() {
        var robotsnear = this.getVisibleRobots();
        var bestTarget = null;
        var bestScore = -1;
        for (var i = 0; i < robotsnear.length; i++) {
            if (this.isVisible(robotsnear[i]) && robotsnear[i].team != this.me.team) {
                var enemyLoc = [robotsnear[i].x, robotsnear[i].y];

                const dist = this.distance(enemyLoc, [this.me.x, this.me.y]);
                if (dist <= 64 && dist >= 16) {
                    //adjacent, a t t a c c
                    // determine best thing to shoot. 0 stands for Castle, 1 stands for Church, 2 stands for Pilgrim, 3 stands for Crusader, 4 stands for Prophet and 5 stands for Preacher.
                    // preacher > prophet > crusader > pilgrim > church > castle for now (ease of coding LMOA)
                    var score = (100 + robotsnear[i].unit * 100 - dist);
                    if (score > bestScore) {
                        bestTarget = [enemyLoc[0] - this.me.x, enemyLoc[1]- this.me.y];
                        bestScore = score;
                    }
                }

            }
        }
        if (bestTarget != null) {

            this.log("attacc");
            return this.attack(...bestTarget);
        }
        return null;
    }

    prophetsice() {
        this.log("PROPHET SICE");
        var nearbyrobots = this.getVisibleRobots();
        var sicesignal = null;
        var pilgrimsice = null;
        var friendlypreachers = [];

        //find pilgrim
        for (var i = 0; i < nearbyrobots.length; i++) {
            if (nearbyrobots[i].signal >= 0 && nearbyrobots[i].signal_radius > 0) {
                this.log(nearbyrobots[i]);
                this.log("SICEME")
                sicesignal = nearbyrobots[i].signal;
                this.log(sicesignal);
                //parse signal
                if (sicesignal == 8192) {
                    //toggle attackmode
                    this.log(nearbyrobots);
                    if (!("team" in nearbyrobots[i]) || nearbyrobots[i].team == this.me.team) {
                        if (attackmode[0]) {
                            this.log("ATTACKMODE OFF");
                            attackmode[0] = false;
                        } else {
                            this.log("ATTACKMODE ON");
                            attackmode[0] = true;
                        }
                    }
                    
                } else if (sicesignal == 8193) {
                    if (!("team" in nearbyrobots[i]) || nearbyrobots[i].team == this.me.team) {
                        if (attackmode[1]) {
                            this.log("ATTACKMODE OFF");
                            attackmode[1] = false;
                        } else {
                            this.log("ATTACKMODE ON");
                            attackmode[1] = true;
                        }
                    }
                    
                } else if (sicesignal == 8194) {
                    if (!("team" in nearbyrobots[i]) || nearbyrobots[i].team == this.me.team) {
                        if (attackmode[2]) {
                            this.log("ATTACKMODE OFF");
                            attackmode[2] = false;
                        } else {
                            this.log("ATTACKMODE ON");
                            attackmode[2] = true;
                        }
                    }
                    
                } else if (sicesignal >= 4096 && this.me.turn < 20) {
                    //receive enemy castle location information
                    enemylocs.push(Comms.Decompress12Bits(sicesignal - 4096));
                    this.log("PROPHET RECEIVED ENEMY");
                    this.log(enemylocs);
                }
            }
            if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].unit == SPECS.PILGRIM) {
                pilgrimsice = nearbyrobots[i];
            } else if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].unit == SPECS.PREACHER) {
                friendlypreachers.push(nearbyrobots[i]);
            }
        }

        if (pilgrimsice == null) {
            //don't see a pilgrim oh no
            this.log("RIP NO PILGRIM");
        }

        if (attackmode[0]) {
            var enemypreachers = [];
            var mindist = 999;
            var mindist2 = 999;
            var closestfriendly = null;
            var closestenemy = null;
            for (var i = 0; i < nearbyrobots.length; i++) {
                if (nearbyrobots[i].unit == SPECS.PREACHER) {
                    if (nearbyrobots[i].team == this.me.team) {
                        var temp = this.distance([this.me.x, this.me.y], [nearbyrobots[i].x, nearbyrobots[i].y]);
                        if (temp < mindist) {
                            mindist = temp;
                            closestfriendly = nearbyrobots[i];
                        }
                    } else {
                        enemypreachers.push(nearbyrobots[i]);
                        var temp = this.distance([this.me.x, this.me.y], [nearbyrobots[i].x, nearbyrobots[i].y]);
                        if (temp < mindist2) {
                            mindist2 = temp;
                            closestenemy = nearbyrobots[i];
                        }
                    }
                }
            }

            //spread out
            if (closestfriendly != null) {
                if (mindist <= 2) { //too close
                    this.log("PROPHET TOO CLOSE");
                    this.log(mindist);
                    //greedy move away
                    var maxVal = -1;
                    var maxDir = null;
                    var curdist = this.distance([this.me.x, this.me.y], [closestfriendly.x, closestfriendly.y]);
                    for (var i = 0; i < alldirs.length; i++) {
                        const newloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                        const dist = this.distance(newloc, [closestfriendly.x, closestfriendly.y]);
                        const visMap = this.getVisibleRobotMap();
                        if (this.validCoords(newloc) && visMap[newloc[1]][newloc[0]] == 0 && this.map[newloc[1]][newloc[0]] == true && dist > maxVal) {
                            if (closestenemy == null || (closestenemy != null && this.distance(newloc, [closestenemy.x, closestenemy.y]) > SPECS.UNITS[closestenemy.unit].ATTACK_RADIUS[1])) {
                                if (enemylocs[curtarget] != null || this.distance([this.me.x, this.me.y], enemylocs[curtarget]) > this.distance(newloc, enemylocs[curtarget])) {
                                    maxVal = dist;
                                    maxDir = alldirs[i];
                                }
                            }
                        }
                    }
                    if (maxDir == null) {
                        return this._bc_null_action();
                    }
                    return this.move(maxDir[0], maxDir[1]);
                }
            }

            //attack
            var attack = this.prophetattack();
            if (attack != null) {
                return attack;
            }

            //move towards target
            if (enemylocs[curtarget] != null) {
                var distancetotarget = this.distance([this.me.x, this.me.y], enemylocs[curtarget]);
                this.log(distancetotarget);
                if (distancetotarget <= 4) {
                    //reached target
                    curtarget++;
                    lastchangedtarget = this.me.turn;
                    if (curtarget >= enemylocs.length) {
                        return this._bc_null_action();
                    }
                }
                var move = this.moveto(enemylocs[curtarget], false);
                if (move != null) {
                    return this.move(...move);
                }
            }
            
        } else if (attackmode[1]) {

            //attack
            var attack = this.prophetattack();
            if (attack != null) {
                return attack;
            }

            //if no preachers, then CHARGE
            var move = this.moveto(enemylocs[curtarget], false);
            if (move != null) {
                return this.move(...move);
            } else {
                return this._bc_null_action();
            }
        } else if (attackmode[2]) {
            this.log("NOT IMPLEMENTED F");
        } else {
            //attack
            var attack = this.prophetattack();
            if (attack != null) {
                return attack;
            }

            //move towards target

            //if im in front of pilgrims and preachers
            this.log("PROPHET MOVE BITCH");

            if (curtarget < enemylocs.length) {
                var distancetotarget = this.distance([this.me.x, this.me.y], [enemylocs[curtarget][0], enemylocs[curtarget][1]]);
                this.log(distancetotarget);
                if (distancetotarget <= 4) {
                    //reached target
                    curtarget++;
                    if (curtarget >= enemylocs.length) {
                        return this._bc_null_action();
                    }
                }

                var enemylochash = this.hash(...enemylocs[curtarget]);

                if (enemylochash in dict) {
                    //if im ahead of the pack, then do nothing
                    
                    distancetotarget = dict[enemylochash][this.me.x][this.me.y]
                    if (pilgrimsice != null && distancetotarget < dict[enemylochash][pilgrimsice.x][pilgrimsice.y] + 4) {
                        this.log("WOAH SLOW DOWN 1");
                        this.log(distancetotarget);
                        this.log(pilgrimsice);
                        return this._bc_null_action();
                    }
                    /*
                    for (var i = 0; i < friendlypreachers.length; i++) {
                        if (distancetotarget < dict[enemylochash][friendlypreachers[i].x][friendlypreachers[i].y]) {
                            this.log(friendlypreachers[i]);
                            this.log("WOAH SLOW DOWN 2");
                            return this._bc_null_action();
                        }
                    }*/
                }

                

                //move towards target
                var move = this.moveto(enemylocs[curtarget], false);
                this.log("MOVE BITCH");
                if (move != null && (pilgrimsice != null && this.distance([this.me.x + move[0], this.me.y + move[1]], [pilgrimsice.x, pilgrimsice.y]) < this.distance([this.me.x, this.me.y], [pilgrimsice.x, pilgrimsice.y]))) {
                    return this.move(...move);
                } else if (pilgrimsice != null) {
                    return this.greedyMove([pilgrimsice.x, pilgrimsice.y]);
                } else if (move != null) {
                    return this.move(...move);
                }
            }
        }        
        return this._bc_null_action();
    }

    build(unittype) {
        if (this.canBuild(unittype)) {
            var robotsnear = this.getVisibleRobotMap();
            for (var i = 0; i < alldirs.length; i++) {
                var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                if (this.validCoords(nextloc) && robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
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

    moveto(dest, small) {
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
            if (small) {
                moveradius = 1;
            }
            var distancetodest = dict[this.hash(...dest)];
            var smallest = distancetodest[this.me.x][this.me.y];
            var smallestcoord = [this.me.x, this.me.y];
            var visible = this.getVisibleRobotMap();

            for (var i = this.me.x - Math.floor(Math.sqrt(moveradius)) - 1; i < this.me.x + Math.floor(Math.sqrt(moveradius)) + 1; i++) {
                for (var j = this.me.y - Math.floor(Math.sqrt(moveradius)) - 1; j < this.me.y + Math.floor(Math.sqrt(moveradius)) + 1; j++) {
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
            if (smallestcoord[0] == this.me.x && smallestcoord[1] == this.me.y) {
                return null;
            }
            return [smallestcoord[0] - this.me.x, smallestcoord[1] - this.me.y]
        }
    }

    turn() {
        if (this.me.turn == 1) {
            // first turn, calc symmetry
            symmetry = this.symmetricType();
        }
        if (this.me.unit === SPECS.CASTLE) {
            return Castle.call(this);
        }
        else if (this.me.unit === SPECS.PILGRIM) {
            return Pilgrim.call(this);
        }
        else if (this.me.unit === SPECS.PREACHER) {
            return Preacher.call(this);
        }
        else if (this.me.unit === SPECS.PROPHET) {
            return this.prophetsice();
        }

    }

}

var robot = new MyRobot();
