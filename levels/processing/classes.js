const DARKGREY = 'rgb(64, 64, 64)';

class PipeParticle {
  constructor(y, dx, dy, size) {
    var x = 0;

    this.rect = new Rect(x, y, size, size);
    this.toBeRemoved = false;
    this.toBeRemovedOffscreen = false;

    this.dx = dx;
    this.dy = dy;
  }

  move(dTime) {
    var speed = this.dx;

    if (usingUpgrade(0)) {
      // Increases speed by 25%
      speed += this.dx * 0.25;
    }
    if (usingUpgrade(1)) {
      // Increases speed by 50%
      speed += this.dx * 0.5;
    }
    if (usingUpgrade(2)) {
      // Increases speed by 100%
      speed += this.dx;
    }

    this.rect.x += speed * dTime;
    this.rect.y += this.dy * dTime;

    // Bounce off sides of conveyor belt
    if ((this.rect.y < CONVEYOR_BELT.innerRect.y && this.dy < 0) ||
       this.rect.bottom() > CONVEYOR_BELT.innerRect.bottom() && this.dy > 0) {
      this.dy *= -1;
    }

    // Keep in pipes
    if (this.rect.y < CONVEYOR_BELT.innerRect.y) {  // Top
      this.rect.y = CONVEYOR_BELT.innerRect.y;
    } else if (this.rect.bottom() > CONVEYOR_BELT.innerRect.bottom()) { //Bottom
      this.rect.setBottom(CONVEYOR_BELT.innerRect.bottom());
    }

    // Remove salts off screen
    if (this.rect.x > w) { //Right of screen
      this.toBeRemoved = true;
      this.toBeRemovedOffscreen = true;
    }
  }

  draw() {
    // An unintentional bug became a feature here
    ctx.globalAlpha = 0.8;
    this.rect.drawSphere(ctx.fillStyle);
    ctx.globalAlpha = 1;
  }
}

class Salt extends PipeParticle {
  constructor(y, dx, dy) {
    var size = BALL_SIZE;
    super(y, dx, dy, size);
  }

  draw() {
    ctx.fillStyle = 'orange';
    super.draw();
  }
}

class SaltWaste extends PipeParticle {
  constructor(countBoughtUpgrades) {
    var dx = (Math.random() * 3 + 0.5) * 50 / 3;
    var dy = randUniform(-50/3, 50/3);

    var y = randint(CONVEYOR_BELT.innerRect.y,
                    CONVEYOR_BELT.innerRect.bottom() - BALL_SIZE * 2);

    var size = BALL_SIZE * 2;
    super(y, dx, dy, size);

    // Get id
    var usedIDs = [];
    for (var radioactiveSalt of radioactiveSalts) {
      usedIDs.push(radioactiveSalt.id);
    }

    // Loop through numbers 0 to infinity trying ID numbers
    var desiredID = 0;
    while(true) {  // The only while loop in the entire game
      // Check all salts if ID is used
      if (!usedIDs.includes(desiredID)) {
        break;
      }

      desiredID++;
    }

    this.id = desiredID;

    if (countBoughtUpgrades() < 2) {
      var tempID = 0;
    } else if (countBoughtUpgrades() < 5) {
      var tempID = randint(0, 1);
    } else {
      var tempID = randint(0, 2);
    }

    var queueLength;

    if (tempID == 0) {
      this.saltType = 'Oxide';
      queueLength = 4;
    } else if (tempID == 1) {
      this.saltType = 'Sulphur';
      queueLength = 5;
    } else if (tempID == 2) {
      this.saltType = 'Metal Impurities';
      queueLength = 6;
    }

    //Generate puzzle
    this.queue = [];
    for (var i = 0; i < queueLength; i++) {
      this.queue.push(randint(0, 3));
    }
  }

  draw() {
    if (this.purified) {
      ctx.fillStyle = 'green';
    } else if (this.id == Proc_Puzzle.saltID) {
      ctx.fillStyle = 'yellow';
    } else {
      if (this.saltType == 'Oxide') {
        ctx.fillStyle = 'lightblue';
      } else if (this.saltType == 'Sulphur') {
        ctx.fillStyle = 'red';
      } else if (this.saltType == 'Metal Impurities') {
        ctx.fillStyle = 'grey';
      } else {
        console.error('Unexpected salt type.');
      }
    }

    super.draw();
  }

  payProcessing(levelIncome) {
    if (this.saltType == 'Oxide') {
      levelIncome.Processing += randint(1000, 1400);
    } else if (this.saltType == 'Sulphur') {
      levelIncome.Processing += randint(1500, 2000);
    } else if (this.saltType == 'Metal Impurities') {
      levelIncome.Processing += randint(2000, 2500);
    } else {
      console.error('Salt type error - ' + this.saltType)
    }
  }
}

class ConveyorBelt {
  constructor(w, h) {
    this.outerRect = new Rect(0, h - 300, w, 100);
    this.innerRect = new Rect(0, h - 285, w, 70);
  }

  draw() {
    ctx.fillStyle = 'white';
    this.outerRect.draw();
    ctx.fillStyle = DARKGREY;
    this.innerRect.draw();
  }
}

var saltParticles; //Used in the same way as the balls array
var radioactiveSalts;

const PROCESSING_TILE_SIZE = 200;
const PROCESSING_TILE_TOTAL_SIZE = PROCESSING_TILE_SIZE * 2;

class Processing_tile {
  constructor(x, y, colour, PROCESSING_TILE_SIZE, PROCESSING_TILE_YOFFSET) {
    var totalWidth = PROCESSING_TILE_SIZE * 2;
    var xOffset = w / 2 - totalWidth / 2;
    this.rect = new Rect(xOffset + x * PROCESSING_TILE_SIZE,
                         PROCESSING_TILE_YOFFSET + y * PROCESSING_TILE_SIZE,
                         PROCESSING_TILE_SIZE, PROCESSING_TILE_SIZE);
    this.colour = colour;
  }

