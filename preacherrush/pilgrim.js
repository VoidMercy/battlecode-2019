import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'
import * as Comms from 'communication.js'

//pilgrim variables
var spawnloc = null;
var enemylocs = [];
var curtarget = 0;
var attackmode = [false, false, false];

export var Pilgrim = function(self) {
    this.log("PILGRIM TURN ");
    this.log(this.me.turn);

    var nearbyrobots = this.getVisibleRobots();


    //get castle i spawned from
    if (this.me.turn == 1) {
        var tempmap = this.getVisibleRobotMap();
        for (var i = 0; i < alldirs.length; i++) {
            if (this.validCoords([this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]])) {
                var tempid = tempmap[this.me.y + alldirs[i][1]][this.me.x + alldirs[i][0]];
                if (tempid > 0) {
                    var robottype = this.getRobot(tempid).unit;
                    if (robottype == SPECS.CASTLE) {
                        //this.log("FOUND CASTLE");
                        spawnloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                        this.log(spawnloc);
                        break;
                    }
                }
            }
        }
    }

    //receive enemy castle locations
    if (this.me.turn >= 2 && this.me.turn <= 4) {
        var robotmap = this.getVisibleRobotMap();
        var castle = this.getRobot(robotmap[spawnloc[1]][spawnloc[0]]);
        if (castle.signal != -1) {
            this.log("RECEIVE CASTLE LOCATION SIGNAL");
            enemylocs.push(Comms.Decompress12Bits(castle.signal));
            this.log(enemylocs);
        }
    }

    //send enemy castle locations to preachers
    if (this.me.turn >= 5 && this.me.turn <= 7) {
        if (enemylocs.length > this.me.turn - 5) {
            //find farthest preacher
            var biggest = -1;
            for (var i = 0; i < nearbyrobots.length; i++) {
                if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].unit == SPECS.PREACHER) {
                    var distance = this.distance([this.me.x, this.me.y], [nearbyrobots[i].x, nearbyrobots[i].y]);
                    if (distance > biggest) {
                        biggest = distance;
                    }
                }
            }
            var signal = Comms.Compress12Bits(...enemylocs[this.me.turn - 5]) + 4096;
            this.signal(signal, biggest);
        }
    }

    //move towards target
    if (this.me.turn >= 7 && curtarget < enemylocs.length) {

        // look for preacher engagements
        var enemies = [0, 0, 0, 0, 0, 0];
        var closest = [999, 999, 999, 999, 999, 999];
        var friendlies = [];
        var closestenemy = null;
        var closestdist = 999;
        var temp = null;
        for (var i = 0; i < nearbyrobots.length; i++) {
            if (nearbyrobots[i].team != this.me.team) {
                enemies[nearbyrobots[i].unit]++;
                temp = this.distance([this.me.x, this.me.y], [nearbyrobots[i].x, nearbyrobots[i].y]);
                if (temp < closest[nearbyrobots[i].unit]) {
                    closest[nearbyrobots[i].unit] = nearbyrobots[i];
                }
                if (temp < closestdist && (nearbyrobots[i].unit == SPECS.PREACHER || nearbyrobots[i].unit == SPECS.PROPHET || nearbyrobots[i].unit == SPECS.CRUSADER)) {
                    closestdist = temp;
                    closestenemy = nearbyrobots[i];
                }
            } else {
                friendlies.push(nearbyrobots[i]);
            }
        }


        // this.log("RADIUS");
        // this.log(this.me.signal_radius);
        //there are preachers near, ready for attack
        if ((!attackmode[0] && !attackmode[1] && !attackmode[2]) && enemies[SPECS.PREACHER] + enemies[SPECS.PROPHET] + enemies[SPECS.CRUSADER] != 0) {
            var biggest = -1;
            for (var i = 0; i < nearbyrobots.length; i++) {
                if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].unit == SPECS.PREACHER) {
                    var distance = this.distance([this.me.x, this.me.y], [nearbyrobots[i].x, nearbyrobots[i].y]);
                    if (distance > biggest) {
                        biggest = distance;
                    }
                }
            }
            if (enemies[SPECS.PREACHER] != 0 && enemies[SPECS.PROPHET] == 0) {
                attackmode[0] = true;
                this.log("SEND ATTACKMODE SIGNAL ON 8192");
                this.signal(8192, biggest + 20); //stand ground, wait for preachers to attack
            } else if (enemies[SPECS.PREACHER] == 0 && enemies[SPECS.PROPHET] != 0) {
                this.log("SEND ATTACKMODE SIGNAL ON 8193");
                attackmode[1] = true;
                this.signal(8193, biggest + 20); //charge without spreading out
            } else if (enemies[SPECS.PREACHER] != 0 && enemies[SPECS.PROPHET] != 0) {
                this.log("SEND ATTACKMODE SIGNAL ON 8194");
                attackmode[2] = true;
                this.signal(8194, biggest + 20); //charge while spreading out
            }
        }
        //preachers all killed, continue pushing
        if (attackmode[0] && enemies[SPECS.PREACHER] == 0) {
            var biggest = -1;
            for (var i = 0; i < nearbyrobots.length; i++) {
                if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].unit == SPECS.PREACHER) {
                    var distance = this.distance([this.me.x, this.me.y], [nearbyrobots[i].x, nearbyrobots[i].y]);
                    if (distance > biggest) {
                        biggest = distance;
                    }
                }
            }
            this.log("SEND ATTACKMODE SIGNAL OFF 8192");
            attackmode[0] = false;
            this.signal(8192, biggest + 20);
        } else if (attackmode[1] && enemies[SPECS.PREACHER] + enemies[SPECS.PROPHET] + enemies[SPECS.CRUSADER] == 0) {
            var biggest = -1;
            for (var i = 0; i < nearbyrobots.length; i++) {
                if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].unit == SPECS.PREACHER) {
                    var distance = this.distance([this.me.x, this.me.y], [nearbyrobots[i].x, nearbyrobots[i].y]);
                    if (distance > biggest) {
                        biggest = distance;
                    }
                }
            }
            this.log("SEND ATTACKMODE SIGNAL OFF 8193");
            attackmode[1] = false;
            this.signal(8193, biggest + 20);
        } else if (attackmode[2] && (enemies[SPECS.PREACHER] == 0 || enemies[SPECS.PROPHET] == 0)) {
            var biggest = -1;
            for (var i = 0; i < nearbyrobots.length; i++) {
                if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].unit == SPECS.PREACHER) {
                    var distance = this.distance([this.me.x, this.me.y], [nearbyrobots[i].x, nearbyrobots[i].y]);
                    if (distance > biggest) {
                        biggest = distance;
                    }
                }
            }
            this.log("SEND ATTACKMODE SIGNAL OFF 8194");
            attackmode[2] = false;
            this.signal(8194, biggest + 20);
        }


        if ((attackmode[0] || attackmode[1] || attackmode[2]) && closestenemy != null) {
            var closestbattle = 999;
            //find closest friendly unit to closest enemy
            for (var i = 0; i < friendlies.length; i++) {
                var temp = this.distance([closestenemy.x, closestenemy.y], [friendlies[i].x, friendlies[i].y]);
                if (temp < closestbattle) {
                    closestbattle = temp;
                }
            }

            //run away from the battlefield
            var distancetoenemy = this.distance([this.me.x, this.me.y], [closestenemy.x, closestenemy.y]);
            if (distancetoenemy < closestbattle || (distancetoenemy <= closestbattle + 10 && distancetoenemy < SPECS.UNITS[closestenemy.unit].ATTACK_RADIUS[1] + 16)) {
                this.log("RUN AWAY FROM BATTLEFIELD");
                return this.greedyMoveAway([closestenemy.x, closestenemy.y]);
            } else if (distancetoenemy > closestbattle + 10) {
                this.log("DONT STAY TOO FAR FROM BATTLEFIELD");
                var minVal = 999999999;
                var minDir = null;
                var visMap = this.getVisibleRobotMap();
                for (var i = 0; i < alldirs.length; i++) {
                    var newloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                    var dist = this.distance(newloc, [closestenemy.x, closestenemy.y]);
                    if (this.validCoords(newloc) && visMap[newloc[1]][newloc[0]] == 0 && this.map[newloc[1]][newloc[0]] && dist < minVal) {
                        minVal = dist;
                        minDir = alldirs[i];
                    }
                }
                if (minDir == null) {
                    return this._bc_null_action();
                }
                return this.move(minDir[0], minDir[1]);
            }
            return this._bc_null_action();
        }

        //keep moving towards target
        if (this.distance([this.me.x, this.me.y], enemylocs[curtarget]) <= 4) {
            //reached target
            curtarget++;
            if (curtarget >= enemylocs.length) {
                return this._bc_null_action();
            }
        }
        var biggest = -1;
        for (var i = 0; i < nearbyrobots.length; i++) {
            if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].unit == SPECS.PREACHER) {
                var distance = this.distance([this.me.x, this.me.y], [nearbyrobots[i].x, nearbyrobots[i].y]);
                if (distance > biggest) {
                    biggest = distance;
                }
            }
        }
        if (biggest >= SPECS.UNITS[SPECS.PREACHER].VISION_RADIUS * 2) {
            this.log("SLOW");
            var move = this.moveto(enemylocs[curtarget], true);
        } else {
            var move = this.moveto(enemylocs[curtarget], false);
        }
        
        if (move != null) {
            return this.move(...move);
        }
    }


    return this._bc_null_action();
}
