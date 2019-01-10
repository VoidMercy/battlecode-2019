import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'
import * as Comms from 'communication.js'

//pilgrim variables
var spawnloc = null;
var enemylocs = [];
var curtarget = 0;

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
            this.signal(signal, biggest + 1);
        }
    }

    //move towards target
    if (this.me.turn >= 7 && curtarget < enemylocs.length) {
        if (this.distance([this.me.x, this.me.y], enemylocs[curtarget]) <= 4) {
            //reached target
            curtarget++;
            if (curtarget >= enemylocs.length) {
                return this._bc_null_action();
            }
        }
        this.log("MOVE!");
        this.log(enemylocs[curtarget]);
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

    var enemies = [0, 0, 0, 0, 0, 0];
    // for (var i = 0; i < nearbyrobots.length; i++) 
    return this._bc_null_action();
}