	draw() {
		ctx.fillStyle = this.colour;
		this.rect.draw();
	}
}

class ProcessingRobot { // Max is the number of robots in a tier
    constructor(x, CONVEYOR_BELT) {
      const PROCESSING_ROBOT_SIZE = 64;
      this.rect = new Rect(x - PROCESSING_ROBOT_SIZE / 2,
                           CONVEYOR_BELT.outerRect.bottom(),
                           PROCESSING_ROBOT_SIZE,
                           PROCESSING_ROBOT_SIZE);

      const BAR_WIDTH = PROCESSING_ROBOT_SIZE / 4;
      const BAR_HEIGHT = PROCESSING_ROBOT_SIZE * 0.8;
      this.barRect = new Rect(this.rect.centerx() - BAR_WIDTH / 2,
                              this.rect.centery() - BAR_HEIGHT / 2,
                              BAR_WIDTH, BAR_HEIGHT);

      this.busy = false;
      this.busyTimer = 0;
    }

  draw(usingUpgrade) {
    ctx.fillStyle = 'grey';
    this.rect.draw();

    if (this.busy) {
      ctx.fillStyle = DARKGREY;
    } else {
      ctx.fillStyle = 'green';
    }

    this.barRect.draw();

    if (this.busy) {
      var height = Math.round((this.busyTimer / this.getProcessingTime(usingUpgrade)) * this.barRect.height);
      ctx.fillStyle = 'red';
      ctx.fillRect(this.barRect.x, this.barRect.bottom() - height,
                   this.barRect.width, height);
    }
  }

  update(radioactiveSalts, Proc_Puzzle, levelIncome, usingUpgrade, dTime) {
    if (this.busy) {
      if (this.start) {
        this.busyTimer -= dTime;

        if (this.busyTimer <= 0) {
          // Pay user for having waste processed
          this.containedSalt.payProcessing(levelIncome);
          this.busy = false;
          this.containedSalt = null;
        } else if (this.busyTimer > this.getProcessingTime(usingUpgrade)) {
          // If player buys upgrade which decreases processing time,
          // lower current processing time
          this.busyTimer = this.getProcessingTime(usingUpgrade);
        }
      } else {
        this.containedSalt.draw();
        this.containedSalt.rect.y += this.getIntakeSpeed(usingUpgrade) * dTime;

        if (this.containedSalt.rect.y > this.rect.y) {
          this.start = true;
        }
      }
    } else {
      for (var i = 0; i < radioactiveSalts.length; i++) {
        //Don't try to absorb salt if selected or already pure
        if (radioactiveSalts[i].purified ||
          radioactiveSalts[i].id == Proc_Puzzle.saltID) {
          continue;
        }

        //Check if robot can absorb waste
        //Salt is to left of robot's left and salt's right is left of robot's right
        if (radioactiveSalts[i].rect.x > this.rect.x &&
          radioactiveSalts[i].rect.right() < this.rect.right()) {

          this.containedSalt = radioactiveSalts[i];
          radioactiveSalts.splice(i, 1);

          this.busy = true;
          this.start = false;
          this.busyTimer = this.getProcessingTime(usingUpgrade);
          break;
        }
      }
    }
  }

  getIntakeSpeed(usingUpgrade) {
    // Player has final upgrade, processing time of 5 seconds
    if (usingUpgrade(8)) {
      return 300;
    } else if (usingUpgrade(7)) {
      return 150;
    } else if (usingUpgrade(6)) {
      return 100;
    } else {
      return 50;
    }
  }

  getProcessingTime(usingUpgrade) {
    // Player has final upgrade, processing time of 5 seconds
    if (usingUpgrade(8)) {
      return 8;
    } else if (usingUpgrade(7)) {
      return 16;
    } else if (usingUpgrade(6)) {
      return 24;
    } else {
      return 30;
    }
  }
}


class ProcessingRobots {
	constructor(w, CONVEYOR_BELT) {
		this.tierOne = [];
		this.tierOne.push(new ProcessingRobot(w * 2/7, CONVEYOR_BELT));
		this.tierOne.push(new ProcessingRobot(w * 5/7, CONVEYOR_BELT));

		this.tierTwo = [];
		this.tierTwo.push(new ProcessingRobot(w * 1/7, CONVEYOR_BELT));
		this.tierTwo.push(new ProcessingRobot(w * 6/7, CONVEYOR_BELT));

		this.tierThree = [];
		this.tierThree.push(new ProcessingRobot(w * 3/7, CONVEYOR_BELT));
		this.tierThree.push(new ProcessingRobot(w * 4/7, CONVEYOR_BELT));
	}

	manageRobots(radioactiveSalts, Proc_Puzzle, levelIncome, usingUpgrade, dTime) {
		// If player has robot upgrade
		if (usingUpgrade(3)) {
			for (var robot of this.tierOne) {
				robot.update(radioactiveSalts, Proc_Puzzle, levelIncome, usingUpgrade, dTime)
				robot.draw(usingUpgrade);
			}
		}

		if (usingUpgrade(4)) {
			for (var robot of this.tierTwo) {
				robot.update(radioactiveSalts, Proc_Puzzle, levelIncome, usingUpgrade, dTime)
				robot.draw(usingUpgrade);
			}
		}

		if (usingUpgrade(5)) {
			for (var robot of this.tierThree) {
				robot.update(radioactiveSalts, Proc_Puzzle, levelIncome, usingUpgrade, dTime)
				robot.draw(usingUpgrade);
			}
		}
	}
}
