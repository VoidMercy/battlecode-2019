import {SPECS} from 'battlecode';
import {alldirs, range10exceptalldirs} from 'constants.js'


export var getLocs = function() {

    let compound_map = Array(this.map.length).fill().map(() => Array(this.map[0].length));
    for (var i=0; i<this.map.length; i++) {
        for (var j=0; j<this.map[0].length; j++) {
            if (this.karbonite_map[i][j] || this.fuel_map[i][j]) {
                // farther away squares
                for (var k in range10exceptalldirs) {
                    const tempx = i-k[0];
                    const tempy = j-k[1];
                    if (this.validCoords([tempx, tempy]) && this.map[tempy][tempx] &&
                     !this.karbonite_map[i][j]  && !this.fuel_map[i][j]) {
                        compound_map[tempx][tempy] += 3;
                    }
                }

                //immediately adjacent squares - worth more!
                for (var k in alldirs) {
                    const tempx = i-k[0];
                    const tempy = j-k[1];
                    if (this.validCoords([tempx, tempy]) && this.map[tempy][tempx] &&
                     !this.karbonite_map[i][j]  && !this.fuel_map[i][j]) {
                        compound_map[tempx][tempy] += 10;
                    }
                }

            }
        }
    }

    return compound_map;
}
