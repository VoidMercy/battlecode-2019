import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'
import * as Comms from 'communication.js'

//pilgrim variables
var spawnloc = null;
var enemylocs = [];
var curtarget = 0;
var attackmode = false;

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
        var temp = null;
        for (var i = 0; i < nearbyrobots.length; i++) {
            if (nearbyrobots[i].team != this.me.team) {
                enemies[nearbyrobots[i].unit]++;
                temp = this.distance([this.me.x, this.me.y], [nearbyrobots[i].x, nearbyrobots[i].y]);
                if (temp < closest[nearbyrobots[i].unit]) {
                    closest[nearbyrobots[i].unit] = nearbyrobots[i];
                }
            }
        }


        // this.log("RADIUS");
        // this.log(this.me.signal_radius);
        //there are preachers near, ready for attack
        if (!attackmode && enemies[SPECS.PREACHER] != 0 && this.distance([this.me.x, this.me.y], [closest[SPECS.PREACHER].x, closest[SPECS.PREACHER].y]) <= SPECS.UNITS[SPECS.PREACHER].ATTACK_RADIUS[1] + 5) {
            var biggest = -1;
            for (var i = 0; i < nearbyrobots.length; i++) {
                if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].unit == SPECS.PREACHER) {
                    var distance = this.distance([this.me.x, this.me.y], [nearbyrobots[i].x, nearbyrobots[i].y]);
                    if (distance > biggest) {
                        biggest = distance;
                    }
                }
            }
            attackmode = true;
            this.log("SEND ATTACKMODE SIGNAL ON");
            // this.signal(8192, biggest);
        }
        //no more preachers near
        if (attackmode && enemies[SPECS.PREACHER] == 0) {
            var biggest = -1;
            for (var i = 0; i < nearbyrobots.length; i++) {
                if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].unit == SPECS.PREACHER) {
                    var distance = this.distance([this.me.x, this.me.y], [nearbyrobots[i].x, nearbyrobots[i].y]);
                    if (distance > biggest) {
                        biggest = distance;
                    }
                }
            }
            this.log("SEND ATTACKMODE SIGNAL OFF")
            attackmode = false;
            // this.signal(8192, biggest);
        }

        if (attackmode) {
            //run away from the battlefield
            if (this.distance([this.me.x, this.me.y], [closest[SPECS.PREACHER].x, closest[SPECS.PREACHER].y]) < SPECS.UNITS[SPECS.PREACHER].ATTACK_RADIUS[1] + 8) {
                this.log("RUN AWAY FROM BATTLEFIELD");
                return this.greedyMoveAway([closest[SPECS.PREACHER].x, closest[SPECS.PREACHER].y]);
            }
            return this._bc_null_action();
        }

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
