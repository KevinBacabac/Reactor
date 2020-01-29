var allBoughtUpgrades = {};
var usingBoughtUpgrade = {};

function usingUpgrade(i) {
  return (hasUpgrade(i)
          && usingBoughtUpgrade[getGameString()][i]);
}

function hasUpgrade(i) {
  return allBoughtUpgrades[getGameString()].includes(i);
}

function hasAllUpgrades() {
  for (var i = 0; i < 9; i++) {
    if (!hasUpgrade(i)) {
      return false
    }
  }

  return true;
}

function countBoughtUpgrades() {
  var numberOfUpgrades = 0;
  var id;

  for (var i = 0; i < 9; i++) {
    if (hasUpgrade(i)) {
      numberOfUpgrades++;
    }
  }
  return numberOfUpgrades;
}

function getGameString() {
	if (screen == 'Upgrade' || screen == 'Globe') {
		return currentGame;
	} else {
		return screen;
	}
}
