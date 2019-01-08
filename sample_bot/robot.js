import {BCAbstractRobot, SPECS} from 'battlecode';

var built = false;
var step = -1;

class MyRobot extends BCAbstractRobot {
    turn() {
        step++;

        switch(this.me.unit) {
            case SPECS.CRUSADER:
                // this.log("Crusader health: " + this.me.health);
                const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
                const choice = choices[Math.floor(Math.random()*choices.length)];
                return this.move(...choice);
                break;
          
            case SPECS.CASTLE:
                if (step % 10 === 0) {
                    //this.log("Building a crusader at " + (this.me.x+1) + ", " + (this.me.y+1));
                    return this.buildUnit(SPECS.CRUSADER, 1, 1);
                } else {
                    return // this.log("Castle health: " + this.me.health);
                }
                break;

            case SPECS.CHURCH:
                break;

            case SPECS.PROPHET:
                break;

            case SPECS.PREACHER:
                break;

            case SPECS.PILGRIM:
                break;
          
            default:
                // code block
                this.log("hackerman!!!");
        }

    }
}

var robot = new MyRobot();