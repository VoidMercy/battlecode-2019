'use strict';

var SPECS = {"COMMUNICATION_BITS":16,"CASTLE_TALK_BITS":8,"MAX_ROUNDS":1000,"TRICKLE_FUEL":25,"INITIAL_KARBONITE":100,"INITIAL_FUEL":500,"MINE_FUEL_COST":1,"KARBONITE_YIELD":2,"FUEL_YIELD":10,"MAX_TRADE":1024,"MAX_BOARD_SIZE":64,"MAX_ID":4096,"CASTLE":0,"CHURCH":1,"PILGRIM":2,"CRUSADER":3,"PROPHET":4,"PREACHER":5,"RED":0,"BLUE":1,"CHESS_INITIAL":100,"CHESS_EXTRA":20,"UNITS":[{"CONSTRUCTION_KARBONITE":null,"CONSTRUCTION_FUEL":null,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":100,"VISION_RADIUS":10,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":50,"CONSTRUCTION_FUEL":200,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":50,"VISION_RADIUS":10,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":10,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":1,"STARTING_HP":10,"VISION_RADIUS":10,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":20,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":9,"FUEL_PER_MOVE":1,"STARTING_HP":40,"VISION_RADIUS":6,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,4],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":25,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":2,"STARTING_HP":20,"VISION_RADIUS":8,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[4,8],"ATTACK_FUEL_COST":25,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":30,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":3,"STARTING_HP":60,"VISION_RADIUS":4,"ATTACK_DAMAGE":20,"ATTACK_RADIUS":[1,4],"ATTACK_FUEL_COST":15,"DAMAGE_SPREAD":9}]};

function insulate(content) {
    return JSON.parse(JSON.stringify(content));
}

class BCAbstractRobot {
    constructor() {
        this._bc_reset_state();
    }

    // Hook called by runtime, sets state and calls turn.
    _do_turn(game_state) {
        this._bc_game_state = game_state;
        this.id = game_state.id;
        this.karbonite = game_state.karbonite;
        this.fuel = game_state.fuel;
        this.last_offer = game_state.last_offer;

        this.me = this.getRobot(this.id);

        if (this.me.turn === 1) {
            this.map = game_state.map;
            this.karbonite_map = game_state.karbonite_map;
            this.fuel_map = game_state.fuel_map;
        }

        try {
            var t = this.turn();
        } catch (e) {
            t = this._bc_error_action(e);
        }

        if (!t) t = this._bc_null_action();

        this._bc_reset_state();

        return t;
    }

    _bc_reset_state() {
        // Internal robot state representation
        this._bc_logs = [];
        this._bc_signal = 0;
        this._bc_signal_radius = 0;
        this._bc_game_state = null;
        this._bc_castle_talk = 0;
        this.me = null;
        this.id = null;
        this.fuel = null;
        this.karbonite = null;
        this.last_offer = null;
    }

    // Action template
    _bc_null_action() {
        return {
            'signal': this._bc_signal,
            'signal_radius': this._bc_signal_radius,
            'logs': this._bc_logs,
            'castle_talk': this._bc_castle_talk
        };
    }

    _bc_error_action(e) {
        var a = this._bc_null_action();
        
        if (e.stack) a.error = e.stack;
        else a.error = e.toString();

        return a;
    }

    _bc_action(action, properties) {
        var a = this._bc_null_action();
        if (properties) for (var key in properties) { a[key] = properties[key]; }
        a['action'] = action;
        return a;
    }

    _bc_check_on_map(x, y) {
        return x >= 0 && x < this._bc_game_state.shadow[0].length && y >= 0 && y < this._bc_game_state.shadow.length;
    }
    
    log(message) {
        this._bc_logs.push(JSON.stringify(message));
    }

    // Set signal value.
    signal(value, radius) {
        // Check if enough fuel to signal, and that valid value.

        if (this.fuel < radius) throw "Not enough fuel to signal given radius.";
        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.COMMUNICATION_BITS)) throw "Invalid signal, must be int within bit range.";
        if (radius > 2*Math.pow(SPECS.MAX_BOARD_SIZE-1,2)) throw "Signal radius is too big.";

        this._bc_signal = value;
        this._bc_signal_radius = radius;

        this.fuel -= radius;
    }

    // Set castle talk value.
    castleTalk(value) {
        // Check if enough fuel to signal, and that valid value.

        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.CASTLE_TALK_BITS)) throw "Invalid castle talk, must be between 0 and 2^8.";

        this._bc_castle_talk = value;
    }

    proposeTrade(karbonite, fuel) {
        if (this.me.unit !== SPECS.CASTLE) throw "Only castles can trade.";
        if (!Number.isInteger(karbonite) || !Number.isInteger(fuel)) throw "Must propose integer valued trade."
        if (Math.abs(karbonite) >= SPECS.MAX_TRADE || Math.abs(fuel) >= SPECS.MAX_TRADE) throw "Cannot trade over " + SPECS.MAX_TRADE + " in a given turn.";

        return this._bc_action('trade', {
            trade_fuel: fuel,
            trade_karbonite: karbonite
        });
    }

    buildUnit(unit, dx, dy) {
        if (this.me.unit !== SPECS.PILGRIM && this.me.unit !== SPECS.CASTLE && this.me.unit !== SPECS.CHURCH) throw "This unit type cannot build.";
        if (this.me.unit === SPECS.PILGRIM && unit !== SPECS.CHURCH) throw "Pilgrims can only build churches.";
        if (this.me.unit !== SPECS.PILGRIM && unit === SPECS.CHURCH) throw "Only pilgrims can build churches.";
        
        if (!Number.isInteger(dx) || !Number.isInteger(dx) || dx < -1 || dy < -1 || dx > 1 || dy > 1) throw "Can only build in adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't build units off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] > 0) throw "Cannot build on occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot build onto impassable terrain.";
        if (this.karbonite < SPECS.UNITS[unit].CONSTRUCTION_KARBONITE || this.fuel < SPECS.UNITS[unit].CONSTRUCTION_FUEL) throw "Cannot afford to build specified unit.";

        return this._bc_action('build', {
            dx: dx, dy: dy,
            build_unit: unit
        });
    }

    move(dx, dy) {
        if (this.me.unit === SPECS.CASTLE || this.me.unit === SPECS.CHURCH) throw "Churches and Castles cannot move.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't move off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot move outside of vision range.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] !== 0) throw "Cannot move onto occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot move onto impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);  // Squared radius
        if (r > SPECS.UNITS[this.me.unit]['SPEED']) throw "Slow down, cowboy.  Tried to move faster than unit can.";
        if (this.fuel < r*SPECS.UNITS[this.me.unit]['FUEL_PER_MOVE']) throw "Not enough fuel to move at given speed.";

        return this._bc_action('move', {
            dx: dx, dy: dy
        });
    }

    mine() {
        if (this.me.unit !== SPECS.PILGRIM) throw "Only Pilgrims can mine.";
        if (this.fuel < SPECS.MINE_FUEL_COST) throw "Not enough fuel to mine.";
        
        if (this.karbonite_map[this.me.y][this.me.x]) {
            if (this.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) throw "Cannot mine, as at karbonite capacity.";
        } else if (this.fuel_map[this.me.y][this.me.x]) {
            if (this.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) throw "Cannot mine, as at fuel capacity.";
        } else throw "Cannot mine square without fuel or karbonite.";

        return this._bc_action('mine');
    }

    give(dx, dy, karbonite, fuel) {
        if (dx > 1 || dx < -1 || dy > 1 || dy < -1 || (dx === 0 && dy === 0)) throw "Can only give to adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't give off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] <= 0) throw "Cannot give to empty square.";
        if (karbonite < 0 || fuel < 0 || this.me.karbonite < karbonite || this.me.fuel < fuel) throw "Do not have specified amount to give.";

        return this._bc_action('give', {
            dx:dx, dy:dy,
            give_karbonite:karbonite,
            give_fuel:fuel
        });
    }

    attack(dx, dy) {
        if (this.me.unit !== SPECS.CRUSADER && this.me.unit !== SPECS.PREACHER && this.me.unit !== SPECS.PROPHET) throw "Given unit cannot attack.";
        if (this.fuel < SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) throw "Not enough fuel to attack.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't attack off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot attack outside of vision range.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot attack impassable terrain.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === 0) throw "Cannot attack empty tile.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);
        if (r > SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][1] || r < SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][0]) throw "Cannot attack outside of attack range.";

        return this._bc_action('attack', {
            dx:dx, dy:dy
        });
        
    }


    // Get robot of a given ID
    getRobot(id) {
        if (id <= 0) return null;
        for (var i=0; i<this._bc_game_state.visible.length; i++) {
            if (this._bc_game_state.visible[i].id === id) {
                return insulate(this._bc_game_state.visible[i]);
            }
        } return null;
    }

    // Check if a given robot is visible.
    isVisible(robot) {
        return ('x' in robot);
    }

    // Check if a given robot is sending you radio.
    isRadioing(robot) {
        return robot.signal >= 0;
    }

    // Get map of visible robot IDs.
    getVisibleRobotMap() {
        return this._bc_game_state.shadow;
    }

    // Get boolean map of passable terrain.
    getPassableMap() {
        return this.map;
    }

    // Get boolean map of karbonite points.
    getKarboniteMap() {
        return this.karbonite_map;
    }

    // Get boolean map of impassable terrain.
    getFuelMap() {
        return this.fuel_map;
    }

    // Get a list of robots visible to you.
    getVisibleRobots() {
        return this._bc_game_state.visible;
    }

    turn() {
        return null;
    }
}

