function Processing_createNewFluid(dTime, usingUpgrade) {
	var dx;
	var dy;
	var y;

	// Randomly create harmless non-interactive fluid particles (Salt objects)
	dx = (Math.random() * 8 + 2.5) * 50 / 3;
	dy = randUniform(-50/3, 50/3);

	y = randint(CONVEYOR_BELT.innerRect.y, CONVEYOR_BELT.innerRect.bottom() - BALL_SIZE);

  // Fluid particles occur semi-frequently
	if (randDChance(3 / 50, dTime)) {
		saltParticles.push(new Salt(y, dx, dy));
	}

	var chance = 12;
	if (usingUpgrade(2)) {
		chance = 5;
	} else if (usingUpgrade(1)) {
		chance = 7.5;
	} else if (usingUpgrade(0)) {
		chance = 10;
	}

	var saltWastePresent = false;
	for (var radioactiveSalt of radioactiveSalts) {
    if (!radioactiveSalt.purified) {
      saltWastePresent = true;
      break;
    }
	}

	//When there are no radioactive salts, increase chance of generation by 1000%
	var multipliedChance = chance / 10;
	if ((saltWastePresent && randDChance(chance, dTime)) ||

	    (!saltWastePresent && randDChance(multipliedChance, dTime))) {

		//Randomly create interactive fluid particles (SaltWaste objects)
		radioactiveSalts.push(new SaltWaste(countBoughtUpgrades));
	}
}

function processingInit(w, h) {
  CONVEYOR_BELT = new ConveyorBelt(w, h);
  PROCESSING_TILE_YOFFSET = (CONVEYOR_BELT.outerRect.y - PROCESSING_TILE_TOTAL_SIZE) / 2;
	processingBots = new ProcessingRobots(w, CONVEYOR_BELT);

  processingTiles = [];

  var i = 0;
  for (var y = 0; y < 2; y++) {
    for (var x = 0; x < 2; x++) {
      let colour = PROCESSING_TILE_COLOURS[i];
      i++;
      processingTiles.push(new Processing_tile(x, y, colour, PROCESSING_TILE_SIZE, PROCESSING_TILE_YOFFSET));
    }
  }

  PROCESSING_TILE_OUTLINE = new Rect(processingTiles[0].rect.x - 10,
                                     processingTiles[0].rect.y - 10,
                                     PROCESSING_TILE_TOTAL_SIZE + 20,
                                     PROCESSING_TILE_TOTAL_SIZE + 20);
}

var Proc_Puzzle;

var tritiumUpgradeRequired;

var processingTiles;
const PROCESSING_TILE_COLOURS = ['red', 'green', 'blue', 'yellow'];

var PROCESSING_TILE_OUTLINE;

function resetProcessingPuzzle() {
  Proc_Puzzle = {};
  Proc_Puzzle.visible = false;
  Proc_Puzzle.saltId = null; // ID of selected salt
  // Timer keeping track of fading for individual cell
  Proc_Puzzle.cellDisplayTimer = 1;
  // Countdown for when to start showing the sequence
  Proc_Puzzle.startDisplayTimer = 2;
  Proc_Puzzle.displayCurrentID = 0;
  Proc_Puzzle.displayFinished = false;
  Proc_Puzzle.clickedQueue = [];

  Proc_Puzzle.getMaxDisplayTime = function() {
    if (usingUpgrade(2)) {
      return 0.4;
    } else if (usingUpgrade(1)) {
      return 0.6;
    } else if (usingUpgrade(0)) {
      return 0.8;
    } else {
      return 1;
    }
  }
}

function findRSaltIndex() {
	if (radioactiveSalts.length == 0) console.error('no salt');
	for (var i = 0; i < radioactiveSalts.length; i++) {
		if (radioactiveSalts[i].id == Proc_Puzzle.saltID) {
			return i;
		}
	}
}
