import {BCAbstractRobot, SPECS} from 'battlecode';
import { Crusader } from 'crusader.js'
import { Castle } from 'castle.js'
import { Church } from 'church.js'
import { Pilgrim } from 'pilgrim.js'
import { Prophet } from 'prophet.js'
import { Preacher } from 'preacher.js'

var built = false;
var step = -1;

class MyRobot extends BCAbstractRobot {
    turn() {
        step++;
        this.step = step;

        if (this.me.unit === SPECS.CRUSADER) {
            return Crusader.call(this);
        }
        else if (this.me.unit === SPECS.CASTLE) {
            return Castle.call(this);
        }
        else if (this.me.unit === SPECS.CHURCH) {
            return Church.call(this);
        }
        else if (this.me.unit === SPECS.PILGRIM) {
            return Pilgrim.call(this);
        }
        else if (this.me.unit === SPECS.PROPHET) {
            return Prophet.call(this);
        }
        else if (this.me.unit === SPECS.PREACHER) {
            return Preacher.call(this);
        }
    }
}

var robot = new MyRobot();