//all variables
var alldirs = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

//castle variables
var pilgrimcount = 0;

//pilgrim variables
var karblocation = null;
var builtchurch = false;
var churchloc = null;
var castleloc = null;
var dict = {};

class MyRobot extends BCAbstractRobot {

    canBuild(unit) {
        return this.fuel > SPECS.UNITS[unit].CONSTRUCTION_FUEL && this.fuel > SPECS.UNITS[unit].CONSTRUCTION_KARBONITE;
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
        if (!(this.hash(...dest) in dict)) {
            //run bfs
            var queue = [];
            queue.push(this.hash(...dest));
            // visited.push(this.hash(...dest));
            var y = this.map.length;
            var x = this.map[0].length;
            var distancetodest = this.createarr(x, y);
            distancetodest[dest[0]][dest[1]] = 0;
            while (queue.length != 0) {
                var cur = this.unhash(queue.shift());
                for (var i = 0; i < alldirs.length; i++) {
                    var nextloc = [cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]];
                    if (this._bc_check_on_map(...nextloc) && this.map[nextloc[1]][nextloc[0]] == true) {
                        if (distancetodest[nextloc[0]][nextloc[1]] == undefined) {
                        // if (!(visited.includes(this.hash(...nextloc)))) {
                            queue.push(this.hash(...nextloc));
                            // visited.push(this.hash(...nextloc));
                            distancetodest[nextloc[0]][nextloc[1]] = distancetodest[cur[0]][cur[1]] + 1;
                        }
                    }
                }
            }

            dict[this.hash(...dest)] = distancetodest;
            return this.moveto(dest);
        } else {
            var moveoff = [0, 0];
            var smallest = null;
            var smallestdir = null;
            var distancetodest = dict[this.hash(...dest)];
            var moveradius = SPECS.UNITS[this.me.unit].SPEED;

            do {
                smallest = 99999999999;
                smallestdir = null;
                for (var i = 0; i < alldirs.length; i++) {
                    var nextloc = [this.me.x + moveoff[0] + alldirs[i][0], this.me.y + moveoff[1] + alldirs[i][1]];
                    if (distancetodest[nextloc[0]][nextloc[1]] != undefined) {
                        var tempdist = distancetodest[nextloc[0]][nextloc[1]];
                        if (tempdist < smallest && this.getVisibleRobotMap()[nextloc[1]][nextloc[0]] <= 0) {
                            smallest = tempdist;
                            smallestdir = alldirs[i];
                        }
                    }
                }
                moveoff[0] += smallestdir[0];
                moveoff[1] += smallestdir[1];
            } while (this.distance(moveoff, [0, 0]) <= moveradius);

            moveoff[0] -= smallestdir[0];
            moveoff[1] -= smallestdir[1];

            this.log("MOVING");
            this.log([this.me.x, this.me.y]);
            this.log(moveoff);
            return this.move(moveoff[0], moveoff[1]);
        }
    }

    turn() {

        if (this.me.unit == SPECS.CASTLE) {
            return this.runCastle();
        } else if (this.me.unit == SPECS.PILGRIM) {
            return this.runPilgrim();
        }

    }

    runPilgrim() {
        if (castleloc == null) {
            //find the castle i was spawned from
            var tempmap = this.getVisibleRobotMap();
            for (var i = 0; i < alldirs.length; i++) {
                var tempid = tempmap[this.me.y + alldirs[i][1]][this.me.x + alldirs[i][0]];
                if (tempid > 0) {
                    var robottype = this.getRobot(tempid);
                    if (robottype == SPECS.CASTLE) {
                        castleloc = [this.me.x + alldirs[i][0]][this.me.y + alldirs[i][1]];
                        break;
                    }
                }
            }
        }

        if (karblocation == null) {
            //find closest karbonite
            var queue = [];
            var visited = [];
            queue.push([this.me.x, this.me.y]);
            visited.push(this.hash(this.me.x, this.me.y));
            while (queue.length != 0) {
                var cur = queue.shift();
                if (this.karbonite_map[cur[1]][cur[0]] == true) {
                    karblocation = cur;
                    this.log("FOUND KARBONITE");
                    this.log(cur);
                    break;
                }
                for (var i = 0; i < alldirs.length; i++) {
                    var nextloc = [cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]];
                    if (this._bc_check_on_map(...nextloc) && visited.includes(this.hash(...nextloc)) == false) {
                        queue.push([cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]]);
                        visited.push(this.hash(cur[0] + alldirs[i][0], cur[1] + alldirs[i][1]));
                    }
                }
            }
        }

        if (builtchurch == false) {
            // i didn't build a church yet
            if (this.canBuild(SPECS.CHURCH)) {
                //i have enough resources to build a church

                if (this.me.x != karblocation[0] || this.me.y != karblocation[1]) {
                    //move to karbonite location
                    return this.moveto(karblocation);
                } else {
                    this.log("TRY BUILDING CHURCH");
                    //build church
                    var robotsnear = this.getVisibleRobotMap();

                    for (var i = 0; i < alldirs.length; i++) {
                        var nextloc = [this.me.y + alldirs[i][1], this.me.x + alldirs[i][0]];
                        if (robotsnear[nextloc[1]][nextloc[0]] <= 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                            builtchurch = true;
                            this.log("BUILD FUCKING CHURCH");
                            churchloc = [alldirs[i][0] + this.me.x, alldirs[i][1] + this.me.y];
                            this.log(churchloc);
                            return this.buildUnit(SPECS.CHURCH, alldirs[i][0], alldirs[i][1]);
                        }
                    }
                }
                
            } else {
                //fucking mine then move back to the castle so i get enough resources to build the shit...

                if (this.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
                    //i didn't finish mining yet
                    if (this.me.x != karblocation[0] || this.me.y != karblocation[1]) {
                        //move to karbonite
                        this.log("HEADING TOWARDS KARBONITE TO MINE FOR CASTLE");
                        return this.moveto(karblocation);
                    } else {
                        this.log("MINING FOR CASTLE");
                        return this.mine();
                    }
                } else {
                    //i gots the drugs, now move to castle and give drugs
                    if (this.adjacent([this.me.x, this.me.y], castleloc)) {
                        this.log("GIVING TO CASTLE");
                        return this.give(castleloc[0] - this.me.x, castleloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
                    } else {
                        this.log("MOVING BACK TO CASTLE TO GIVE DRUGS");
                        return this.moveto(castleloc);
                    }
                }
            }
        } else {
            if (this.adjacent([this.me.x, this.me.y], karblocation)) {
                //mine shit
                if (this.me.karbonite < SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) {
                    this.log("FUCKING MINE");
                    return this.mine();
                } else {
                    this.log("GIVE CHURCH KARB SHIT");
                    this.log(churchloc);
                    this.log(this.me.x);
                    this.log(this.me.y);
                    return this.give(churchloc[0] - this.me.x, churchloc[1] - this.me.y, this.me.karbonite, this.me.fuel);
                }
            } else {
                return this.moveto(karblocation);
            }
            
        }
    }

    runCastle() {
        if (this.canBuild(SPECS.PILGRIM) && pilgrimcount < 1) {
            //can produce pilgrim
            var robotsnear = this.getVisibleRobotMap();
            for (var i = 0; i < alldirs.length; i++) {
                var nextloc = [this.me.x + alldirs[i][0], this.me.y + alldirs[i][1]];
                if (robotsnear[nextloc[1]][nextloc[0]] == 0 && this.map[nextloc[1]][nextloc[0]] == true) {
                    this.log("Created pilgrim");
                    pilgrimcount++;
                    return this.buildUnit(SPECS.PILGRIM, alldirs[i][0], alldirs[i][1]);
                }
            }
        }
    }
}

var robot = new MyRobot();
var robot = new MyRobot();
