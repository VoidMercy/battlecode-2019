import {SPECS} from 'battlecode';
import {alldirs, preacherdirs, preacherattackdirs} from 'constants.js'
import * as Comms from 'communication.js'

var enemylocs = [];
var curtarget = 0;
var attackmode = [0, 0, 0];
var lastchangedtarget = 0;

export var Prophet = function() {

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
                
            } else if (sicesignal == 8195) {
                if (!("team" in nearbyrobots[i]) || nearbyrobots[i].team == this.me.team) {
                    if (this.me.turn - lastchangedtarget < 20) {
                        curtarget++;
                        lastchangedtarget = this.me.turn;
                    }
                }

            } else if (sicesignal >= 4096 && this.me.turn < 20) {
                //receive enemy castle location information
                enemylocs.push(Decompress12Bits(sicesignal - 4096));
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

    //attack
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

    if (attackmode[0]) {
        //if already in engagement (friendly and enemy can attack each other), then greedy move to attack while still keeping 1 tile apart
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
                        if (closestenemy == null || (closestenemy != null && this.distance(newloc, [closestenemy.x, closestenemy.y]) > SPECS.UNITS[closestenemy.unit].ATTACK_RADIUS[1]) || curdist < dist) {
                            maxVal = dist;
                            maxDir = alldirs[i];
                        }
                    }
                }
                if (maxDir == null) {
                    return this._bc_null_action();
                }
                return this.move(maxDir[0], maxDir[1]);
            }
        }

        //move towards target
        var move = this.moveto(enemylocs[curtarget], false);
        if (move != null) {
            return this.move(...move);
        }
} else if (attackmode[1]) {
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
        //move towards target

        //if im in front of pilgrims and preachers

        if (curtarget < enemylocs.length) {
            if (distancetotarget <= 4) {
                //reached target
                curtarget++;
                lastchangedtarget = this.me.turn;
                if (curtarget >= enemylocs.length) {
                    return this._bc_null_action();
                }
            }

            var enemylochash = this.hash(...enemylocs[curtarget]);

            if (enemylochash in dict) {
                //if im ahead of the pack, then do nothing
                var distancetotarget = dict[enemylochash][this.me.x][this.me.y]
                if (pilgrimsice != null && distancetotarget < dict[enemylocs[curtarget]][pilgrimsice.x][pilgrimsice.y]) {
                    this.log("WOAH SLOW DOWN 1");
                    return this._bc_null_action();
                }
                for (var i = 0; i < friendlypreachers.length; i++) {
                    if (distancetotarget < dict[enemylochash][friendlypreachers[i].x][friendlypreachers[i].y]) {
                        this.log("WOAH SLOW DOWN 2");
                        return this._bc_null_action();
                    }
                }
            }

            

            //move towards target
            var move = this.moveto(enemylocs[curtarget], false);
            if (move != null && (pilgrimsice != null && this.distance([this.me.x + move[0], this.me.y + move[1]], [pilgrimsice.x, pilgrimsice.y]) < this.distance([this.me.x, this.me.y], [pilgrimsice.x, pilgrimsice.y]))) {
                return this.move(...move);
            } else if (pilgrimsice != null) {
                return this.greedyMove([pilgrimsice.x, pilgrimsice.y]);
            } else if (move != null) {
                return this.move(...move);
            }
        }
    }

    //attack
    
    return this._bc_null_action();
}