import {BCAbstractRobot, SPECS} from 'battlecode';

var built = false;
var step = -1;

class MyRobot extends BCAbstractRobot {
    turn() {
        step++;

        switch(this.me.unit) {
          
            case SPECS.CASTLE:
                if (step % 10 === 0) {
                    //this.log("Building a crusader at " + (this.me.x+1) + ", " + (this.me.y+1));
                    var sice = this.buildUnit(SPECS.CRUSADER, 1, 1);
                    if (sice != null) {
                        this.signal(1111, 5);
                        return sice;
                    }
                } else {
                    return // this.log("Castle health: " + this.me.health);
                }
                break;

            default:
                this.log("L");
        }

    }
}

var robot = new MyRobot();