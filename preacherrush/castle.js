import {SPECS} from 'battlecode';
import {alldirs} from 'constants.js'
import * as Comms from 'communication.js'

var first_castle = true;
var castle_locs = [];
var enemy_castle_locs = [];

export var Castle = function() {
    var robotsnear = this.getVisibleRobots();

    if (this.me.turn == 1) {
        this.log([["CASTLE_AT"], [this.me.x, this.me.y]]);
        this.log("checking castle talk");
        for(var i = 0; i < robotsnear.length; i++) {
            if(robotsnear[i].castle_talk) {
                first_castle = false;
            }
        }
        this.castleTalk(Comms.Compress8Bits(this.me.x, this.me.y));
        if (first_castle) {
            return this.build(SPECS.PILGRIM);
        }
        
    }

    //receive castle locations
    if(this.me.turn == 2) {
        for(var i = 0; i < robotsnear.length; i++) {
            if(robotsnear[i].castle_talk) {
                castle_locs.push(Comms.Decompress8Bits(robotsnear[i].castle_talk));
            }
        }
    }

    //tell pilgrim location of enemy castles and produce preachers
    if (this.me.turn >= 2 && this.me.turn <= 4) {
        if (castle_locs.length > this.me.turn - 2) {
            var range = null;
            for (var i = 0; i < robotsnear.length; i++) {
                if (robotsnear[i].unit == SPECS.PILGRIM) {
                    range = Math.floor(this.distance([this.me.x, this.me.y], [robotsnear[i].x, robotsnear[i].y])) + 1;
                    break;
                }
            }
            //tell worker locations of castles
            this.signal(Comms.Compress12Bits(...this.oppositeCoords(castle_locs[this.me.turn - 2])), range);
        }
        if (first_castle) {
            return this.build(SPECS.PREACHER);
        }
    }
    return this._bc_null_action();
}
