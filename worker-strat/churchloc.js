import {SPECS} from 'battlecode';
import {alldirs, range10} from 'constants.js'

export var getLocs = function() {

    var compound_map = Array(this.map.length).fill().map(() => Array(this.map[0].length));
    for (var i=0; i<this.map[0].length; i++) {
        for (var j=0; j<this.map.length; j++) {
            if (this.karbonite_map[j][i] || this.fuel_map[j][i]) {
                // farther away squares
                for (var k = 0; k < range10.length; k++) {
                    const tempx = i+range10[k][0];
                    const tempy = j+range10[k][1];
                    if (this.validCoords([tempx, tempy])) {
                        if (compound_map[tempx][tempy] == null) {
                            compound_map[tempx][tempy] = 0;
                        }
                        if (this.map[tempy][tempx] &&
                            !this.karbonite_map[tempy][tempx] && !this.fuel_map[tempy][tempx]) {
                               compound_map[tempx][tempy] += 10 - this.distance([0, 0], range10[k]);
                        }
                    }
                    
                }
                /*
                //immediately adjacent squares - worth more!
                for (var k = 0; k < alldirs.length; k++) {
                    const tempx = i+alldirs[k][0];
                    const tempy = j+alldirs[k][1];
                    if (this.validCoords([tempx, tempy])) {
                        if (compound_map[tempx][tempy] == null) {
                            compound_map[tempx][tempy] = 0;
                        }
                        if (this.map[tempy][tempx] &&
                            !this.karbonite_map[tempy][tempx]  && !this.fuel_map[tempy][tempx]) {
                            compound_map[tempx][tempy] += 3;
                        }
                    }
                    
                }*/

            }
        }
    }

    return compound_map;
}
