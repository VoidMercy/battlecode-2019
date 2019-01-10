import {SPECS} from 'battlecode';
import {alldirs, preacherdirs, preacherattackdirs} from 'constants.js'
import * as Comms from 'communication.js'

var enemylocs = [];
var curtarget = 0;

export var Preacher = function() {

    var nearbyrobots = this.getVisibleRobots();
    var sicesignal = null;
    var pilgrimsice = null;

    //find pilgrim
    for (var i = 0; i < nearbyrobots.length; i++) {
        if (nearbyrobots[i].signal > 0) {
            this.log("SICEME")
            sicesignal = nearbyrobots[i].signal;
            this.log(sicesignal);
        }
        if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].unit == SPECS.PILGRIM) {
            pilgrimsice = nearbyrobots[i];
            break;
        }
    }

    if (pilgrimsice == null) {
        //don't see a pilgrim oh no
        this.log("RIP NO PILGRIM");
    }

    //parse pilgrim signals
    if (sicesignal != null) {
        if (sicesignal >= 256) {
            //receive enemy castle location information
            enemylocs.push(Comms.Decompress8Bits(sicesignal - 256));
            this.log("PREACHER RECEIVED ENEMY");
            this.log(enemylocs);
        }
        
    }

    //move towards target
    if (curtarget < enemylocs.length) {
        if (this.distance([this.me.x, this.me.y], enemylocs[curtarget]) <= 4) {
            //reached target
            curtarget++;
            if (curtarget >= enemylocs.length) {
                return this._bc_null_action();
            }
        }
        this.log("MOVE!");
        this.log(enemylocs[curtarget]);
        var move = this.moveto(enemylocs[curtarget], false);
        if (move != null && (pilgrimsice != null && this.distance([this.me.x + move[0], this.me.y + move[1]], [pilgrimsice.x, pilgrimsice.y]) < this.distance([this.me.x, this.me.y], [pilgrimsice.x, pilgrimsice.y]))) {
            return this.move(...move);
        } else if (pilgrimsice != null) {
            return this.greedyMove([pilgrimsice.x, pilgrimsice.y]);
        } else {
            return this.move(...move);
        }
    }
    return this._bc_null_action();
}
