import {SPECS} from 'battlecode';
import {alldirs, preacherdirs, preacherattackdirs} from 'constants.js'
import * as Comms from 'communication.js'

var enemylocs = [];
var curtarget = 0;
var attackmode = [0, 0, 0];

export var Preacher = function() {

    var nearbyrobots = this.getVisibleRobots();
    var sicesignal = null;
    var pilgrimsice = null;

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
                this.log("PREACHER RECEIVED ENEMY");
                this.log(enemylocs);
            }
        }
        if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].unit == SPECS.PILGRIM) {
            pilgrimsice = nearbyrobots[i];
        }
    }

    if (pilgrimsice == null) {
        //don't see a pilgrim oh no
        this.log("RIP NO PILGRIM");
    }

    var best_score = 0;
    var best_score_locs;
    var vismap = this.getVisibleRobotMap();
    for(var i = 0; i < preacherdirs.length; i++) {
        var attack_x = this.me.x + preacherdirs[i][0], attack_y = this.me.y + preacherdirs[i][1];
        if(!this.validCoords([attack_x, attack_y])) continue;
        if(vismap[attack_y][attack_x] <= 0) continue;
        var curr_score = 0;
        var attack_count = 0;
        for(var j = 0; j < preacherattackdirs.length; j++) {
            var target_x = attack_x + preacherattackdirs[j][0], target_y = attack_y + preacherattackdirs[j][1];
            if(!this.validCoords([target_x, target_y])) continue;
            var target_robot = vismap[target_y][target_x];
            if(target_robot <= 0) continue;
            target_robot = this.getRobot(target_robot);
            if(target_robot.team == this.me.team) {
                if(target_x == this.me.x && target_y == this.me.y) {
                  curr_score -= 60;
                }
                else if(target_robot.unit == SPECS.CASTLE || target_robot.unit == SPECS.CHURCH) {
                  curr_score -= 80;
                }
                else if(target_robot.unit == SPECS.PILGRIM){
                  curr_score -= 5;
                } else {
                    curr_score -= 20;
                }
            }
            else {
                attack_count++;
                curr_score += 20;
            }
        }
        if(attack_count >= 0 && curr_score >= best_score) {
            best_score = curr_score;
            best_score_locs = preacherdirs[i];
        }
    }

    if(best_score_locs != undefined) {
        this.log("PREACHER ATTACK");
        return this.attack(...best_score_locs);
    }

    if (attackmode[0]) {
        //if already in engagement (friendly and enemy can attack each other), then greedy move to attack while still keeping 1 tile apart
        var friendlypreachers = [];
        var enemypreachers = [];
        var mindist = 999;
        var mindist2 = 999;
        var closestfriendly = null;
        var closestenemy = null;
        for (var i = 0; i < nearbyrobots.length; i++) {
            if (nearbyrobots[i].unit == SPECS.PREACHER) {
                if (nearbyrobots[i].team == this.me.team && nearbyrobots[i].id != this.me.id) {
                    friendlypreachers.push(nearbyrobots[i]);
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

        /*
        for (var i = 0; i < friendlypreachers.length; i++) {
            for (var j = 0; j < enemypreachers.length; j++) {
                if (this.distance([friendlypreachers[i].x, friendlypreachers[i].y], [enemypreachers[j].x, enemypreachers[j].y]) <= SPECS.UNITS[SPECS.PREACHER].ATTACK_RADIUS[1]) {
                    this.log("ENGAGEMENT");
                    //move towards enemy
                    var minVal = 999999999;
                    var minDir = null;
                    for (var a = 0; a < alldirs.length; a++) {
                        const newloc = [this.me.x + alldirs[a][0], this.me.y + alldirs[a][1]];
                        const dist = this.distance(newloc, [enemypreachers[j].x, enemypreachers[j].y]);
                        const visMap = this.getVisibleRobotMap();
                        if (this.validCoords(newloc) && visMap[newloc[1]][newloc[0]] == 0 && this.map[newloc[1]][newloc[0]] && dist < minVal) {
                            if (this.distance(newloc, [friendlypreachers[i].x, friendlypreachers[i].y]) > 2) {
                                minVal = dist;
                                minDir = alldirs[a];
                            }
                        }
                    }
                    if (minDir == null) {
                        return this._bc_null_action();
                    }
                    return this.move(minDir[0], minDir[1]);
                }
            }
        }*/

        //otherwise move apart from each other
        if (closestfriendly != null) {
            if (mindist <= 2) { //too close
                this.log("TOO CLOSE");
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
            } else if (mindist > 8) { //too far
                this.log("TOO FAR");
                var minVal = 999999999;
                var minDir = null;
                for (var i = 0; i < alldirs.length; i++) {
                    var newloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                    var dist = this.distance(newloc, [closestfriendly.x, closestfriendly.y]);
                    var visMap = this.getVisibleRobotMap();
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
        }
    } else if (attackmode[1]) {
        var move = this.moveto(enemylocs[curtarget], false);
        if (move != null) {
            return this.move(...move);
        } else {
            return this._bc_null_action();
        }
    } else if (attackmode[2]) {

    } else {
        //move towards target
        if (curtarget < enemylocs.length) {
            if (this.distance([this.me.x, this.me.y], enemylocs[curtarget]) <= 4) {
                //reached target
                curtarget++;
                if (curtarget >= enemylocs.length) {
                    return this._bc_null_action();
                }
            }
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