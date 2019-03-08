//This uses ES6
$(document).ready(function(){
	document.body.onmousedown = function() { return false; } //unselectable page
	
	//Canvas setup
	var canvas = $("#canvas")[0];
	var ctx = canvas.getContext("2d", { alpha: false });
	initializeLib(ctx);
	const w = $("#canvas").width();
	const h = $("#canvas").height();
	var mx, my;
	
	//Neutron canvas
	var debugging = false;
	
	//Used by reactor
	var coreBalls;
	const BALL_SIZE = 8;
	
	var screen;
	var pastScreens;
	var currentGame;
	
	var paused = false;
	var showInstructions = false;
	var text; //Temp variable used for GUI
	var upgradeProgress;
	var lostGame = false;
	
	var levelIncome;
	
	var allBoughtUpgrades = {};
	var initialized = {};
	
	function returnBoughtUpgradeArray(){
		var upgradeArray = [];
		
		for (var i = 0; i < 9; i++){
			upgradeArray.push(true);
		}
		
		return upgradeArray;
	}
	
	var usingBoughtUpgrade = {};
	usingBoughtUpgrade['Core'] = returnBoughtUpgradeArray();
	
	//Constants here
	const MINIGAME_SCREENS = ['Core', 'Shielding', 'Processing', 'Corrosion', 'Turbine'];
	const ENDINGS = ['Ending - Time Out', 'Ending - Core', 'Ending - Shielding',
	                 'Ending - Processing', 'Ending - Corrosion'];
	const MENU_SCREENS = ['Main Menu', 'Factory Menu'];
	const SCREEN_BORDER = 5;
	const INFO_HEIGHT = 120; //Height of info screen at the bottom
	const MAIN_SCREEN_HEIGHT = h - INFO_HEIGHT;
	const DARKGREY = 'rgb(64, 64, 64)';
	
	var iWidth = w * 1/2; //iVariables only used to define
	var iHeight = MAIN_SCREEN_HEIGHT * 0.7;
	
	var instructionRect = new Rect(w / 2 - iWidth / 2, MAIN_SCREEN_HEIGHT / 2 - iHeight / 2 - 30,
								   iWidth, iHeight);
	
	const MUSIC_VOLUME = 0.3;
    
	var coreMusic = addLoopMusic('music/The Complex.ogg');
	var shieldingMusic = addLoopMusic('music/Pamgaea.ogg');
	var radiationSound = addLoopMusic('music/Core_radiation.ogg');
	var menuMusic = addLoopMusic('music/Industrial Revolution.ogg');
	var endMusic = addLoopMusic('music/The Machine Thinks.ogg', false); //Isn't set to play initially on its own
	endMusic.volume = 1;
	
	var processingMusic = addLoopMusic('music/Perspectives.ogg');
    var corrosionMusic = addLoopMusic('music/One Sly Move.ogg');
    var forebodingMusic = addLoopMusic('music/Lightless Dawn.mp3');
    
     //Some solemn music
    var finalMusic = addLoopMusic('music/Industrial Music Box.ogg'); 
	
	//GUI
	var factoryLayoutImage = new Image();
	factoryLayoutImage.src = 'Molten_Salt_Reactor.svg';

    const unlockUpgrade = new Audio('sound/gui/UnlockUpgrade.ogg');
    const upgradeButtonSound = new Audio('sound/gui/UpgradeButton.ogg');
    const clickButton = new Audio('sound/gui/Menu.ogg');
    const useUpgrade = new Audio('sound/gui/UseUpgrade.ogg');
    const errorSound = new Audio('sound/gui/Error.ogg');

	//Options
	var soundOn = true;
	var musicOn = true;
	var explosionsOn = true;
	var blurNeutrons = true;
	
	//Reactor
	var coreHealth;
	var coreTemperature;
	var leftNeutronsReleased = 0;
	var rightNeutronsReleased = 0;

	class FactoryButton extends SmallButton {
	    constructor(x, y, width, height, level, text){
	        super(x, y, width, height, text);
	        this.level = level;
	    }
		
		//Overrides Button class to set colour of button
		getColour(){
			//If level is not unlocked (red)
			if (unlockedLevels.includes(this.level)){
				return 'green';
			} else { //If unlocked
				return 'red';
			}
		}
		
		draw(){
		    //If unlocked, underline
		    this.underline = unlockedLevels.includes(this.level);
		    super.draw();
		}
	}

	class MaintenanceButton extends SmallButton {
	    constructor(x, y, width, height, cost, priorLevel, nextLevel){
            //'' means button shows no text
            super(x, y, width, height, '');
            
            this.payable = false;
            this.paid = false;
            
            this.cost = cost;
            this.priorLevel = priorLevel;
            this.nextLevel = nextLevel;
	    }
		
		getColour(){
			if (!this.payable){ //Unpayable - no reason to click so grey button
				return 'white';
			} else if (!this.paid){ //Can be paid
				return 'red';
			} else if (this.paid){ //
				return 'green';
			} else {
				prompt('Maintenance Button Error.');
			}
		}
		
		click(){
		    if (this.rect.mouseOver()){
		        if ((this.payable &&
		             !this.paid &&
		             levelIncome[this.priorLevel] >= this.cost) ||
		             debugging){
		            
        	        levelIncome[this.priorLevel] -= this.cost;
        	        this.paid = true;
        	        unlockLevel(this.nextLevel);
        	        playSound(clickButton);
        	    } else {
        	        playSound(errorSound);
        	    }
        	}
		}
	}
	
	function getBarCoords(xPos, yPos){
		var obj = {};
		
	    if (yPos == 'Up'){
	        obj.y = h - INFO_HEIGHT * 0.95;
	    } else if (yPos == 'Down'){
	        obj.y = h - INFO_HEIGHT * 0.5;
	    }
	    
	    if (xPos == 'Left'){
	        obj.x = w * 0.05
	    } else if (xPos == 'Right'){
	        obj.x = w * 0.65
	    }
	    
		return obj;
	}
	
	const barW = w * 0.3;
	const barH = INFO_HEIGHT * 0.4;
	
	class BottomBar {
	    constructor(xPos, yPos, colour, text){
            //Temp variables
            var obj = getBarCoords(xPos, yPos);
            var x = obj.x;
            var y = obj.y;
            
            //Permanent variables
            this.outerRect = new Rect(x, y, barW, barH);
            this.innerRect = new Rect(this.outerRect.x + 10,
                                      this.outerRect.y + 20,
                                      this.outerRect.width - 20,
                                      this.outerRect.height - 30);
            this.progress = 0; //0 to 1
            this.barFillColour = colour;
            this.text = text;
	    }
		
		draw(){
			ctx.fillStyle = 'black';
			this.outerRect.draw();
			ctx.fillStyle = 'grey';
			
			ctx.font = '12pt NotoSans-Regular';
			ctx.fillText(this.text + ' - ' + Math.round(this.progress * 100) + '%', //Show title and percentage, e.g. Health - 57%
			             this.outerRect.centerx(), this.outerRect.y + 12);
			
			ctx.font = DEFAULT_FONT; //Reset
			this.innerRect.draw();
			
			ctx.fillStyle = this.barFillColour;
			
			var tempProgress = this.progress;
			if (tempProgress > 1) tempProgress = 1;
			
			ctx.fillRect(this.innerRect.x, this.innerRect.y,
						 this.innerRect.width * tempProgress,
						 this.innerRect.height);
		}
	}
	
	var coreHealthBar = new BottomBar('Left', 'Up', 'red', 'Core Strength');
	var coreTemperatureBar = new BottomBar('Right', 'Up', 'red', 'Core Temperature');
	
	var upgradeProgressBar = new BottomBar('Right', 'Down', 'green', 'Upgrade Progress');
	
	var upgradeSuspicionBar = new BottomBar('Right', 'Down', 'red', 'International Suspicion');
	
	//Unchanging menu variables
	const BUTTON_WIDTH = 180;
	const PHI = 1.618;
	const BUTTON_HEIGHT = Math.round(BUTTON_WIDTH / PHI); //Make a golden rectangle
	
	var pausedResumeButton = new MenuButton(h * 1/6, 'Resume');
	var pausedRestartButton = new MenuButton(h * 2/6, 'Restart');
	var pausedInstructionButton = new MenuButton(h * 3/6, 'Instructions');
	var pausedExitButton = new MenuButton(h * 4/6, 'Exit');
	
	var factoryButtons = [];
	factoryButtons['Core'] = new FactoryButton(215, 250, BUTTON_WIDTH / 2, BUTTON_HEIGHT / 2, 'Core', 'Core');
	factoryButtons['Shielding'] = new FactoryButton(150, 180, BUTTON_WIDTH + 40, BUTTON_HEIGHT / 2, 'Shielding', 'Neutron Shielding')
	factoryButtons['Processing'] = new FactoryButton(10, 360, 170, 110, 'Processing', '');
    factoryButtons['Corrosion'] = new FactoryButton(515, 420, 140, 250, 'Corrosion', '');
    //Inaccessible level - player will think there's more to the game prior to plot twist
    factoryButtons['Turbine'] = new FactoryButton(715, 245, 160, 155, 'Turbine', '');
    
	factoryButtons['EDT'] = new SmallButton(125, 590, 170, 140, '');
	
	var factoryPump1Button = new MaintenanceButton(320, 340, 100, 70,
                                                   8000, 'Core', 'Shielding');
    var factoryFreezePlugButton = new MaintenanceButton(250, 510, 80, 50,
                                                        6000, 'Shielding', 'Processing');
	var factoryPump2Button = new MaintenanceButton(410, 530, 80, 60,
                                                   7000, 'Processing', 'Corrosion');
	
	//Shared with all minigames
	class UpgradeButtonClass extends SmallButton {
	    constructor(){
            var x = w - 150;
            var y = 0;
            var width = 150;
            var height = 150 / PHI;
            var text = 'Upgrades';
            
            super(x, y, width, height, text);
	    }
	}
	
	var upgradeButton = new UpgradeButtonClass();
	
	var mainMenuPlayButton = new MenuButton(h / 3, 'Play');
	var mainMenuOptionButton = new MenuButton(h * 3 / 5, 'Options');
	
	//Options
	optionSoundButton = new ToggleButton(h * 0.2, 'Sound');
	optionMusicButton = new ToggleButton(h * 0.4, 'Music');
	optionExplosionsButton = new ToggleButton(h * 0.6, 'Explosions');
	optionBlurButton = new ToggleButton(h * 0.8, 'Blur');
	
	//Run update once so that the button's text is loaded
	optionSoundButton.update(soundOn);
	optionMusicButton.update(musicOn);
	optionExplosionsButton.update(explosionsOn);
	optionBlurButton.update(blurNeutrons);
	
	//Used in multiple screens
	backButton = new SmallButton(0, 0, BUTTON_WIDTH / 2, BUTTON_HEIGHT / 2, 'Back');
	backButton.rect.y = h - backButton.rect.height;
	
	inGameBackButton = new SmallButton(0, 0, BUTTON_WIDTH / 2, BUTTON_HEIGHT / 2, 'Back');
	inGameBackButton.rect.y = MAIN_SCREEN_HEIGHT - inGameBackButton.rect.height;
    
    repairHealthButton = new SmallButton(w - BUTTON_WIDTH * 2, 0,
                                        BUTTON_WIDTH * 2, BUTTON_HEIGHT / 2, 'Repair - 20% for 8k');
    repairHealthButton.rect.y = MAIN_SCREEN_HEIGHT - repairHealthButton.rect.height;
    
        
    repairShieldingButton = new SmallButton(w - BUTTON_WIDTH * 2, 0,
                                            BUTTON_WIDTH * 2, BUTTON_HEIGHT / 2, 'Repair - 8 blocks for 8k');
    repairShieldingButton.rect.y = MAIN_SCREEN_HEIGHT - repairShieldingButton.rect.height;
    
    
    upgradeTritiumButton = new SmallButton(w/2 - BUTTON_WIDTH * 2, 0,
                                           BUTTON_WIDTH * 2, BUTTON_HEIGHT / 2, 'Upgrade Tritium (5k)');
    upgradeTritiumButton.rect.y = MAIN_SCREEN_HEIGHT - upgradeTritiumButton.rect.height;
    
	const INFO_WINDOW_SPACING = 5;
	class PagedText {
	    constructor(){
	        this.charsShown = 0;
	    }
	    
		animateText(){
			var initialText = this.getText();
			
			if (this.charsShown < initialText.length){
				this.charsShown += 2;
				
				if (this.charsShown > initialText.length){
					this.charsShown = initialText.length;
				}
			}
			
			//Replace with string slicing later
			var displayText = '';
			
			for (var i = 0; i < Math.floor(this.charsShown); i++){
				displayText += initialText[i];
			}
			
            wrapText(displayText, this.innerRect.x,
            		 this.innerRect.y, this.innerRect.width, this.innerRect);
		}
		
		setCurrentPart(currentPart){
			this.charsShown = 0;
			this.currentPart = currentPart;
		}
		
	    getText(){
            if (this.multipart){
                return this.text[this.currentPart - 1];
            } else {
                return this.text;
            }
        }
        
        defineText(text){
            this.text = text;
            this.currentPart = 1;
            
            if (typeof text === 'string'){
                this.multipart = false;
            } else if (Array.isArray(text)){
                this.multipart = true;
            } else {
                prompt('Value Error - text variable is of type' + type);
            }
        }
        
        drawPageNumber(rect){
            if (this.multipart){
                ctx.font = '12pt Inconsolata';
                ctx.fillStyle = 'white'
                var text = this.currentPart + ' / ' + this.text.length;
                
                ctx.textAlign = 'right';
                ctx.fillText(text, rect.right(), rect.y + 12);
            }
        }
	}
	
	class InfoWindowClass extends PagedText {
	    constructor(){
	        super();
	        
            this.rect = new Rect(0, 0, w * 0.5, MAIN_SCREEN_HEIGHT / 5);
            
            //Move to bottom right of main game screen above info panel
            this.rect.x = w - this.rect.width;
            this.rect.y = MAIN_SCREEN_HEIGHT - this.rect.height;
            this.innerRect = this.rect.inflate(-INFO_WINDOW_SPACING, -INFO_WINDOW_SPACING);
            
            this.font = '10pt Inconsolata';
            this.visible = false;
	    }
        
	    draw(){
            //If playing a game or upgrade screen for game
            //As long as not on main menu
            if (this.visibleScreen() && this.visible){
	            //Border
                ctx.fillStyle = 'white';
                this.rect.draw();
                
                //Background
                ctx.fillStyle = DARKGREY;
                this.innerRect.draw();
                this.innerRect.highlightDraw();
                
                //Text
                this.drawPageNumber(this.innerRect);
                
                ctx.font = this.font;
                ctx.fillStyle = this.textColour; //Gets set when used
                ctx.textAlign = 'left';
                this.animateText();
                ctx.textAlign = 'center';
                ctx.font = DEFAULT_FONT;
	        }
	    }
	    
        click(){
            if (this.multipart){
                this.setCurrentPart(this.currentPart + 1);
            }
        
            if (!this.multipart || //Closed text
                //Or seen all pages
                (this.multipart && this.currentPart > this.text.length)){
                
                infoWindow.visible = false;
            }
        }
        
        visibleScreen(){
            return !(['Main Menu', 'Options'].includes(screen));
        }
        
        wasClicked(){
            return this.rect.mouseOver() && this.visible && this.visibleScreen();
        }
	}	
	//Two types of events systems, event, newEvents, beginEvent is all linear
	//beginAEvent is non-linear, both will overwrite a current message
	
	var finishedAEvents = [];
    
    function beginAEvent(newAEvent){
        if (!finishedAEvents.includes(newAEvent)){
            finishedAEvents.push(newAEvent);
            infoWindow.visible = true;
            
            if (newAEvent == 'Start Core'){
                infoWindow.defineText(['Info Manual: Deflect neutrons using the left paddle '
                                     + '(W-D controls). The right paddle is automated to help '
                                     + 'manage the reactor.',
                                     
                                       'Each neutron has a random chance of fissioning into '
                                     + 'two and creating heat. When core temperature reaches 50%, '
                                     + 'electricity is generated which increases upgrade progress.']);
                infoWindow.textColour = 'white';
            }
            else if (newAEvent == 'Start Shielding'){
                infoWindow.defineText([`Neutron embrittlement is a serious issue in nuclear
reactors as exposure to neutrons can damage components. Use the paddle
(A - D controls) to reflect incoming neutrons to protect the shielding.`,

`Make sure you buy upgrades such as Shielding Contracts in order to
regenerate the shielding and reflect more neutrons. If any neutron
passes the shielding, escaping into the environment, the reactor will
be shutdown.`,

`Reflect neutrons to earn money, faster neutrons are worth more.`]);
            }
            else if (newAEvent == 'Start Processing'){
                infoWindow.defineText([`Operating a nuclear reactor causes harmful particles
to build up in the pipes. Process waste by clicking on large circles. Recreate
the pattern seen when the border turns white to deactivate the waste.`,

`Failure to deactivate the waste will result in it recirculating, resulting in
exponentially waste in the future and damage to the reactor.`]);
            }
            else if (newAEvent == 'Start Corrosion'){
                infoWindow.defineText([`Corrosion is another serious issue for pipes in
a nuclear reactor. Large pieces of corrosion can be deactivated with the laser.
But smaller pieces will require finer control.`,

`Switch modes by pressing shift and activate by pressing space. Ensure that corrosion
concentration does not exceed 100% or the pipes will degrade.`,

`The cost to repair the deconstructor. is about $2,500.`]);
            }
        }
    }
    
	var infoWindow = new InfoWindowClass();
	var event;
	
	const EVENT_ORDER = ['Start', 'Beginning Tutorial',
	                     'Core - Info Heat', 'Globe Tutorial', 'Toggle Info',
	                     'Finished Core', 'Leaving Core', 'Shielding High Energy Warning',
	                     'Finished Shielding', 'Tritium Processing', 'Tritium Info',
	                     'Finished Processing',
	                     'Corrosion Documents', 'End game']
	
	function checkOrder(currentEvent, newEvent){	    
	    if (!EVENT_ORDER.includes(currentEvent) || !EVENT_ORDER.includes(newEvent)){
	        prompt('Event ID Error.');
	    } else {
            var currentIndex = EVENT_ORDER.indexOf(currentEvent);
            var newIndex = EVENT_ORDER.indexOf(newEvent);
	        
	        if (currentIndex == newIndex - 1){
	            return true; //Ordering of events is good
	        } else {
	            return false; //Bad ordering, can happen when event has already run
	        }
	    }
	}
	
	function beginEvent(newEvent){
	    if (checkOrder(event, newEvent)){
	        infoWindow.visible = true;
	        event = newEvent; //Update game event
	        
    	    if (newEvent == 'Beginning Tutorial'){
    	        infoWindow.defineText([`The Boss: Hi, welcome to the nuclear reactor.
We need you to help manage this reactor to help produce free clean energy for all the
civilians living here. You can close these windows by clicking on them.`,
            	                     
`The factory menu can be rather confusing the first time around. So allow me
to explain. First of all, as you can see, there are many components in a
nuclear reactor which must all work together. I\'ve placed buttons to indicate
the parts of the reactor you may interact with.`,
            	                     
`The three types of buttons are red, green, and grey. Red buttons indicate
major components which are restricted. With time you can help with these.
Green buttons indicate open locations. Lastly, there are grey buttons.
They\'re not important now.`,
            	                     
'Anyways, let me open up the Core so you can enter.']);
    	        infoWindow.textColour = 'lime';
    	    }
    	    
    	    else if (newEvent == 'Core - Info Heat'){
    	        infoWindow.defineText(['Info Manual: Balance the amount of neutrons on screen'
                                     + ' by deflecting and allowing certain neutrons to leave the screen so '
                                     + 'temperature does not rise over 100%. Otherwise, core strength will '
                                     + 'decrease resulting in a potential nuclear meltdown.',
                                     
                                       'The closer core temperature is to '
                                     + '100%, the greater the rate electricity'
                                     + ' is generated and the harder the reaction becomes to control. Generating'
                                     + ' electricity fills the Upgrade Progress bar allowing you to buy upgrades.',
                                       
                                       'If you\'ve damaged the Core Strength, you may buy '
                                     + 'costly repairs in the Upgrades menu. Remember to '
                                     + 'keep temperature from going beyond 100%!'
                                     ])
                infoWindow.textColour = 'white';
    	    }
    	    
            else if (newEvent == 'Globe Tutorial'){
                infoWindow.defineText(`The Boss: This is where you choose the country
to buy your nuclear parts from. Keep in mind that the buying of nuclear parts can easily
invoke suspicion that one is building a nuclear bomb. Avoid allowing the suspicion bar
to reach 85% or you\'ll be locked out until things cool down.`);
                infoWindow.textColour = 'lime';
            } else if (newEvent == 'Toggle Info'){
                infoWindow.defineText('The Boss: You can toggle your upgrades at the bottom'
    							 + ' left of the info panel. Yellow and green are off and '
    							 + 'on respectively.');
                infoWindow.textColour = 'lime';
    		}
            else if (newEvent == 'Finished Core'){
                infoWindow.defineText('The Boss: Congratulations for upgrading all the'
                                 + ' components here. An automated reactor is a '
                                 + 'productive reactor. When you\'re ready, follow me'
                                 + ' to the factory overlay.');
                infoWindow.textColour = 'lime';
            }
            else if (newEvent == 'Leaving Core'){
                infoWindow.defineText(`The Boss: Click on the uppermost pump.
We need to invest $8,000 from the core to keep it maintained this year. Once
you\'re done, you can make up the debt by helping out with Neutron Shielding.`);
                infoWindow.textColour = 'lime';
            }
    		else if (newEvent == 'Shielding High Energy Warning'){
    			infoWindow.defineText('The Boss: Keep in mind that red high energy neutrons'
    							 + ' can cause much more damage to the shielding than '
    							 + 'regular neutrons. Attempt to deflect them at all costs.');
    			infoWindow.textColour = 'lime';
    		}
            else if (newEvent == 'Finished Shielding'){
                infoWindow.defineText('The Boss: Good job creating power. Seems like '
                                 + 'you\'re getting used to the job. I\'ll just '
                                 + 'need you to pay the $6,000 maintenance from the'
                                 + ' shielding for the freeze plug when you\'re ready.');
                infoWindow.textColour = 'lime';
            }
            else if (newEvent == 'Tritium Processing'){
                infoWindow.defineText('The Boss: Hey, I need you to purchase this '
                                 + '$5,000 tritium upgrade since.... we\'re running'
                                 + ' behind schedule. It\'s in the upgrades menu to purchase'
                                 + ' when you\'re ready.');
                infoWindow.textColour = 'lime';
            }
            else if (newEvent == 'Tritium Info'){
                infoWindow.defineText('*A quick google search reveals that tritium is '
                                 + 'used as a neutron initiator, glow in the dark '
                                 + 'parts, nuclear weapons, and as an organic '
                                 + 'radiolabel.*');
                infoWindow.textColour = 'red';
            }
            else if (newEvent == 'Finished Processing'){
                infoWindow.defineText('The Boss: Hi, again. Upgrade the pump located '
                                 + 'near the heat exchanger, it\'ll only cost '
                                 + '$7,000. You\'re doing a great service for your country.');
                infoWindow.textColour = 'lime';
            }
            else if (newEvent == 'Corrosion Documents'){
                infoWindow.defineText('*Looking through an unlocked cabinet late one '
                                 + 'night you find a few classified documents in an open vault.*');
                infoWindow.textColour = 'blue';
            }
            else if (newEvent == 'End game'){
                infoWindow.defineText('Analyzing those papers leads you to the conclusion'
                                 + ' that the entire plant\'s primary goal is not to '
                                 + 'produce power but nuclear weapons. The next shift '
                                 + 'will take over in 3 minutes. If only you could '
                                 + 'sabotage the power plant...');
                infoWindow.textColour = 'red';
            }
        }
	}
	
	//Upgrade screen
	const UPGRADE_TOTAL_WIDTH = w * 9/10;
	const UPGRADE_INITIAL_OFFSETX = (w - UPGRADE_TOTAL_WIDTH) / 2;
	const UPGRADE_BOX_WIDTH = UPGRADE_TOTAL_WIDTH / 4;
	
	const UPGRADE_TOTAL_HEIGHT = MAIN_SCREEN_HEIGHT * 4/5 - 60;
	const UPGRADE_INITIAL_OFFSETY = (MAIN_SCREEN_HEIGHT - UPGRADE_TOTAL_HEIGHT) / 2;
	const UPGRADE_BOX_HEIGHT = UPGRADE_TOTAL_HEIGHT / 3;
	
	class BaseUpgradeBox {
	    constructor(x, y, column, row){
            this.rect = new Rect(x, y, UPGRADE_BOX_WIDTH, UPGRADE_BOX_HEIGHT);
            this.column = column;
            this.row = row;
            
            if (this.row == 0){
                this.colour = 'red';
            } else if (this.row == 1){
                this.colour = 'green';
            } else if (this.row == 2){
                this.colour = 'blue';
            } else {
                prompt('this.row value error ' + this.row);
            }
	    }
        
		draw(i){
			ctx.fillStyle = this.getColour();
			this.rect.draw();
			
			//Draw text
		    var text = this.getText(i);
		    var titleText = text[0];
		    var descriptionText = text[1]; 
		    
            //Draw title
            ctx.fillStyle = this.colour;
            
            ctx.font = '20pt NotoSans-Regular';
            wrapText(titleText, this.rect.centerx(), this.rect.y, UPGRADE_BOX_WIDTH);
            
            //Draw description below title
            var y = this.rect.y + UPGRADE_BOX_HEIGHT * 1/4;
            ctx.font = '10pt NotoSans-Regular';
            wrapText(descriptionText, this.rect.centerx(), y, UPGRADE_BOX_WIDTH);
		}
		
		getColour(){
            return 'grey';
		}
	}
    
    class InfoUpgradeBox extends BaseUpgradeBox {
        constructor(x, y, column, row){
            super(x, y, column, row);
        }
        
        getText(i){
            return [upgradeInfoTitles[currentGame][i],
                    upgradeInfoDescriptions[currentGame][i]];
        }
    }
    
    class ClickableUpgradeBox extends BaseUpgradeBox {
        constructor(x, y, column, row){
            super(x, y, column, row, i);
            this.i = i;
        }
        
        getText(i){
            return [upgradeTitles[currentGame][i],
                    upgradeDescriptions[currentGame][i]];            
        }
        
        getColour(){
            if (this.rect.mouseOver() || allBoughtUpgrades[currentGame].includes(this.i)){
                return 'grey';
            } else {
                return DARKGREY;
            }
        }
    }    
    
    var upgradeInfoBoxes = [];
    var upgradeBoxes = [];
    
    var i = 0;
    for (var y = 0; y < 3; y++){
        upgradeInfoBoxes.push(new InfoUpgradeBox(UPGRADE_INITIAL_OFFSETX,
                                                 UPGRADE_INITIAL_OFFSETY + UPGRADE_BOX_HEIGHT * y,
                                                 //Column 0
                                                 0, y));
        
		for (var x = 1; x < 4; x++){
			upgradeBoxes.push(new ClickableUpgradeBox(UPGRADE_INITIAL_OFFSETX + UPGRADE_BOX_WIDTH * x,
        											  UPGRADE_INITIAL_OFFSETY + UPGRADE_BOX_HEIGHT * y,
        											  x, y, i));
        	i++;
		}
	}
	
	const UPGRADE_LABEL_HEIGHT = 30;
	
	class UpgradeBoxLabel {
	    constructor(x, text){
            this.rect = new Rect(UPGRADE_INITIAL_OFFSETX + UPGRADE_BOX_WIDTH * x,
                                 UPGRADE_INITIAL_OFFSETY - UPGRADE_LABEL_HEIGHT,
                                 UPGRADE_BOX_WIDTH, UPGRADE_LABEL_HEIGHT);
            this.text = text;
	    }
        
        draw(){
            ctx.fillStyle = 'grey';
            this.rect.draw();
            
            ctx.fillStyle = 'white';
            ctx.font = '20pt NotoSans-Regular';
            ctx.fillText(this.text, this.rect.centerx(),
                        //Some weird vertical centering of text
                         (this.rect.centery() + this.rect.bottom()) / 2);
            ctx.font = DEFAULT_FONT;
        }
	}
	
	var upgradeBoxLabels = [];
	for (var i = 0; i < 4; i++){
	    var text = ['Info', 'Tier 1', 'Tier 2', 'Tier 3'][i];
	    upgradeBoxLabels.push(new UpgradeBoxLabel(i, text));
	}
	
	var upgradeTitles = {};
    upgradeTitles.Core = ['AI Moderation', 'Double Paddle',   'Double Moderation',
                          'Limited',       'Semi-functional', 'Variable',
                          'Under 20%',     'Under 50%',       'Under 70%'];
	
    var upgradeDescriptions = {};
    upgradeDescriptions.Core = [//Paddle upgrade row
                                'Prevents automated paddles from attempting to deflect neutrons when temperature is at 80%.',
                                'Allows the left paddle to be automated in order to improve efficiency.',
                                'Forces automated paddles to avoid neutrons when temperature is at 85% - improving safety.',
                                
                                //Control rod row
                                'A few control rods are deployed when temperature reaches 90% to reduce chances of a meltdown.',
                                'Control rods have a low activity setting at 80% and a high activity setting at 90% improving stability at high temperatures.',
                                'Control rods will fully deploy when temperature reaches 105%, drastically reducing the chance of a meltdown.',
                                
                                //Heavy water row
                                'Heavy water will be used when core temperature is under 20%, allowing the reactor to reach optimal temperature more quickly.',
                                'Heavy water will be used whenever the temperature drops below the ability to create power, improving efficiency.',
                                'Heavy water will be used nearly constantly to increase the number of fissions whenever reactor is below optimal temperature.'
                                ];
	
    upgradeTitles.Shielding = ['Heavy Water', 	    'Graphite',   	  'Purified Graphite',
							   'One Paddle',	    'Two Paddles', 	  'Enhanced Upgrade',
							   'Bi-Weekly Repairs', 'Weekly Repairs', 'Daily Checks'];
	
    upgradeDescriptions.Shielding = [//Neutron Moderators row
									 'Heavy water slows down incoming neutrons by 10%.',
									 'Graphite slows down incoming neutrons by 20%.',
									 'Purified graphite is more efficient than conventional graphite, slowing neutrons by 40%.',
									
									 //Automation row
									 'An automated paddle will be added in addition to the manual one.',
									 'Three paddles, (two automated and one manual) will be used to deflect neutrons.',
									 'Automated and manual paddle speed is doubled.',
									
									 //Shielding Contracts row
									 'This upgrade is essential. One tile will be regenerated every 16 seconds.',
									 'Tiles will be regenerated every 12 seconds.',
									 'Tiles will be regenerated every 8 seconds.'
									 ];
	
    upgradeTitles.Processing = ['Low Capacity', 	'Medium Capacity',     'Full Capacity',
							    'Basic Processors', 'Advanced Processors', 'Full Processing',
							    'Basic Computers',  'Alloyed Components',  'Self-Learning AI']; //no, the AI does not actually do self-learning
	
    upgradeDescriptions.Processing = [//Reactor capacity row
									  'Control rods will be used less often. (increases waste by 25%)',
									  'Heavy water will be used more often. (increases waste by 50%)',
									  'Weapon grade plutonium will be used to enrich fuel. (increases waste by 100%)',
									
									  //Automation row
									  'Adds two simple robots to assist with purifying some fluid.',
									  'Adds two more robots to further process fluid.',
									  'Purchases two more robots for a total of six.',
									
									  //Automated Processing Speed row
									  'Increases automation speed from 30s to 24s.',
									  'Improves efficiency from 24s to 16s.',
									  'Automated robots can remove salt every 8s.'
									  ];
	
    
    upgradeTitles.Corrosion = ['Simple Lasers',         'Simple AI',       'Advanced AI',
                               'Simple Deconstructors', 'Mass-Production', 'Nanobots',
                               'Purified Metals',       'Advanced Alloys', 'Nanotech Pipes'];
    
    upgradeDescriptions.Corrosion = [//Laser Upgrades row
                                     'Adds one auto-laser to constantly aid with breaking up large corrosion particles.',
                                     'Adds a second automated laser to aid with the destruction of corrosion particles.',
                                     'Doubles automated laser strength without increasing energy use.',
                                    
                                     //Neutralization Upgrades row
                                     'Adds an automated deconstructor to aid with deactivating small corrosion particles.',
                                     'Triples the number of automated deconstructors available.',
                                     'Invisible bots can deactivate small corrosion particles.',
                                    
                                     //Pipe Quality row
                                     'Decreases the health of corrosion particles to 80%.',
                                     'Combining the properties of metals reduces corrosion particles\' health by 75%.',
                                     'Infusing carbon nanotubes during manufacture dramatically reduces corrosion particle strength by 50%.'
                                     ];
	
    
    var upgradeInfoTitles = {};
    upgradeInfoTitles.Core = ['Paddles',
                              'Control Rods',
                              'Heavy Water'];
    
    var upgradeInfoDescriptions = {};
    upgradeInfoDescriptions.Core = [//Paddle upgrade row
                                    'Improves the ability to heat & cool to maintain the delicate balance of temperature required for the most efficient power generation.',
                                    
                                    //Control rod row
                                    'The moderator & emergency brakes of a nuclear reactor, when deployed they RAPIDLY bring a reaction under control.',
                                    
                                    //Heavy water row
                                    'Contrary to control rods, heavy water can slow down neutrons allowing them to fission more often, producing more heat.',
                                    ];
    
    upgradeInfoTitles.Shielding = ['Neutron Moderators',
                                   'Automation',
                                   'Shielding Contracts',];
    
    upgradeInfoDescriptions.Shielding = [//Neutron Moderators row
                                         'Neutron moderators slow down incoming neutrons, allowing them to be more easily deflected. (Each upgrade stacks)',
                                        
                                         //Automation row
                                         'Automation of a nuclear reactor is critical for improving safety and efficiency.',
                                        
                                         //Shielding Contracts row
                                         'Shielding contracts are essential to compensate for the effects of neutron embrittlement on the shielding.',
                                         ];
    
    upgradeInfoTitles.Processing = ['Reactor Capacity',
                                    'Automation', 
                                    'Automated Processing Speed'];
    
    upgradeInfoDescriptions.Processing = [//Reactor capacity row
                                          'Accelerates the production of electricity (this produces more waste!)',
                                        
                                          //Automation row
                                          'Automation of salt processing improves safety and stability especially with increased reactor capacity.',
                                        
                                          //Automated Processing Speed row
                                          'Increases the speed of existing machines (Level 1 automation recommended).',
                                          ];
    
    upgradeInfoTitles.Corrosion = ['Laser Upgrades',
                                   'Neutralization Upgrades',
                                   'Pipe Quality'];
    
    upgradeInfoDescriptions.Corrosion = [//Laser Upgrades row
                                         'Improvements to the laser aid with breaking up large corrosion particles.',
                                        
                                         //Neutralization Upgrades row
                                         'Aids with the deactivation of small corrosion particles.',
                                        
                                         //Pipe Quality row
                                         'Improved quality of pipe material makes corrosion less dangerous. (upgrades stack)',
                                         ];
	
	var desiredUpgrade;
	
	//Globe screen
	const COUNTRIES = ['United States', 'China',  'Japan',
					 'Germany',       'Brazil', 'Russia'];
	
	var countryButton = {};
	
    countryButton['United States'] = new SmallButton(197, 186, 150, 85, '');
    countryButton['China'] = new SmallButton(720, 203, 113, 83, '');
    countryButton['Japan'] = new SmallButton(838, 160, 100, 78, '');
    countryButton['Germany'] = new SmallButton(510, 140, 63, 63, '');
    countryButton['Brazil'] = new SmallButton(322, 344, 98, 143, '');
    countryButton['Russia'] = new SmallButton(586, 53, 259, 97, '');
	
	var mouseoverCountry;
	var globeInfoRect = new Rect(w / 2 - 50, h / 2 - 80, w / 3, h / 2);
	
	var GDP = {};
	
	GDP['United States'] = '$16.47 trillion per year';
	GDP['China'] = '$5.27 trillion per year';
	GDP['Japan'] = '$4.78 trillion per year';
	GDP['Germany'] = '$3.227 trillion per year';
	GDP['Brazil'] = '$1.206 trillion per year';
	GDP['Russia'] = '$999.8 billion per year';
	
	var population = {};
	population['United States'] = '322 million';
	population['China'] = '1.36 billion';
	population['Japan'] = '126 million';
	population['Germany'] = '81.6 million';
	population['Brazil'] = '202 million';
	population['Russia'] = '142 million';
	
	var unlockedLevels;
	
	var internationalSuspicion;
	var suspicion = {};
	
	var baseUpgradeCost;
	var upgradeCost;
	
	class Ball {
	    constructor(x, y, dx, dy){
            this.rect = new Rect(x, y, BALL_SIZE, BALL_SIZE);
            this.toBeRemoved = false;
            
            this.dx = dx;
            this.dy = dy;
	    }

		move(){
			this.rect.x += this.getSpeed(this.dx);
			this.rect.y += this.getSpeed(this.dy);
		}
		
		draw(){
			drawSphere(this.rect, this.colour);
		}
		
		explode(){			
			explode(this.rect);
		}
	}
	
	function explode(rect){
		if (explosionsOn){
			var x = rect.centerx();
			var y = rect.centery();
			
			explosionParticles.push(new Explosion(x, y));
		}
	}
	
	class PipeParticle {
	    constructor(y, dx, dy, size){
            var x = 0;
            
            this.rect = new Rect(x, y, size, size);
            this.toBeRemoved = false;
            this.toBeRemovedOffscreen = false;
            
            this.dx = dx;
            this.dy = dy;
	    }
		
		move(){
			var speed = this.dx;
			
			if (usingUpgrade(0)){
				//Increases speed by 25%
				speed += this.dx * 0.25;
			}
			if (usingUpgrade(1)){
				//Increases speed by 50%
				speed += this.dx * 0.5;
			}
			if (usingUpgrade(2)){
				//Increases speed by 100%
				speed += this.dx;
			}
			
			this.rect.x += speed * dTime;
			this.rect.y += this.dy * dTime;
					
			//Bounce off sides of conveyor belt
			if ((this.rect.y < CONVEYOR_BELT.innerRect.y && this.dy < 0) ||
				 this.rect.bottom() > CONVEYOR_BELT.innerRect.bottom() && this.dy > 0){
				this.dy *= -1;
			}
			
			//Keep in pipes
			if (this.rect.y < CONVEYOR_BELT.innerRect.y){ //Top
				this.rect.y = CONVEYOR_BELT.innerRect.y;
			} else if (this.rect.bottom() > CONVEYOR_BELT.innerRect.bottom()){ //Bottom
				this.rect.setBottom(CONVEYOR_BELT.innerRect.bottom());
			}
			
			//Remove salts off screen
			if (this.rect.x > w){ //Right of screen
				this.toBeRemoved = true;
				this.toBeRemovedOffscreen = true;
			}
		}
		
		draw(){
			//An unintentional bug became a feature here
			ctx.globalAlpha = 0.8;
			drawSphere(this.rect, ctx.fillStyle);
			ctx.globalAlpha = 1;
		}
	}
	
	class Salt extends PipeParticle {
	    constructor(y, dx, dy){
            var size = BALL_SIZE;
            super(y, dx, dy, size);
	    }
	    
	    draw(){
	        ctx.fillStyle = 'orange';
	        super.draw();
	    }
	}
	
	class SaltWaste extends PipeParticle {
	    constructor(){
            var dx = (Math.random() * 3 + 0.5) * 50 / 3;
            var dy = randUniform(-50/3, 50/3);
            
            var y = randint(CONVEYOR_BELT.innerRect.y, CONVEYOR_BELT.innerRect.bottom() - BALL_SIZE * 2);
            
            var size = BALL_SIZE * 2;
            super(y, dx, dy, size);
            
            //Get id
            var usedIDs = [];
            for (var radioactiveSalt of radioactiveSalts){
                usedIDs.push(radioactiveSalt.id);
            }
            
            //Loop through numbers 0 to infinity trying ID numbers
            var desiredID = 0;
            while(true){ //The only while loop in the entire game
                //Check all salts if ID is used
                if (!usedIDs.includes(desiredID)){
                    break;
                }
                
                desiredID++;
            }
            
            this.id = desiredID;
            
			if (countBoughtUpgrades() < 2){
				var tempID = 0;
			} else if (countBoughtUpgrades() < 5){
				var tempID = randint(0, 1);
			} else {
				var tempID = randint(0, 2);
			}
            
            var queueLength;
            
            if (tempID == 0){
                this.saltType = 'Oxide';
                queueLength = 4;
            } else if (tempID == 1){
                this.saltType = 'Sulphur';
                queueLength = 5;
            } else if (tempID == 2){
                this.saltType = 'Metal Impurities';
                queueLength = 6;
            }
            
            //Generate puzzle
            this.queue = [];
            for (var i = 0; i < queueLength; i++){
                this.queue.push(randint(0, 3));
            }
	    }
        
        draw(){
            if (this.purified){
                ctx.fillStyle = 'green';
            } else if (this.id == Proc_Puzzle.saltID){
                ctx.fillStyle = 'yellow';
            } else {
                if (this.saltType == 'Oxide'){
                    ctx.fillStyle = 'lightblue';
                } else if (this.saltType == 'Sulphur'){
                    ctx.fillStyle = 'red';
                } else if (this.saltType == 'Metal Impurities'){
                    ctx.fillStyle = 'grey';
                } else {
                    prompt('Unexpected salt type.');
                }
            }
            
            super.draw();
        }
        
        payProcessing(){
            if (this.saltType == 'Oxide'){
                levelIncome.Processing += randint(1000, 1400);    
            } else if (this.saltType == 'Sulphur'){
                levelIncome.Processing += randint(1500, 2000);    
            } else if (this.saltType == 'Metal Impurities'){
                levelIncome.Processing += randint(2000, 2500);
            } else {
                prompt('Salt type error - ' + this.saltType)
            }
        }
	}
	
	//Audio only used in core
	const reactorExplosion = new Audio('sound/core/reactor_explosion.ogg');
	
	var logoImage = new Image();
	logoImage.src = 'images/Logo.png';
	var LOGO_X_OFFSET = w / 2 - logoImage.width / 2;
	
	//Upgrade assets
	var earthImage = new Image();
	earthImage.src = 'images/Earth Map.jpg';
	
	//Fixed graphic variable
	var EXPLOSIONS = [];
	var EXPLOSIONS_HD = [];
	
	for (var i = 0; i < 15; i++){
		EXPLOSIONS.push(new Image());
		EXPLOSIONS_HD.push(new Image());
		
		EXPLOSIONS[i].src = 'images/explosions/' + (i + 1) + '.png';
		EXPLOSIONS_HD[i].src = 'images/explosionsHD/' + (i + 1) + '.png';
	}
	
	const EXPLOSION_TYPES = ['Linear', 'Quadratic', 'None', 'sqrt'];
	
	class Core_Ball extends Ball {
	    constructor(x, y, dx, dy){
	        super(x, y, dx, dy);
	        
	        this.colour = 'cyan';
	    }
		
		checkCollision(){
			if (this.rect.y < 0 && this.dy < 0){
				this.dy *= -1;
			}
			else if (this.rect.bottom() > MAIN_SCREEN_HEIGHT &&
					 this.dy > 0){
					
					 this.dy *= -1;
			}
			
			//Bounce off paddles
			if (collisionRect(this.rect, leftPaddle.rect) &&
				this.dx < 0){
				this.dx *= -1;
			} else if (collisionRect(this.rect, rightPaddle.rect) &&
					   this.dx > 0){
				this.dx *= -1;
			}
		}
		
		checkRemove(){
            //Remove coreBalls off screen
            if (this.rect.right() < 0 || this.rect.x > w){
                this.toBeRemoved = true;
            }
            
            //Interactions with control rods
            var randomChance = randint(1, 300);
            if (controlRodSetting == 'Low' && randomChance == 1){
                this.toBeRemoved = true;
            } else if (controlRodSetting == 'High' && randomChance <= 2){
                this.toBeRemoved = true;
            } else if (controlRodSetting == 'Full' && randomChance <= 4){
                this.toBeRemoved = true;
            }
		}
		
		getSpeed(d){
			var speed;
			if (heavyWaterUsed){
				speed = d * 0.4;
			} else {
			    speed = d;
			}
			return speed * dTime;
		}
	}
	
	class Shielding_Ball extends Ball {
	    constructor(dy){
            var x = Math.random() * w;
            var y = 1
            var dx = (Math.random() * 16 - 8) * 50 / 3;
            
            super(x, y, dx, dy);
	    }
		
		checkBounds(){
            //Remove balls off screen
            if (this.rect.right() < 0 || //Left of screen 
                this.rect.x > w || //Right of screen
                this.rect.bottom() < 0){ //Top of screen
                
                this.toBeRemoved = true;
            }
		}
		
		getSpeed(d){
			//Heavy water
			if (usingUpgrade(0)){
				d *= 0.9; //Decrease speed by 10%
			}
			
			//Regular graphite bars
			if (usingUpgrade(1)){
				d *= 0.8;
			}
			
			//Purified graphite bars
			if (usingUpgrade(2)){
				d *= 0.6;
			}
			
			return d * dTime;
		}
		
		getProgress(){
            return Math.sqrt(Math.abs(this.dy)) * Math.random() / 28;
		}
	}
	
	class Shielding_Reg_Ball extends Shielding_Ball {
	    constructor(){
			//50 to 300
            var dy = randUniform(50, 300);
            super(dy);
            
            this.colour = 'cyan';
            this.type = 'Normal';	        
	    }
	}
	
	class Shielding_Fast_Ball extends Shielding_Ball {
	    constructor(){
            var dy = randUniform(400, 500);
            super(dy);
            
            this.colour = 'red';
            this.type = 'Fast';	        
	    }
	}
	
	var explosionParticles;
	class Explosion {
	    constructor(x, y){
            this.toBeRemoved = false;
            this.x = x;
            this.y = y;
            this.frame = EXPLOSIONS.length - 1;
            
            var i = randint(0, EXPLOSION_TYPES.length - 1);
            this.type = EXPLOSION_TYPES[i];
	    }
		
		draw(){
			var percentage = this.frame / EXPLOSIONS.length;
			//Make global alpha start at 100% and drop linearly to 0% while moving through frames
			if (this.type == 'Linear'){
				ctx.globalAlpha = percentage;
			} else if (this.type == 'Quadratic'){
				//Quadratic y=-x^2 + 1
				ctx.globalAlpha = -Math.pow(percentage, 2) + 1;
			} else if (this.type == 'None'){
				//No fade out via alpha
				ctx.globalAlpha = 1;
			} else if (this.type == 'sqrt'){
				//Sqrt
				ctx.globalAlpha = Math.sqrt(-(percentage - 1))	
			}
			
			var frame = Math.round(this.frame);
            drawExplosionImage(frame, this.x, this.y);
            
			ctx.globalAlpha = 1;
			this.frame -= 20 * dTime;
		}
	}
    
    function drawExplosionImage(frame, x, y){
        var img;
		if (false){
			img = EXPLOSIONS[frame];
		} else {
			img = EXPLOSIONS_HD[frame];
		}
        
        //Get x,y equivalent coordinates on the image variable
        var centerX = img.width / 2;
        var centerY = img.height / 2;
        
        //Get the top-left on the image variable
        var sourceX = Math.round(centerX - x);
        var sourceY = Math.round(centerY - y);
        
        var sourceWidth = w;
        var sourceHeight = h;
        
        var destX = 0;
        var destY = 0;
        var destWidth = w;
        var destHeight = h;
        
        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight,
                      destX, destY, destWidth, destHeight);
    }
    
	const PADDLE_WIDTH = 12;
	const PADDLE_HEIGHT = 100;
	
	//Core level (pong-like) variables
	class Core_Paddle {
	    constructor(x){
            this.rect = new Rect(x, h / 2 - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);
            
            if (x < w / 2){
                this.location = 'Left';
            } else {
                this.location = 'Right';
            }
            
            this.moveUp = false;
            this.moveDown = false;	        
	    }
		
		checkBounds(){
            //Keep paddles on screen
            if(this.rect.y < SCREEN_BORDER){
                this.rect.y = SCREEN_BORDER;
            } else if(this.rect.bottom() > MAIN_SCREEN_HEIGHT){
                this.rect.setBottom(MAIN_SCREEN_HEIGHT);
            }
		}
		
		draw(){
			ctx.fillStyle = 'red';
			this.rect.draw();
		}
		
		move(){
			var newDistance;
			var closestBall = -1;
			var tempDistance;
			
			for (var i = 0; i < coreBalls.length; i++){
				//Find nearest ball to right paddle
				//If ball is to the left of right paddle and moving right
				
				if (((this.location == 'Right' &&
					  coreBalls[i].rect.right() < this.rect.x &&
					  coreBalls[i].dx > 0.2) || //Release slow moving balls
					  
					 (this.location == 'Left' &&
					  coreBalls[i].rect.x > this.rect.right() &&
					  coreBalls[i].dx < 0.2)) &&
					
					//Don't go after balls that'll be removed this frame
					!coreBalls[i].toBeRemoved){
					
					newDistance = dist(coreBalls[i].rect, this.rect);
					
					if (closestBall == -1 || newDistance < tempDistance){
						closestBall = i;
						tempDistance = newDistance;
					}
				}
			}
			
			//Make AI target closest ball
			if (closestBall != -1){
				var movementFactor = (coreBalls[closestBall].rect.centery() - this.rect.centery()) * dTime * 3;
				
				if (coreTemperature / 1000 > 0.85 && usingUpgrade(2)){
					//Avoid neutrons when temp is 85% and if player has required upgrade
					this.rect.y -= movementFactor;
				} else if (coreTemperature / 1000 > 0.8 && usingUpgrade(0)){
					//Stop trying to block when core temp reaches 80% and if player has required upgrade
				} else {
					//If temp below 80%, always follow neutrons
					this.rect.y += movementFactor;
				}
			}
		}
	}
	
	var leftPaddle;
	var rightPaddle;
	
	const CORE_PADDLE_SPEED = 7;
	
	var controlRodSetting;
	var heavyWaterUsed; //Used by core and shielding levels
	
	const CONTROL_ROD_WIDTH = 20;
	const GRAPHITE_BAR_HEIGHT = 10;
	
	//Shielding level (breakout-like) variables
	class Shielding_Paddle {
	    constructor(){
            this.rect = new Rect(w / 2 - PADDLE_WIDTH / 2, h / 2,
                                 PADDLE_HEIGHT, PADDLE_WIDTH);
            
            this.moveLeft = false;
            this.moveRight = false;
	    }
	    
	    checkBounds(){
            if (this.rect.x < SCREEN_BORDER){
                this.rect.x = SCREEN_BORDER;
            } else if (this.rect.right() > w - SCREEN_BORDER){
                this.rect.setRight(w - SCREEN_BORDER);
            }
	    }
	    
        draw(){
            ctx.fillStyle = 'blue';
            this.rect.draw();
        }
        
		move(){
            if (this.moveLeft){
                this.rect.x -= this.getSpeed() * dTime;
            } else if (shieldingPaddle.moveRight){
                this.rect.x += this.getSpeed() * dTime;
            }
		}
		
	
		getSpeed(){
			//If player has double speed upgrade
			const BASE = 600;
			if (usingUpgrade(5)){
				return BASE * 2;
			} else {
				return BASE;
			}
		}
	}
	
	class Shielding_AI_Paddle extends Shielding_Paddle {
	    constructor(setting){
            super();
            this.setting = setting;
            this.rect.y -= PADDLE_HEIGHT * 1.5;
	    }
		
		move(){
            var closestBall = this.getClosestBall();
            
			//Make AI target closest ball
			if (closestBall != -1){
				var movementFactor = (shieldingBalls[closestBall].rect.centerx() - this.rect.centerx()) * 1.2;
				
				//Double speed with enhanced speed upgrade
				if (usingUpgrade(5)){
					movementFactor *= 2;
				}
				
				this.rect.x += movementFactor * dTime;
			}
		}
		
		getClosestBall(){
            var newDistance;
            var tempDistance;
		    var closestBall = -1;
		    
            for (var i = 0; i < shieldingBalls.length; i++){
                //Find nearest ball to right paddle
                
                //If ball is above paddle
                if (shieldingBalls[i].rect.bottom() < this.rect.y &&
                    
                    //If ball is also moving down
                    shieldingBalls[i].dy > 0 &&
                                        
                    checkPositionViability(shieldingBalls[i], this.setting) &&
                    
                    //Don't go after shieldingBalls that'll be removed this frame
                    !shieldingBalls[i].toBeRemoved){
                    
                    newDistance = dist(shieldingBalls[i].rect, this.rect);
                    
                    if (closestBall == -1 || newDistance < tempDistance){
                        closestBall = i;
                        tempDistance = newDistance;
                    }
                }
            }
            
            return closestBall;
		}
	}
	
	class Shielding_Brick {
	    constructor(x, y){
            this.outerRect = new Rect(x * SHIELDING_BRICKS_WIDTH,
                                      h - (5 + y) * SHIELDING_BRICKS_HEIGHT,
                                      SHIELDING_BRICKS_WIDTH, SHIELDING_BRICKS_HEIGHT);
            this.innerRect = this.outerRect.inflate(-4, -4);
            this.removed = false;
            this.row = y;
            this.alpha = 1;
	    }
		
		draw(i){
		    if (!this.removed){
                if (this.row == 0){
                    ctx.fillStyle = 'red';
                } else if (this.row == 1){
                    ctx.fillStyle = 'grey';
                } else if (this.row == 2){
                    ctx.fillStyle = 'gold';
                } else if (this.row == 3){
                    ctx.fillStyle = 'brown';
                } else if (this.row == 4){
                    ctx.fillStyle = 'silver';
                } else if (this.row == 5){
                    ctx.fillStyle = 'white';
                }
                
                if (this.alpha < 1){
                    this.alpha += this.getFadeRate();
                    
                    if (this.alpha > 1){
                        this.alpha = 1;
                    }
                }
                
                ctx.globalAlpha = this.alpha;
                this.innerRect.draw();
                ctx.globalAlpha = 1;
                
                if (debugging){
                    ctx.fillStyle='blue';
                    ctx.fillText(i, this.innerRect.centerx(), this.innerRect.bottom());             
                }		        
		    }
		}

        getFadeRate(){
            if (usingUpgrade(8)){
                return 2.5 * dTime;
            } else if (usingUpgrade(7)){
                return 1 * dTime;
            } else if (usingUpgrade(6)){
                return 0.25 * dTime
				;
            }
        }

		remove(){
            this.removed = true;
            this.alpha = 0;
		}
	}
	
	var shieldingPaddle;
	var shieldingBlocks;
	
	var AI_Central_Sh_Paddle;
	var AI_Left_Sh_Paddle;
	var AI_Right_Sh_Paddle;
	
	var shieldingTimer = 0;
	
	//Shielding level CONSTANTS
	const SHIELDING_BRICKS_WIDTH = 64;
	const SHIELDING_BRICKS_HEIGHT = 32;
	
    const SHIELDING_BRICK_COUNT_X = Math.floor(w / SHIELDING_BRICKS_WIDTH);
    const SHIELDING_BRICK_COUNT_Y = 6;
    
    //Shielding info variables on info panel
    var neutronDeflections;
    
    var shieldingStrengthBar = new BottomBar('Left', 'Up', 'red', 'Shielding Strength');
    var shieldingEnergyBar = new BottomBar('Right', 'Up', 'yellow', 'Neutron Energy (eV)');
   
	usingBoughtUpgrade['Shielding'] = returnBoughtUpgradeArray();
    
    var upgradeProgressBar = new BottomBar('Right', 'Down', 'green', 'Upgrade Progress');
    
    var shieldingFluxTimer;
    var highEnergyNeutrons; //Toggles creation of high-energy neutrons
	
	//Salt processing level
	var processingHealth;
	var processingHealthBar = new BottomBar('Left', 'Up', 'red', 'Reactor Strength');
	var processingImpurityBar = new BottomBar('Right', 'Up', 'red', 'Salt Impurities');
	var processingSaltProgressBar = new BottomBar('Right', 'Down', 'green', 'Processing Progress');
	
	class UpgradeToggle {
	    constructor(i){
            var temp = getBarCoords('Left', 'Down');
            var rectX = temp.x;
            var y = temp.y;
            
            var size = barW / (9 * 2 - 1);
            //var rectY = y + barH / 2 - size / 2;
            var rectY = y + barH / 2;
            
            //Size * 2 is for spacing buttons apart with a distance of "size"
            this.outerRect = new Rect(rectX + i * (size * 2), rectY, size, size);
            this.innerRect = this.outerRect.inflate(-12, -12);
            this.id = i;
	    }
		
		draw(level){
			//If no upgrade, grey, has upgrade yellow, using upgrade green
			if (usingUpgrade(this.id)){
				ctx.fillStyle = 'lime';
			} else if (hasUpgrade(this.id)){
				ctx.fillStyle = 'yellow';
			} else {
				ctx.fillStyle = 'grey';
			}
			
			this.outerRect.draw();
			
			//Colour of inner rect is based off the row of upgrade
			if (this.id < 3){
				ctx.fillStyle = 'red';
			} else if (this.id < 6){
				ctx.fillStyle = 'green';
			} else if (this.id < 9){
				ctx.fillStyle = 'blue';
			}
			
			this.innerRect.draw();			
		}
	}
	
	var upgradeToggleButtons = [];
	for (var i = 0; i < 9; i++){
		upgradeToggleButtons.push(new UpgradeToggle(i));
	}
	
	class ConveyorBelt {
	    constructor(){
            this.outerRect = new Rect(0, h - 300, w, 100);
            this.innerRect = new Rect(0, h - 285, w, 70);
	    }
	    
	    draw(){
            ctx.fillStyle = 'white';
            this.outerRect.draw();
            ctx.fillStyle = DARKGREY;
            this.innerRect.draw();
	    }
	}
	
	const CONVEYOR_BELT = new ConveyorBelt();
	
	var saltParticles; //Used in the same way as the balls array
	var radioactiveSalts;

	const PROCESSING_TILE_SIZE = 200;
	
	const PROCESSING_TILE_TOTAL_SIZE = PROCESSING_TILE_SIZE * 2;
	const PROCESSING_TILE_YOFFSET = (CONVEYOR_BELT.outerRect.y - PROCESSING_TILE_TOTAL_SIZE) / 2;
	
	class Processing_tile {
	    constructor(x, y, colour){
            var totalWidth = PROCESSING_TILE_SIZE * 2;
            var xOffset = w / 2 - totalWidth / 2;
            this.rect = new Rect(xOffset + x * PROCESSING_TILE_SIZE,
                                 PROCESSING_TILE_YOFFSET + y * PROCESSING_TILE_SIZE,
                                 PROCESSING_TILE_SIZE, PROCESSING_TILE_SIZE);
            this.colour = colour;
	    }
		
		draw(){
			ctx.fillStyle = this.colour;
			this.rect.draw();
		}
	}
	
	/*
	false - the initial value OR
	      - player has bought upgrade, game may continue allowing upgrades now
	true - after message stating need to buy tritium upgrade, player cannot
	     - buy any other upgrades while tritiumUpgradeRequired
	*/
	var tritiumUpgradeRequired;
	
	var processingTiles = [];
	const PROCESSING_TILE_COLOURS = ['red', 'green', 'blue', 'yellow'];
	
	var i = 0;
	var colour;
	for (var y = 0; y < 2; y++){
		for (var x = 0; x < 2; x++){
			colour = PROCESSING_TILE_COLOURS[i];
			i++;
			processingTiles.push(new Processing_tile(x, y, colour));
		}
	}
	
	const PROCESSING_TILE_OUTLINE = new Rect(processingTiles[0].rect.x - 10,
										     processingTiles[0].rect.y - 10,
										     PROCESSING_TILE_TOTAL_SIZE + 20,
										     PROCESSING_TILE_TOTAL_SIZE + 20);
	
	var Proc_Puzzle;
	
	function resetProcessingPuzzle(){
		Proc_Puzzle = {};
		Proc_Puzzle.visible = false;
		Proc_Puzzle.saltId = null; //ID of selected salt
		//Timer keeping track of fading for individual cell
		Proc_Puzzle.cellDisplayTimer = 1;
		//Countdown for when to start showing the sequence
		Proc_Puzzle.startDisplayTimer = 2;
		Proc_Puzzle.displayCurrentID = 0;
		Proc_Puzzle.displayFinished = false;
		Proc_Puzzle.clickedQueue = [];
		
		Proc_Puzzle.getMaxDisplayTime = function(){
			if (usingUpgrade(2)){
				return 0.4;
			} else if (usingUpgrade(1)){
				return 0.6;
			} else if (usingUpgrade(0)){
				return 0.8;
			} else {
				return 1;
			}
		}
	}
	
	var clickDisplay = {};
	clickDisplay.MAX_TIME = 0.5;
	clickDisplay.time = clickDisplay.MAX_TIME;
	clickDisplay.draw = function(){
		//Only draw in this case
		if (this.time < this.MAX_TIME){
			//1 - x^2
			ctx.globalAlpha = 1 - Math.pow(this.time / this.MAX_TIME, 2);
			this.rect = this.rect.inflate(dTime * 40, dTime * 40);
			
			drawSphere(this.rect, 'white')
			
			ctx.globalAlpha = 1;
			
			this.time += dTime;
			
			if (this.time > this.MAX_TIME){
				this.time = this.MAX_TIME;
			}
		}
	}
	
	clickDisplay.instantiate = function(){
		const START_SIZE = 6;
		this.rect = new Rect(mx - START_SIZE / 2, my - START_SIZE / 2,
							 START_SIZE, START_SIZE);
		this.time = 0;
	}
	
	resetProcessingPuzzle();
	
	var processingTileSounds = [];
	for (var i = 1; i <= 4; i++){
		processingTileSounds.push(new Audio('sound/processing/beep' + i + '.ogg'));
	}
	
	usingBoughtUpgrade['Processing'] = returnBoughtUpgradeArray();
	
	const PROCESSING_ROBOT_SIZE = 64;
	class ProcessingRobot { //Max is the number of robots in a tier
	    constructor(x){
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
		
		draw(){
		    ctx.fillStyle = 'grey';
		    this.rect.draw();
		    
			if (this.busy){
				ctx.fillStyle = DARKGREY;
			} else {
				ctx.fillStyle = 'green';
			}
			
			this.barRect.draw();
			
			if (this.busy){
				var height = Math.round((this.busyTimer / this.getProcessingTime()) * this.barRect.height);
				ctx.fillStyle = 'red';
				ctx.fillRect(this.barRect.x, this.barRect.bottom() - height,
							 this.barRect.width, height);
			}
		}
		
		update(){
			if (this.busy){
			    if (this.start){
                    this.busyTimer -= dTime;
                    
                    if (this.busyTimer <= 0){
                        this.containedSalt.payProcessing(); //Pay user for having waste processed
                        this.busy = false;
                        this.containedSalt = null;
                        
                    } else if (this.busyTimer > this.getProcessingTime()){
                        //If player buys upgrade which decreases processing time, lower current processing time
                        this.busyTimer = this.getProcessingTime();
                    } 
			    } else {
                    this.containedSalt.draw();
                    this.containedSalt.rect.y += this.getIntakeSpeed() * dTime;
                    
                    if (this.containedSalt.rect.y > this.rect.y){
                        this.start = true;
                    }
			    }
            
			} else {
				for (var i = 0; i < radioactiveSalts.length; i++){
					//Don't try to absorb salt if selected or already pure
					if (radioactiveSalts[i].purified ||
						radioactiveSalts[i].id == Proc_Puzzle.saltID){
						continue;
					}
					
					//Check if robot can absorb waste
					//Salt is to left of robot's left and salt's right is left of robot's right
					if (radioactiveSalts[i].rect.x > this.rect.x &&
						radioactiveSalts[i].rect.right() < this.rect.right()){
						
						this.containedSalt = radioactiveSalts[i];
						radioactiveSalts.splice(i, 1);
						
						this.busy = true;
						this.start = false;
						this.busyTimer = this.getProcessingTime();
						break;
					}
					
				}
			}
		}
        
        getIntakeSpeed(){
            //Player has final upgrade, processing time of 5 seconds
            if (usingUpgrade(8)){
                return 300;
            } else if (usingUpgrade(7)){
                return 150;
            } else if (usingUpgrade(6)){
                return 100;
            } else {
                return 50;
            }
        }
		getProcessingTime(){
			//Player has final upgrade, processing time of 5 seconds
			if (usingUpgrade(8)){
				return 8;
			} else if (usingUpgrade(7)){
				return 16;
			} else if (usingUpgrade(6)){
				return 24;
			} else {
				return 30;
			}
		}
	}
	
	var processingTierOneRobots = [];
	processingTierOneRobots.push(new ProcessingRobot(w * 2/7));
	processingTierOneRobots.push(new ProcessingRobot(w * 5/7));
	
	var processingTierTwoRobots = [];
	processingTierTwoRobots.push(new ProcessingRobot(w * 1/7));
	processingTierTwoRobots.push(new ProcessingRobot(w * 6/7));
	
	var processingTierThreeRobots = [];
	processingTierThreeRobots.push(new ProcessingRobot(w * 3/7));
	processingTierThreeRobots.push(new ProcessingRobot(w * 4/7));
	
	//Corrosion
    var corrosionHealthBar = new BottomBar('Left', 'Up', 'red', 'Pipe Strength');
    var corrosionConcentrationBar = new BottomBar('Right', 'Up', 'red', 'Corrosion Concentration');
    
    var corrosionLaserBar = new BottomBar('Right', 'Down', 'green', 'Laser Strength');
    var corrosionShipBar = new BottomBar('Right', 'Down', 'green', 'Ship Charge');
     
    //Options
    var laserMode = true;
    
    var corrosionHealth;
    var corrosionLaserStrength;
	
	usingBoughtUpgrade['Corrosion'] = returnBoughtUpgradeArray();
	
	class SpaceObject {
		basicDraw(colour){
			const cx = this.rect.centerx();
			const cy = this.rect.centery();
			
			ctx.strokeStyle = colour;
			setDash(this.dashed);
			ctx.beginPath();
			
			ctx.moveTo(this.pointList[0].x + cx, this.pointList[0].y + cy);
			for (var i = 1; i < this.pointList.length; i++){
				ctx.lineTo(this.pointList[i].x + cx, this.pointList[i].y + cy);
			}
			
			ctx.closePath();
			ctx.stroke();
		}
        
        checkRemove(){
            //Remove off screen
            if (this.rect.right() < 0 || //Left of screen 
                this.rect.x > w || //Right of screen
                this.rect.bottom() < 0 || //Top of screen
                this.rect.y > MAIN_SCREEN_HEIGHT){ //Bottom
                
                this.toBeRemoved = true;
            }
        }
        
		move(){
            const MAX_SPEED = 250;
            if (this.dx > MAX_SPEED){
                this.dx = MAX_SPEED;
            } else if (this.dx < -MAX_SPEED){
                this.dx = -MAX_SPEED;
            }
            if (this.dy > MAX_SPEED){
                this.dy = MAX_SPEED;
            } else if (this.dy < -MAX_SPEED){
                this.dy = -MAX_SPEED;
            }
		    
			this.rect.x += this.dx * dTime;
			this.rect.y += this.dy * dTime;
			
			if (this.rect.right() < 0){ //To left of screen
				this.rect.x = w;
			} else if (this.rect.x > w){ //Right
				this.rect.x = -this.rect.width;
			}
			
			if (this.rect.bottom() < 0){ //Top
				this.rect.y = MAIN_SCREEN_HEIGHT;
			} else if (this.rect.y > MAIN_SCREEN_HEIGHT){ //Bottom
				this.rect.y = -this.rect.height;
			}
		}
        
        //KLUDGE - only AICrossHair, AIShip use approach
        //       - only PlayerCrossHair, PlayerShip use control
        control(){
			const PLAYER_SPEED = 300;
            if (holdW){
                this.dy -= PLAYER_SPEED * dTime;
            } else if (holdS){
                this.dy += PLAYER_SPEED * dTime;
            }
            if (holdA){
                this.dx -= PLAYER_SPEED * dTime;
            } else if (holdD){
                this.dx += PLAYER_SPEED * dTime;
            }
        }
        
        approach(distance){
            var newDistance;
            var closestID = -1;
            var tempDistance;
            
            for (var i = 0; i < asteroids.length; i++){
                //Find nearest asteroid
                
                if (this.checkViability(asteroids[i]) &&
                    //Don't go after asteroids that'll be removed this frame
                    !asteroids[i].toBeRemoved){
                    
                    newDistance = dist(asteroids[i].rect, this.rect);
                    
                    if (closestID == -1 || newDistance < tempDistance){
                        closestID = i;
                        tempDistance = newDistance;
                    }
                }
            }
            
            if (closestID != -1){
                var currentDistance = dist(asteroids[closestID].rect, this.rect);
                var buffer = 0.5 * distance;
                
				//TODO, try * 2, the * 10 matches a direct 50 multiply of the old, / 5
                if (currentDistance > distance + buffer){
                    this.dx = (asteroids[closestID].rect.centerx() - this.rect.centerx()) * 10;
                    this.dy = (asteroids[closestID].rect.centery() - this.rect.centery()) * 10;
                }
                else if (currentDistance < distance - buffer){
                    this.dx = (asteroids[closestID].rect.centerx() + this.rect.centerx()) * 10;
                    this.dy = (asteroids[closestID].rect.centery() + this.rect.centery()) * 10;
                }
            }
            
            return closestID;
        }
	}

	class Ship extends SpaceObject {
	    constructor(){
	        super();
    	    this.rect = new Rect(w / 2, h / 2, 50, 50)
            this.rotation = 0;
            
            this.MAX_CHARGE = 6;
            this.SIZE = 16;
            
            this.CHARGE_BAR_WIDTH = 50;
            this.CHARGE_BAR_HEIGHT = 10;
            
            this.dx = 0;
            this.dy = 0;
            this.charge = this.MAX_CHARGE;
            
            this.invincibleTimer = 5;
	    }
        
		draw(){
			//Connecting these points traces out ship
			this.pointList = [];
			var size;
			
			for (var angle of [0, 140, 220]){
				var temp = rotatePoint(0, 0, 0, -this.SIZE,
									   //"angle" is in degrees, this.rotation in radians and clockwise from vertical
									   angle * TAU / 360 + this.rotation + TAU / 4
									   );
                
                temp.y *= -1; //Flip y coordinates so rotations are done in conventional math form but match screen
                
				this.pointList.push(temp);
			}
			
			if (this.invincibleTimer > 0){
			    ctx.fillStyle = 'gold';
			} else {
			    ctx.fillStyle = 'aqua';
			}
			this.basicDraw(ctx.fillStyle);
			
			drawBar(this.charge, this.MAX_CHARGE, this.CHARGE_BAR_WIDTH,
			        this.CHARGE_BAR_HEIGHT, this.rect, 'orange');
		}
		
		chargeShip(){
		    this.charge += dTime * this.chargeRate; //One bullet charge per seconds
		    if (this.charge > this.MAX_CHARGE){
		        this.charge = this.MAX_CHARGE;
		    }
		}
		
        shoot(){
            if (this.charge > 1){
                bullets.push(new Bullet(this.getTipCoords(), this.rotation));
                this.charge -= 1;
            }
        }
        
        getTipCoords(){
            var angle = 0;
            
            var temp = rotatePoint(0, 0, 0, -this.SIZE,
                                   //"angle" is in degrees, this.rotation in radians and clockwise from vertical
                                   angle * TAU / 360 + this.rotation + TAU / 4
                                   );
            
            temp.y *= -1; //Flip y coordinates so rotations are done in conventional math form but match screen
            
            return {x: this.rect.centerx() + temp.x,
                    y: this.rect.centery() + temp.y};
        }
	}
	
	class PlayerShip extends Ship {
	    constructor(){
            super();
            this.dashed = false;
            this.chargeRate = 1;	        
	    }
	}
	
	class AIShip extends Ship {
	    constructor(mode){
            super();
            this.dashed = true;
            this.AI_Mode = mode;
            this.chargeRate = 1 / 3;
            
            if (mode == 'Left'){
                this.rect.x = w / 4;
            } else if (mode == 'Right'){
                this.rect.x = w * 3/4;
            }
	    }
	    
	    auto(){
	        var closestID = this.approach(120);
	        
	        //Aim
	        if (closestID != -1){
				//Look into making part of library.js
                var dx = asteroids[closestID].rect.centerx() - this.rect.centerx();
                var dy = asteroids[closestID].rect.centery() - this.rect.centery();
	            
    	        this.rotation = Math.atan2(dy,dx);
    	        
    	        if (dist(asteroids[closestID].rect, this.rect) < 100){
    	            this.shoot();
    	        }
	        }
	    }
		
		checkViability(asteroid){
			return asteroid.type == 'Small' && checkPositionViability(asteroid, this.AI_Mode);
		}
	}
	
	function checkPositionViability(target, AI_Mode){
		if (AI_Mode == 'Centre'){
			return true;
		} else if (AI_Mode == 'Left'){
			return target.rect.x < w / 2;
		} else if (AI_Mode == 'Right'){
			return target.rect.right() > w / 2;
		} else {
			prompt('checkPositionViability Error');
		}
	}
	
	class CorrosionCrossHair extends SpaceObject {
        constructor(){
            super();
        
            this.rect = new Rect(w / 2, h / 2, 1, 1);
            
            this.dx = 0;
            this.dy = 0;
            this.laserOn = false;
        }
        
        draw(){
            if (this.laserOn){
                var frame = Math.round(Math.random() * corrosionLaserStrength * 8);
                drawExplosionImage(frame, this.rect.x, this.rect.y);
            }
            
            drawCrossHair(this.rect.centerx(), this.rect.centery(),
                          this.dashed, this.radius);
        }
	}
    
    class PlayerCrossHair extends CorrosionCrossHair {
        constructor(){
            super();
            this.dashed = false;
            this.radius = w;
        }
		
		getPower(){
			return 50 * dTime;
		}
    }
    
	const AI_LASER_MULTIPLIER = 1 / 2;
    class AICrossHair extends CorrosionCrossHair {
        constructor(mode){
            super();
            this.dashed = true;
            this.radius = 100;
            this.AI_Mode = mode;            
        }
        
        auto(){
            //Makes the laser look like it's scanning the asteroid surface back and forth
            var closestID = this.approach(16);
            
			this.laserOn = false;
            if (closestID != -1 &&
                dist(asteroids[closestID].rect, this.rect) < asteroids[closestID].rect.width &&
				corrosionLaserStrength > 0.35){ //Don't fire when charge is 35%
				
				this.laserOn = true;
            }
        }
		
		getPower(){
			var power = 20 * AI_LASER_MULTIPLIER;
			if (usingUpgrade(2)){
				power *= 2;
			}
			
			return power * dTime;
		}
		
		checkViability(asteroid){
			//getPositionViability is defined at each instance
			return asteroid.type == 'Large' && checkPositionViability(asteroid, this.AI_Mode);
		}
    }
    
	//ObjectRect - player's ship, asteroids, etc
	function drawBar(value, maxValue, barWidth, barHeight, objectRect, barColour){
	    var barOuterRect = new Rect(objectRect.centerx() - barWidth / 2, //x
	                                objectRect.y - barHeight * 2,
	                                barWidth, barHeight
	                                );
	    
        //Set bar coordinates
        var barInnerRect = barOuterRect.inflate(-5, -5);
        
        //Display bar
        ctx.fillStyle = 'black';
        barOuterRect.draw();
        ctx.fillStyle = 'grey';
        barInnerRect.draw();
        
        ctx.fillStyle = barColour;
        
        ctx.fillRect(barInnerRect.x, barInnerRect.y,
                     barInnerRect.width * value / maxValue,
                     barInnerRect.height);
	}
    
    const ASTEROID_HEALTH_BAR_WIDTH = 100;
    const ASTEROID_HEALTH_BAR_HEIGHT = 15;
    const MAX_ASTEROID_SPEED = 200;
    
	class Asteroid extends SpaceObject {
        constructor(x, y, size, sideCount){
            super();
            
            this.toBeRemoved = false;
            this.rect = new Rect(x, y, size, size);
            
            this.maxHealth = this.getMaxHealth(size);
            
            this.health = this.maxHealth;
            //Connecting these points traces out an asteroid
            this.pointList = [];
            
            var angle = randUniform(0, 360);
            var speed = randUniform(50, MAX_ASTEROID_SPEED);
            
            this.dx = Math.cos(angle) * speed;
            this.dy = Math.sin(angle) * speed;
            
            for (var i = 0; i < sideCount; i++){
                var temp = rotatePoint(0, 0, 0, -size,
                                       i * (360 / (sideCount - 1)) * 360 / TAU
                                       );
                
                //Randomize points
                this.pointList.push({x: Math.round(temp.x + randUniform(-size/2, size/2)),
                                     y: Math.round(temp.y + randUniform(-size/2, size/2))});
            }
        }
		
		getMaxHealth(size){
            var baseHealth = Math.pow(size, 2)
            //Pipe quality upgrades
            if (usingUpgrade(6)){
                baseHealth *= 0.8;
            }

            if (usingUpgrade(7)){
                baseHealth *= 0.75;
            }
            
            if (usingUpgrade(8)){
                baseHealth *= 0.5;
            }
            
            return baseHealth;
		}
		
		draw(){
			this.basicDraw(this.colour); //Draw asteroid
			if (this.maxHealth != this.health){
				drawBar(this.health, this.maxHealth, ASTEROID_HEALTH_BAR_WIDTH, 
				        ASTEROID_HEALTH_BAR_HEIGHT, this.rect, 'red');
			}
		}
		
		explode(){
			explode(this.rect);
			this.toBeRemoved = true;
            var particleCount = randint(50, 60);
            
            //Tiny pieces coming off asteroid
            for (var i = 0; i < particleCount; i++){
                asteroids.push(new AsteroidParticleFX(this));
            }
		}
	}
	
	class LargeAsteroid extends Asteroid {
	    constructor(x, y){
            var size = randint(25, 35);
            var sideCount = randint(5, 8); //TODO - fix bug with even side counts
            sideCount = 7;
            
            super(x, y, size, sideCount);
            
            this.colour = 'green';
            this.type = 'Large';
            this.dashed = false;
	    }
	}
	
	//Produced by blowing up large asteroid
	class SmallAsteroid extends Asteroid {
	    constructor(largeAsteroid){
            var size = randint(10, 15);
            var sideCount = 7;
            
            var x = largeAsteroid.rect.centerx();
            var y = largeAsteroid.rect.centery();
            
            super(x, y, size, sideCount);
            
            this.colour = 'red';
            this.type = 'Small';
            this.dashed = false;
	    }
	}
	
	//Spawned when blowing up any asteroid
	class AsteroidParticleFX extends Asteroid {
	    constructor(originAsteroid){
            var size = randint(2, 7);
            var sideCount = randint(5, 8);
            
            var x = originAsteroid.rect.centerx();
            var y = originAsteroid.rect.centery();
            
            super(x, y, size, sideCount);
            
            this.colour = 'white';
            this.type = 'Tiny';
                        
            this.despawnTimer = randUniform(0, 3);
            
            if (randint(0, 1)){
                this.dashed = true;
            } else {
                this.dashed = false;
            }	        
	    }
	    
	    move(){
            this.checkRemove();
            
            this.rect.x += this.dx * dTime;
            this.rect.y += this.dy * dTime;
	    }
	}
	
	const BULLET_VISUAL_LENGTH = 10;
	const BULLET_HIT_LENGTH = 10;
	const BULLET_SPEED = 800;
	
	class Bullet extends SpaceObject {
	    constructor(shipTipCoords, shipRotation){
            super();
            
            this.rect = new Rect(shipTipCoords.x - BULLET_HIT_LENGTH / 2,
                                 shipTipCoords.y - BULLET_HIT_LENGTH / 2,
                                 BULLET_HIT_LENGTH, BULLET_HIT_LENGTH);
           
            this.rotation = shipRotation;
            
            this.dx = BULLET_SPEED * Math.cos(this.rotation);
            this.dy = BULLET_SPEED * Math.sin(this.rotation);
	    }
	    
        move(){
            this.rect.x += this.dx * dTime;
            this.rect.y += this.dy * dTime;
        }
        
        draw(){
            //Connecting these points traces out bullet
            var pointOne = rotatePoint(0, 0, 0, -BULLET_VISUAL_LENGTH,
                                       this.rotation + TAU / 4
                                       );
            
            var pointTwo = rotatePoint(0, 0, 0, -BULLET_VISUAL_LENGTH,
                                       //Point 2 is 180 degrees from point 1
                                       this.rotation + TAU * 3/4
                                       );
            
            pointOne.y *= -1; //Flip y coordinates so rotations are done in conventional math form but match screen
            pointTwo.y *= -1;
            
            this.pointList = [pointOne, pointTwo];
            this.basicDraw('orange');
        }
	}
	
	var playerShip;
	var crossHair;
	
	var AI_CentreCrossHair;
	var AI_LeftCrossHair;
	var AI_RightCrossHair;
	
    var AI_CentreShip;
    var AI_LeftShip;
    var AI_RightShip;
	
	var asteroids;
	var bullets;
	
	var holdW = false;
	var holdS = false;
	var holdA = false;
	var holdD = false;
	
	//Endgame
    var endGame;
    var endGameTimer;
    
    var classifiedPapers = new Image();
    classifiedPapers.src = 'images/classified.png';
	
	var deskBackground = new Image();
	deskBackground.src = 'images/desk.png';
	
	const ENDING_TEXT = {'Ending - Core': ('As a result of your actions, the United Nations now '
                                         + 'knows that the rogue state was only 3 months '
                                         + 'away from developing nuclear weapons. However, no '
                                         + 'one will ever know your story...'),
                         'Ending - Time Out': ('Time ran out and as a result, you failed to destroy'
                                             + ' the reactor in time. The next shift took over '
                                             + 'unaware of the knowledge you had gained. However, '
                                             + 'only the following day later, fingerprints were '
                                             + 'found on the classified documents and you spent'
                                             + ' the rest of your life in solitary confinement.'
                                             + ' The nuclear weapons program marched steadily '
                                             + 'forward for the rogue state. You helped them.'),
                         'Ending - Shielding': ('Your attempt to sabotage the plant was'
                                             +  ' a failure, you were never seen again.'),
                         'Ending - Processing': ('Your attempt to sabotage the nuclear plant was'
                                             +  ' a failure, the first nukes will be ready in 4 months.'),
                         'Ending - Corrosion': ('Your attempt to sabotage the militarized power plant was'
                                             +  ' a failure, you and your family were disappeared.')}
	
    var restartGameButton = new SmallButton(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, 'Restart Game');
    restartGameButton.rect.y = h - restartGameButton.rect.height;
    
    var fadeAwayButton = new SmallButton(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT / 2, 'Fade Away...');
    //Center on the center bottom of screen
    fadeAwayButton.rect.setCenterx(w / 2);
    fadeAwayButton.rect.y = h - fadeAwayButton.rect.height;
    
    class NewsPaperClass {
        constructor(){
            var horizontalMargin = w / 6;
            var verticalMargin = h / 6;
        
            this.rect = new Rect(horizontalMargin, verticalMargin - 50,
                                 w - horizontalMargin * 2, h - verticalMargin * 2);
            
            
            this.picture = new Image();
            this.picture.src = 'images/atom.gif';
            
            this.COLUMNS = [];
            
            for (var i = 0; i < 3; i++){
                this.COLUMNS.push(this.rect.x + this.rect.width * i / 3.3 + 30);
            }
            
            this.TEXT_Y = this.rect.y + 200;
            this.TEXT_H = this.rect.height - 200;
            
            this.MARGIN = 5;
            
            this.TITLES = {'Ending - Core': 'A Rogue Nuclear Program',
                           'Ending - Shielding': 'Saboteur!',
                           'Ending - Processing': 'Minor Setbacks',
                           'Ending - Corrosion': 'A March Forward'};
        }
        
        draw(){
            ctx.fillStyle = 'rgb(240, 240, 240)';
            this.rect.draw();
            
            ctx.fillStyle = 'rgb(5, 5, 5)';
            ctx.font = '36pt NotoSans-Regular';
            
            if (screen == 'Ending - Core'){
                var title = 'The Beta News';
                
            } else {
                var title = 'The Delta News';
            }
            
            ctx.fillText(title, w / 2, this.rect.y + 40);
            
            ctx.fillRect(0, this.rect.y + 55, w, 1);
            ctx.fillRect(0, this.rect.y + 60, w, 1);
            
            ctx.font = '20pt NotoSans-Regular';
            ctx.fillText(date, w / 2, this.rect.y + 85)
            
            ctx.fillRect(0, this.rect.y + 90, w, 1);
            ctx.fillRect(0, this.rect.y + 95, w, 1);
            
            ctx.font = '40pt NotoSans-Regular';
            ctx.fillText(this.TITLES[screen], w / 2, this.rect.y + 160);
            
            ctx.drawImage(this.picture, this.rect.x + 470,
                          this.rect.y + 220, 200, 200);
            
            for (var column of this.COLUMNS){
                ctx.fillRect(column, this.TEXT_Y, 1, this.TEXT_H);
            }
            
            ctx.font = '12pt NotoSans-Regular';
            ctx.textAlign = 'start';
            wrapText(NEWS_LEFT_TEXT[screen], this.COLUMNS[0] + this.MARGIN,
                     this.TEXT_Y, this.COLUMNS[1] - this.COLUMNS[0] - this.MARGIN * 2, this.TEXT_H);
                     
            wrapText(NEWS_RIGHT_TEXT[screen], this.COLUMNS[1] + this.MARGIN,
                     this.TEXT_Y, this.COLUMNS[2] - this.COLUMNS[1] - this.MARGIN * 2, this.TEXT_H);
            
            ctx.textAlign = 'center';
        }
    }
    
    const NEWSPAPER = new NewsPaperClass();
    
    var NEWS_LEFT_TEXT = {'Ending - Shielding': ('Last evening, the capital\'s main nuclear power plant '
                                               + ' was shutdown over concerns of radiation leakage from '
                                               + 'the shielding. The spokesperson has said that there is '
                                               + 'no reason for concern with regards to people\'s health '
                                               + 'due to only minute amount of radiation having escaped.'),
                          'Ending - Processing': ('Last evening, a breach in the pipes of the nation\'s '
                                                + 'most important nuclear power plant caused an unexpected'
                                                + ' shutdown of the reactor. A spokesman for the event '
                                                + 'stated that there was no risk to human health. However,' 
                                                + ' "it is a step back for the world of clean energy".'),
                          'Ending - Corrosion': ('The nuclear power plant is functioning better than '
                                               + 'ever after a series of upgrades by our dedicated workers. '
                                               + ' The promise of clean energy will help our country march '
                                               + 'steadily forward. A prediction by the energy department '
                                               + 'is that an increase in uranium mining is necessary'
                                               + ' and would also create more jobs.')}; 
    
    const NEWS_RIGHT_TEXT = {'Ending - Core': ('conclusion that the explosion '
                                             + 'originated from a nuclear power plant. However, '
                                             + 'investigators at the scene soon found evidence that'
                                             + ' rather than generating power, the plant was responsible'
                                             + ' for the creation of nuclear weapons. It is believed that'
                                             + ' incompetence by one of the workers led to the explosion.'), //Bitter sweet ending, saving the world but getting no credit for it
                             'Ending - Shielding': ('To ensure safety, the boss at the plant has confirmed '
                                                 + 'that "the worker responsible for breach no longer '
                                                 + 'works with us."'),
                             'Ending - Processing': ('When asked about possible causes, the spokesman reported'
                                                   + ' negligence on behalf of one of the workers as the cause. '
                                                   + 'In spite of the setback, the government has plans to '
                                                   + 'get the reactor operational in a few months.'),
                             'Ending - Corrosion': ('In the future, new radioactive isotopes can be '
                                                  + 'generated for medical purposes to further advance '
                                                  + 'scientific progress in this new era.')};
    
    var date;
    var eventTime; //Minutes and hours
    
    function setTime(){
        var d = new Date();
        
        date = d.toDateString();
        eventTime = d.toLocaleTimeString();
    }
    
    function getNewsPaperText(){
        NEWS_LEFT_TEXT['Ending - Core'] = ('A large explosion was detected 30 miles west '
                                         + 'of previously unknown military base located in'
                                         + ' a rogue state whose name has '
                                         + 'not yet been released. The blast occured at ' + eventTime
                                         + ' and was picked up by US and Russian satellites. '
                                         + 'Originally mistaken for a nuclear bomb, by both satellites '
                                         + 'and seismometers, further research led to the ');
    }
    
	//min and max are inclusive for both random functions
	function randUniform(min, max){
	    return min + Math.random() * (max - min + 1);
	}
	
	//Chance of true is 1 / odds
	function randChance(odds){
		return Math.random() < 1 / odds;
	}
	
	//Chance of true per second is 1 / odds
	function randDChance(odds){
		//dTime is 2, double odds
		//dTime is 0.5, halve odds
		
		return randChance(odds / dTime);
	}
	
	function randint(min, max){
	    return Math.floor(randUniform(min, max));
	}
	
	var SHIELDING_MAX_NEUTRON_YSPEED = (5 + 4 / 3) * 50;
	
	function Processing_createNewFluid(){
		var dx;
		var dy;
		var y;
	
		//Randomly create harmless non-interactive fluid particles (Salt objects)
		dx = (Math.random() * 8 + 2.5) * 50 / 3;
		dy = randUniform(-50/3, 50/3);
		
		y = randint(CONVEYOR_BELT.innerRect.y, CONVEYOR_BELT.innerRect.bottom() - BALL_SIZE);
		
		if (randDChance(3 / 50)){ //Make fluid particles occur semi-frequently
			saltParticles.push(new Salt(y, dx, dy));
		}
		
		var chance = 12;
		if (usingUpgrade(2)){
			chance = 5;
		} else if (usingUpgrade(1)){
			chance = 7.5;
		} else if (usingUpgrade(0)){
			chance = 10;
		}
		
		var saltWastePresent = false;
		for (var radioactiveSalt of radioactiveSalts){
		    if (!radioactiveSalt.purified){
		        saltWastePresent = true;
		        break;
		    }
		}
		
		//When there are no radioactive salts, increase chance of generation by 1000%
		var multipliedChance = chance / 10;
		if ((saltWastePresent && randDChance(chance)) ||
		
		    (!saltWastePresent && randDChance(multipliedChance))){
		    
			//Randomly create interactive fluid particles (SaltWaste objects)
			radioactiveSalts.push(new SaltWaste());
		}
	}

	const DEFAULT_FONT = '22pt NotoSans-Regular';
	
	/////////////////////////////////
	////////////////////////////////
	////////	GAME INIT
	///////	Runs this code right away, as soon as the page loads.
	//////	Use this code to get everything in order before your game starts 
	//////////////////////////////
	/////////////////////////////
	
	function init()
	{
		ctx.font = DEFAULT_FONT;
		ctx.textAlign = 'center';
		
		pastScreens = [];
		setScreen('Main Menu');
	   
		event = 'Start';
		endGame = false;
		highEnergyNeutrons = false; //Toggled later in game
		//Stages - Off, Low, Medium, High
		shieldingFluxStage = 'Off';
		shieldingFluxTimer = 0;
		tritiumUpgradeRequired = false;
		
		levelIncome = {};
		
		internationalSuspicion = 0;
		suspicion['United States'] = 0;
		suspicion['China'] = 0;
		suspicion['Japan'] = 0;
		suspicion['Germany'] = 0;
		suspicion['Brazil'] = 0;
		suspicion['Russia'] = 0;
		
		endGameTimer = 180; //Seconds
		unlockedLevels = [];
		
		upgradeCost = {};
		
		for (var string of MINIGAME_SCREENS){
            allBoughtUpgrades[string] = [];
            initialized[string] = false;
            levelIncome[string] = 0;
		
			upgradeCost[string] = [];
			
			for (var j = 0; j < upgradeBoxes.length; j++){
				upgradeCost[string].push({});
				
				for (var k = 0; k < COUNTRIES.length; k++){
					//Random multiplier - 90% to 110%
					upgradeCost[string][j][COUNTRIES[k]] = Math.random() / 5 + 0.9;
				}
			}
		}
	
	//////////
	///STATE VARIABLES
	
	//////////////////////
	///GAME ENGINE START
	//	This starts your game/program
	//	"paint is the piece of code that runs over and over again, so put all the stuff you want to draw in here
	//	"60" sets how fast things should go
	//	Once you choose a good speed for your program, you will never need to update this file ever again.
	
	requestAnimationFrame(paint);
	setInterval(endTimer, 1000); //Once a second
	}
	var start = null;
	var dTime = 0;
	init();
	


	
	
	
	///////////////////////////////////////////////////////
	//////////////////////////////////////////////////////
	////////	Main Game Engine
	////////////////////////////////////////////////////
	///////////////////////////////////////////////////
	function paint(timestamp){
		if (!start) start = timestamp;
		dTime = (timestamp - start) / 1000;
		//console.log(dTime);
		
	    //Draw white border
		ctx.fillStyle = 'white';
		ctx.fillRect(0,0, w, h);
		
        //Menu screens have dark grey background, default is black
        if (screen == 'Main Menu' || screen == 'Options'){
            ctx.fillStyle = 'rgb(30, 30, 30)';
        } else {
            ctx.fillStyle = 'black';
        }
		
		ctx.fillRect(SCREEN_BORDER, SCREEN_BORDER,
					 w - SCREEN_BORDER * 2,
					 h - SCREEN_BORDER * 2);
	
		if (screen == 'Main Menu'){
			mainMenuPlayButton.draw();
			mainMenuOptionButton.draw();
			
			ctx.drawImage(logoImage, w / 2 - logoImage.width / 2, 10);
			
			ctx.textAlign = 'right';
			ctx.font = '10pt NotoSans-Regular';
			ctx.fillText('Warning - nuclear reactor operators do not actually listen to music while playing with flashing colours and lights.', w - 10, h - 10);
			
			ctx.textAlign = 'center';
			ctx.font = DEFAULT_FONT;
		} 
        else if (screen == 'Options'){
            optionSoundButton.draw();
            optionMusicButton.draw();
			optionExplosionsButton.draw();
			optionBlurButton.draw();
            backButton.draw();
        }
        else if (screen == 'Corrosion Docs'){
            ctx.drawImage(deskBackground, 0, 0, w, h);
            ctx.drawImage(classifiedPapers, 0, 0, w, h);
            
            backButton.draw();
        }
        else if (screen == 'Upgrade'){
            inGameBackButton.draw();
            
            if (currentGame == 'Shielding'){
                repairShieldingButton.draw();
            } else {
                repairHealthButton.draw();
            }
            
            if (tritiumUpgradeRequired && currentGame == 'Processing'){
                upgradeTritiumButton.draw();
            }
            
            drawInfoBar();
            
			for (var u_button of upgradeToggleButtons){
				u_button.draw(currentGame);
			}
			
			drawToggleUpgradeText();
            
            for (var u_label of upgradeBoxLabels){
                u_label.draw();
            }
            
            //Draw upgrade boxes without text
			for (var i = 0; i < upgradeBoxes.length; i++){
				upgradeBoxes[i].draw(i);
				if (debugging) ctx.fillText(i, upgradeBoxes[i].rect.centerx(), upgradeBoxes[i].rect.centery());
			}
            
            for (var i = 0; i < upgradeInfoBoxes.length; i++){
                upgradeInfoBoxes[i].draw(i);
            }
            
            ctx.fillStyle = 'grey';
			
			var text = getGameText(currentGame);
			ctx.font = '20pt NotoSans-Regular';
			ctx.fillText(text + ' Upgrades', w / 2, 40);
            
			ctx.font = DEFAULT_FONT;
            
        } else if (screen == 'Globe'){
            ctx.drawImage(earthImage, 0, 0, w, h);
            ctx.fillStyle = 'white';
            ctx.font = '20pt NotoSans-Regular';
            ctx.fillText('Nuclear Part Suppliers', w / 2, 30);
            ctx.font = DEFAULT_FONT;
            
			mouseoverCountry = null;
			
			for (var country of COUNTRIES){
				countryButton[country].draw();
				
				if (countryButton[country].rect.mouseOver()){
					mouseoverCountry = country;
				}
			}
            
            if (mouseoverCountry != null){
                ctx.fillStyle = 'black';
                ctx.globalAlpha = 0.8;
                ctx.fillRect(globeInfoRect.x, globeInfoRect.y, globeInfoRect.width, globeInfoRect.height);
                
                ctx.fillStyle = 'white';
                ctx.globalAlpha = 1;
                ctx.fillText(mouseoverCountry, globeInfoRect.centerx(), globeInfoRect.y + 30);
                
                ctx.font = '16pt NotoSans-Regular';
                
                ctx.textAlign = 'start';
                
                ctx.fillText('GDP - ' + GDP[mouseoverCountry], globeInfoRect.x + 20, globeInfoRect.y + 60);
                ctx.fillText('Population - ' + population[mouseoverCountry], globeInfoRect.x + 20, globeInfoRect.y + 80);
				ctx.fillText('Suspicion - ' + getPercentage(suspicion[mouseoverCountry]), globeInfoRect.x + 20, globeInfoRect.y + 100);
				ctx.fillText('Part Cost Multiplier - ' + getPercentage(getItemCostPercentage(mouseoverCountry)), globeInfoRect.x + 20, globeInfoRect.y + 120);
				ctx.fillText('Total Part Cost - $' + Math.round(baseUpgradeCost * getItemCostPercentage(mouseoverCountry)), globeInfoRect.x + 20, globeInfoRect.y + 140);
                
                ctx.textAlign = 'center';
				
				upgradeSuspicionBar.progress = suspicion[mouseoverCountry];
				upgradeSuspicionBar.draw();
            }
            
            ctx.font = DEFAULT_FONT;
            
            backButton.draw();
        } 
        
        else if (MINIGAME_SCREENS.includes(screen)){
            drawInfoBar();
			
			for (var u_button of upgradeToggleButtons){
				u_button.draw(screen);
			}
			
			drawToggleUpgradeText();
        }
        
        if (paused){
            pausedResumeButton.draw();
            pausedRestartButton.draw();
			pausedInstructionButton.draw();
            pausedExitButton.draw(); 
            
            if (screen == 'Core' || screen == 'Shielding'){
                upgradeProgressBar.draw();
            }
        } else if (showInstructions){
			ctx.fillStyle = DARKGREY;
			instructionRect.draw();
			
			if (screen == 'Core'){
				var text = ('Deflect neutrons using the left paddle (W-D controls). Each neutron '
							+ 'has a random chance of fissioning into two and creating heat. When '
							+ 'core temperature reaches 50%, electricity is generated which '
							+ 'increases upgrade progress. Balance the amount of neutrons on screen'
							+ ' by deflecting and allowing certain neutrons to leave the screen so '
							+ 'temperature does not rise over 100%. Otherwise, core strength will '
							+ 'decrease resulting in a potential nuclear meltdown. The '
							+ 'closer core temperature is to 100%, the greater the rate electricity'
							+ ' is generated and the harder the reaction becomes to control. Generating'
							+ ' electricity fills the Upgrade Progress bar allowing you to buy upgrades. The '
							+ 'right paddle is automated to help manage the reactor.');
			} else if (screen == 'Shielding'){
				var text = ('Neutron embrittlement is a serious issue in nuclear '
						  + 'reactors as exposure to neutrons can damage components. '
						  + 'Use the paddle (A - D controls) to reflect incoming neutrons to protect '
						  + 'the shielding. Make sure you buy upgrades such as Shielding'
						  + ' Contracts in order to regenerate the shielding and reflect'
						  + ' more neutrons. If any neutron passes the shielding, '
						  + 'escaping into the environment, the reactor will be shutdown.'
						  + ' Reflect neutrons to earn money, faster neutrons are worth more.');
			} else if (screen == 'Processing'){
			    var text = ('Operating a nuclear reactor causes harmful particles'
			              + ' to build up in the pipes. Process waste by clicking'
			              + ' on large circles. Recreate the pattern seen when '
			              + 'the border turns white to deactivate the waste. '
			              + 'Failure to deactivate the waste will result in '
			              + 'it recirculating, resulting in exponentially more'
			              + ' waste in the future and damage to the reactor.')
			} else if (screen == 'Corrosion'){
			    var text = ('Corrosion is another serious issue for pipes in'
			              + ' a nuclear reactor. Large pieces of corrosion can '
			              + 'be deactivated with the laser. But smaller pieces will'
			              + ' require finer control. Switch modes by pressing shift'
			              + ' and activate by pressing space. Ensure that corrosion'
			              + ' concentration does not exceed 100% or the pipes will '
			              + 'degrade. The cost to repair the deconstructor'
			              + ' is about $2,500.');
			}
			else {
				var text = 'placeholder';
			}
			
			ctx.fillStyle = 'white';
			//w / 2 centres text
			ctx.font = '16pt NotoSans-Regular'; 
			wrapText(text, w / 2, instructionRect.y + 80, instructionRect.width);
            
            ctx.fillText('Press Esc to close.', instructionRect.centerx(), instructionRect.bottom() - 10);
            
			//Additional instructional text
			if (screen == 'Processing'){
			    ctx.textAlign = 'start';
			    ctx.fillStyle = 'lightblue';
			    ctx.fillText('Oxides - 4 Stages', instructionRect.x + 20, instructionRect.centery() + 80);
			    ctx.fillStyle = 'red';
			    ctx.fillText('Sulphur - 5 Stages', instructionRect.x + 20, instructionRect.centery() + 110);
			    ctx.fillStyle = 'grey';
			    ctx.fillText('Metal Impurities - 6 Stages', instructionRect.x + 20, instructionRect.centery() + 140);
			    ctx.textAlign = 'center';
			}
			
			ctx.font = DEFAULT_FONT;
			
			
		} else if (lostGame){
			ctx.fillStyle = 'red';
			
			if (screen == 'Core'){
				ctx.fillText('Reactor explosion. Press Esc.', w/2, h/2);
				
				if (endGame){
				    coreMusic.volume = 0;
				    radiationSound.volume = 0;
                    setScreen('Ending - Core');
				}
				
			} else if (screen == 'Shielding'){
				ctx.fillText('Radiation escaped into environment. Reactor has been shutdown. Press Esc.', w/2, h/2);
				
				if (endGame){
				    shieldingMusic.volume = 0;
				    setScreen('Ending - Shielding');
				}
            } else if (screen == 'Processing'){
                ctx.fillText('Impurities, oxides, and sulphur compounds damaged the pipes. Press Esc.', w/2, h/2);
                
                if (endGame){
                    processingMusic.volume = 0;
                    setScreen('Ending - Processing');
                }
            } else if (screen == 'Corrosion'){
                ctx.fillText('Corrosion has built up in the pipes, causing them to fail. Press Esc.', w/2, h/2);
                
                if (endGame){
                    corrosionMusic.volume = 0;
                    setScreen('Ending - Corrosion');
                }
            }
            
            if (endGame){
                endMusic.volume = 0;
                finalMusic.volume = 0.05; //Very quiet
                setTime();
                getNewsPaperText()
            }
			
		} else {
			if (screen == 'Core' || screen == 'Shielding'){
				upgradeProgressBar.draw();
			}
			
			if (MINIGAME_SCREENS.includes(screen)){
				upgradeButton.draw();
                
				//Display heavy water
				if (heavyWaterUsed){
					ctx.globalAlpha = 0.2;
					ctx.fillStyle = 'blue';
					ctx.fillRect(0, 0, w, MAIN_SCREEN_HEIGHT);
				}
				
				ctx.globalAlpha = 1;
			}
			
            if (screen == 'Factory Menu'){
                ctx.fillStyle = 'grey';
                ctx.fillRect(SCREEN_BORDER, SCREEN_BORDER,
                             w - SCREEN_BORDER * 2,
                             h - SCREEN_BORDER * 2);
            
                ctx.drawImage(factoryLayoutImage, 0, 0, w, h);
                
                for (var key of MINIGAME_SCREENS){
                    factoryButtons[key].draw();
                }
				
				factoryFreezePlugButton.draw();
				factoryPump1Button.draw();
				factoryPump2Button.draw();
				if (debugging) factoryButtons['EDT'].draw();
				
            } else if (screen == 'Core'){
                //Make background turn a little red if temperature is too high
                if (coreTemperature / 1000 > 0.7){
                    //70% core temperature -> 0% red background
                    //100% core temperature -> 30% red background
                    //Colour can go beyond 100%, at 170% core temp
                    ctx.globalAlpha = coreTemperature / 1000 - 0.7;
                    ctx.fillStyle = 'red';
                    ctx.fillRect(SCREEN_BORDER, SCREEN_BORDER,
                                 w - SCREEN_BORDER * 2,
                                 h - SCREEN_BORDER * 2);
                    ctx.globalAlpha = 1;                    
                }
				
				//Change geiger counter sound intensity based on radiation
				var temp = coreTemperature / 10; //Varies from 0 to 100
				if (temp > 100){ //If temperature beyond 100%
				    radiationSound.volume = 1;
				    radiationSound.playbackRate = 4;
				}
				
				else if (temp > 30){ //Temperature 30% - 100% , use formula to calculate sound intensity
				    var intensity = 1 / 49 * Math.pow(temp - 30, 2); //Varies 0 to 100
				    radiationSound.volume = intensity / 100;
				    intensity = 1 / 11900 * Math.pow(temp - 30, 2.5) + 0.5; //Varies - (0.5 - 3.945)
				    radiationSound.playbackRate = intensity;
				} else { //Below 30% - no geiger counter sound
				    radiationSound.volume = 0;
				}
				
				//Randomly generate balls
				if (randDChance(9/5)){
                    var dx = randint(100, 250);
                    
                    if (randint(0, 1) == 0){
                        dx *= -1;
                    }
                    //-50 to +50
                    var dy = Math.random() * 100 - 50;
                    
                    coreBalls.push(new Core_Ball(w / 2, randUniform(SCREEN_BORDER, MAIN_SCREEN_HEIGHT - SCREEN_BORDER),
												 dx, dy));
				}
				
                if (leftPaddle.moveUp){
                    leftPaddle.rect.y -= CORE_PADDLE_SPEED;
                } else if (leftPaddle.moveDown){
                    leftPaddle.rect.y += CORE_PADDLE_SPEED;
                }
                
				leftPaddle.checkBounds();
                rightPaddle.checkBounds();
				
                leftPaddle.draw();
                rightPaddle.draw();
                
				//Manage control rods
				controlRodSetting = null;
				
				//If has 3rd upgrade + temperature above 105%
				if (usingUpgrade(5) &&
					coreTemperature / 1000 > 1.05){
					
					controlRodSetting = 'Full';
				}
				
				if (controlRodSetting == null &&
					usingUpgrade(4)){
					
					if (coreTemperature / 1000 > 0.9){
						controlRodSetting = 'High';
					} else if (coreTemperature / 1000 > 0.8){
						controlRodSetting = 'Low';
					}
				}
				
				//1st control rod upgrade, low activity at 90%, overridden by any future upgrades
				if (controlRodSetting == null &&
					usingUpgrade(3) &&
					coreTemperature / 1000 > 0.9){
					
					controlRodSetting = 'Low';
				}
				
				ctx.fillStyle = 'grey';
				if (['Low', 'High', 'Full'].includes(controlRodSetting)){
					drawControlRod(w * 1/3);
					drawControlRod(w * 2/3);
				}
				
				if (controlRodSetting == 'High' || controlRodSetting == 'Full'){
					drawControlRod(w * 1 / 2);
				}
				
				if (controlRodSetting == 'Full'){
					drawControlRod(w * 1 / 5);
					drawControlRod(w * 4 / 5);
				}
				
				//Manage heavy water
				heavyWaterUsed = false;
				
				//If has third upgrade and temp below 70%
				if ((coreTemperature / 1000 < 0.7 &&
					 usingUpgrade(8)) ||
					 
					(coreTemperature / 1000 < 0.5 &&
					 usingUpgrade(7)) ||
					 
					(coreTemperature / 1000 < 0.2 &&
					 usingUpgrade(6))
					 
					){
					
					heavyWaterUsed = true;
				}
				
                for (var ball of coreBalls){
					ball.checkCollision();
                    ball.move();
                    ball.draw();
                    ball.checkRemove();
                    
					if (ball.rect.right() < 0){
						leftNeutronsReleased++;
					} else if (ball.rect.x > w){
						rightNeutronsReleased++;
					}
                }
				
				coreBalls = removeQueuedItems(coreBalls);
				
				var newBalls = []
				for (var ball of coreBalls){
					if (randDChance(4)){
						var x = ball.rect.x;
						var y = ball.rect.y;
						var dx = ball.dx;
						var dy = ball.dy;
						var ball_DY_change = Math.random() * 25;
						var ball_DX_change = Math.random() * 50 / 3;
						
						//Make sure the coreBalls can only accelerate in x-direction
						if (ball.dx > 0){
						    ball.dx += ball_DX_change;
						} else {
						    ball.dx -= ball_DX_change;
						}
						
						ball.dy += ball_DY_change;
						
						newBalls.push(new Core_Ball(x, y, dx, dy - ball_DY_change))
						coreTemperature += 32;
						
						ball.explode();
					}
				}
                
				coreTemperature *= Math.pow(0.99, 50 * dTime); //Decrease temp to 99% every 20ms
				coreTemperatureBar.progress = coreTemperature / 1000;
                
                if (coreTemperature > 500){
                    //If first time - explain heat
                    if (event == 'Beginning Tutorial' &&
                        !infoWindow.visible){
                        beginEvent('Core - Info Heat');
                    }
                }
                
				//Damage reactor if temperature is too high
				if (coreTemperature > 1000){
				    //The higher core temp is, the more quickly the health goes down
				    coreHealth -= (coreTemperature - 1000) / 6 * dTime;
				    
				    ctx.fillStyle = 'orange';
				    ctx.alignText = 'center';
				    ctx.fillText('TEMPERATURE CRITICAL - RELEASE NEUTRONS', w/2, h / 10);
				}
				
				coreHealthBar.progress = coreHealth / 100;
				
				//Temperature must be above 30% in order to generate electricity
				if (coreTemperature > 300){
                    //0 to 1
                    upgradeProgress += Math.pow(coreTemperature - 300, 2.5) / 10000000 * dTime;
                    
                    if (upgradeProgress >= 1){
                        unlockUpgrade.play();
                        
                        upgradeProgress -= 1;
                        levelIncome.Core += 1000;
                    }
				}
				
				upgradeProgressBar.progress = upgradeProgress;
				
				coreBalls = coreBalls.concat(newBalls);
				
				//Has automated left paddle upgrade
				if (usingUpgrade(1)){
					leftPaddle.move();
				}
				
				rightPaddle.move();
				
				if (coreHealth <= 0){
				    reactorExplosion.play();
				    coreHealth = 0;
				    lostGame = true;
				}
			
            } else if (screen == 'Shielding'){
				shieldingTimer += dTime;
				
				var repairShielding = false;
				if (usingUpgrade(8) && shieldingTimer >= 8){
					repairShielding = true;
				} else if (usingUpgrade(7) && shieldingTimer >= 12){
					repairShielding = true;
				} else if (usingUpgrade(6) && shieldingTimer >= 16){
					repairShielding = true;
				}
				
				//Automated paddles
				if (usingUpgrade(4)){
					AI_Left_Sh_Paddle.move()
					AI_Left_Sh_Paddle.draw();
					
					AI_Right_Sh_Paddle.move()
					AI_Right_Sh_Paddle.draw();
				} else if (usingUpgrade(3)){
					AI_Central_Sh_Paddle.move()
					AI_Central_Sh_Paddle.draw();
				}
				
				if (repairShielding){
					shieldingTimer = 0;
					
					//Repair one block in the reactor, start at bottom right move left then up
					shieldingBlocks = repairShield(shieldingBlocks);
				}
				
				shieldingPaddle.move();
                shieldingPaddle.checkBounds();				
				shieldingPaddle.draw();
				
				for (var i = 0; i < shieldingBlocks.length; i++){
					shieldingBlocks[i].draw(i);
				}
				
				//Manage heavy water
				heavyWaterUsed = false;
				
				//If has heavy water upgrade
				if (usingUpgrade(0)){
					heavyWaterUsed = true;
				}
				
				//Regular graphite bars
				if (usingUpgrade(1)){
				    ctx.fillStyle = 'grey';
					drawGraphiteBar(100);
					drawGraphiteBar(200);
				}
				
				//Purified graphite bars
				if (usingUpgrade(2)){
				    ctx.fillStyle = DARKGREY;
					drawGraphiteBar(50);
					drawGraphiteBar(150);
					drawGraphiteBar(250);
				}
				
				if (shieldingFluxStage != 'Off' &&
				    shieldingFluxTimer <= 0){ //Random chance neutron flux starts
				    
				    if (shieldingFluxStage == 'Low'){
				        var chance = 160;
				    } else if (shieldingFluxStage == 'Medium'){
				        var chance = 80;
				    } else if (shieldingFluxStage == 'High'){
				        var chance = 40;
				    }
				    
				    if (randDChance(chance)){
				        shieldingFluxTimer = randint(12, 15); //Seconds
				    }
				}
				
				//Double neutron rate during times of flux
				if ((shieldingFluxTimer <= 0 && randDChance(1)) ||
				    (shieldingFluxTimer > 0 && randDChance(0.4))){
				    
				    if (randDChance(0.9) && highEnergyNeutrons){
				        shieldingBalls.push(new Shielding_Fast_Ball());
				    } else {
				        shieldingBalls.push(new Shielding_Reg_Ball());
				    }
				}
				
				if (shieldingFluxTimer > 0){
				    ctx.fillStyle = 'red';
				    ctx.fillText('Neutron Flux Alert', w / 2, 30)
				    shieldingFluxTimer -= dTime;
				}
				
				var averageEnergy = 0;
				for (var i = 0; i < shieldingBalls.length; i++){
					var paddleCollision = false;
					
					//Manual paddle
					if (collisionRect(shieldingBalls[i].rect, shieldingPaddle.rect)){
						paddleCollision = true;
					}
					//Double paddle - check one of the paddles
					else if (usingUpgrade(4)){
						if (collisionRect(shieldingBalls[i].rect, AI_Left_Sh_Paddle.rect) ||
							collisionRect(shieldingBalls[i].rect, AI_Right_Sh_Paddle.rect)){
								paddleCollision = true;
						}
					}
					
					//Single automated paddle - only check if don't have double AI paddles
					else if (usingUpgrade(3)){
						if (collisionRect(shieldingBalls[i].rect, AI_Central_Sh_Paddle.rect)){
							paddleCollision = true;
						}
					}
					
					
					shieldingBalls[i].move();
					shieldingBalls[i].checkBounds();
					shieldingBalls[i].draw();
                    
					if (shieldingBalls[i].rect.y > MAIN_SCREEN_HEIGHT){
						shieldingBalls[i].toBeRemoved = true;
						lostGame = true;
					}
					
					if (paddleCollision && shieldingBalls[i].dy > 0){
						
						shieldingBalls[i].dy *= -1;
						neutronDeflections++;
						
                        if (shieldingBalls[i].type == 'Normal'){
                            var multiplier = 1;
                        } else if (shieldingBalls[i].type == 'Fast'){
                            var multiplier = 3;
                        } else {
                            console.trace();
                            prompt('Ball type error.')
                        }
                        
                        //0.05 to 0.15 by default, 3x greater if neutron was fast
                        upgradeProgress += shieldingBalls[i].getProgress() * multiplier;
						
						if (upgradeProgress >= 1){
							unlockUpgrade.play();
							
							upgradeProgress -= 1;
							levelIncome.Shielding += 1000;
							
						}
						
						upgradeProgressBar.progress = upgradeProgress;
						
					} else {
						for (var j = 0; j < shieldingBlocks.length; j++){
							if (shieldingBlocks[j].removed) continue;
							
							if (collisionRect(shieldingBalls[i].rect, shieldingBlocks[j].outerRect)){
								
								shieldingBlocks[j].remove();
								
								shieldingBalls[i].toBeRemoved = true;
								shieldingBalls[i].explode();
								
								//If fast try to remove adjacent bricks
								if (shieldingBalls[i].type == 'Fast'){
								    var removeLeft = true;
								    var removeRight = true;
								    var removeDown = true;
								    
								    if (j >= 0 && j <= 15){
								        removeDown = false;
								    }
								    
								    //If hit left-most brick
								    if (j % SHIELDING_BRICK_COUNT_X == 0){
								        removeLeft = false;
								    }
								    
								    //If hit right-most brick
								    if (j % SHIELDING_BRICK_COUNT_X == SHIELDING_BRICK_COUNT_X - 1){
								        removeRight = false;
								    }
								    
								    if (removeLeft){
								        shieldingBlocks[j - 1].removed = true;
								    }
								    
								    if (removeRight){
								        shieldingBlocks[j + 1].removed = true;
								    }
								    
								    if (removeDown){
								        shieldingBlocks[j - SHIELDING_BRICK_COUNT_X].removed = true;
								    }
								}
							}
						}
					}
					
					if (!shieldingBalls[i].toBeRemoved){
					    averageEnergy += Math.abs(shieldingBalls[i].dy / SHIELDING_MAX_NEUTRON_YSPEED);
					}
				}
				
				shieldingBalls = removeQueuedItems(shieldingBalls);
				shieldingStrengthBar.progress = shieldingBlockCount() / (SHIELDING_BRICK_COUNT_X * SHIELDING_BRICK_COUNT_Y);
				
				averageEnergy /= shieldingBalls.length;
				shieldingEnergyBar.progress = averageEnergy;
				
			} else if (screen == 'Processing'){
				CONVEYOR_BELT.draw();
				
				if (debugging){
				    ctx.fillText('Clicked Queue - ' + Proc_Puzzle.clickedQueue, 10, h / 2);
				}
				
				if (Proc_Puzzle.visible){
					if (debugging) ctx.fillText('Queue - ' + radioactiveSalts[findRSaltIndex()].queue, 50, h / 2 - 20);
				
				    if (Proc_Puzzle.displayFinished){
				        ctx.fillStyle = 'white';
				    } else {
				        ctx.fillStyle = 'grey';
				    }
					PROCESSING_TILE_OUTLINE.draw();
					
					if (!Proc_Puzzle.displayFinished){
						Proc_Puzzle.cellDisplayTimer -= dTime;
						
						if (Proc_Puzzle.cellDisplayTimer <= 0){
							//If there are more things to display
							var queue = radioactiveSalts[findRSaltIndex()].queue;
							
							if (Proc_Puzzle.displayCurrentID < queue.length - 1){
								Proc_Puzzle.displayCurrentID++;
								Proc_Puzzle.cellDisplayTimer += Proc_Puzzle.getMaxDisplayTime();
								
								playSound(processingTileSounds[queue[Proc_Puzzle.displayCurrentID]]);
								
							} else { //If last tile has been displayed
								Proc_Puzzle.displayFinished = true;
							}
						}
					}
					
					for (var i = 0; i < processingTiles.length; i++){
						processingTiles[i].draw();
						
						//Displaying puzzle
						if (!Proc_Puzzle.displayFinished &&
							//Tile is same to one currently being highlighted
							i == radioactiveSalts[findRSaltIndex()].queue[Proc_Puzzle.displayCurrentID]){
							ctx.fillStyle = 'white';
							//1 - x^2 brightness
							//x is progress through flash, start at 0 end at 1
							var x = (Proc_Puzzle.getMaxDisplayTime() - Proc_Puzzle.cellDisplayTimer) / Proc_Puzzle.getMaxDisplayTime();
							ctx.globalAlpha = 1 - Math.pow(x, 2);
							processingTiles[i].rect.draw();
							ctx.globalAlpha = 1;
						}
					}
				}

				
				Processing_createNewFluid(); //Randomly generate salts
			    
			    //Orange, harmless small salts
				for (var i = 0; i < saltParticles.length; i++){
					saltParticles[i].move();
					saltParticles[i].draw();
				}
				
				var radioactiveCount = 0;
				
				//If player has robot upgrade
				if (usingUpgrade(3)){
                    for (var robot of processingTierOneRobots){
                        robot.update()
                        robot.draw();
                    }
				}
				
				if (usingUpgrade(4)){
				    for (var robot of processingTierTwoRobots){
						robot.update()
				        robot.draw();
				    }
				}
				
				if (usingUpgrade(5)){
                    for (var robot of processingTierThreeRobots){
                        robot.update()
                        robot.draw();
                    }
				}
				
				for (var i = 0; i < radioactiveSalts.length; i++){
					radioactiveSalts[i].move();
					radioactiveSalts[i].draw();
					
					if (radioactiveSalts[i].toBeRemoved &&
					    Proc_Puzzle.visible &&
					    Proc_Puzzle.saltID == radioactiveSalts[i].id){
					    
						//Hide puzzle if selected particle has moved off screen
						resetProcessingPuzzle();
					}
					
					if (!radioactiveSalts[i].purified && !radioactiveSalts[i].toBeRemoved){
						radioactiveCount++;
					}
					
					if (!radioactiveSalts[i].purified && radioactiveSalts[i].toBeRemovedOffscreen){
					    //Make two new salts everytime an old one passes
                        for (var i = 0; i < 2; i++){
                            radioactiveSalts.push(new SaltWaste());
                        }
					}
				}
				
				//Reduce health when impurity above 100%
				if (radioactiveCount / 12 > 1){
				    processingHealth -= Math.pow(radioactiveCount / 12, 2.6) * dTime;
				}
				
				processingHealthBar.progress = processingHealth / 100;
				
				//12 salts is 100%
				processingImpurityBar.progress = radioactiveCount / 12;
				
				if (Proc_Puzzle.visible){
					processingSaltProgressBar.progress = (Proc_Puzzle.clickedQueue.length /
														  radioactiveSalts[findRSaltIndex()].queue.length);
				}
				
				saltParticles = removeQueuedItems(saltParticles);
				radioactiveSalts = removeQueuedItems(radioactiveSalts);
				
				if (processingHealth <= 0){
				    lostGame = true;
				}
				
			} else if (screen == 'Corrosion'){
			    var largeAsteroidPresent = false;
			    
			    for (var i = 0; i < asteroids.length; i++){
			        if (asteroids[i].type == 'Large'){
			            largeAsteroidPresent = true;
			            break
			        }
			    }
			    
			    if ((largeAsteroidPresent && randDChance(12)) ||
			        (!largeAsteroidPresent && randDChance(8/5))){
			        
			        //Choose which side of screen to appear from
			        if (randint(0, 1) == 0){
			            var x = 0;
			        } else {
			            var x = w;
			        }
			        
			        if (randint(0, 1) == 0){
			            var y = 0;
			        } else {
			            var y = h;
			        }
			        
			        asteroids.push(new LargeAsteroid(x, y))
			    }
			    
			    //Ai cross hairs drawn with 30% transparency
				ctx.globalAlpha = 0.3;
				
				//Dual cross-hair upgrade
			    if (usingUpgrade(1)){
			        AI_LeftCrossHair.auto();
			        AI_LeftCrossHair.move();
			        AI_LeftCrossHair.draw();
					
			        AI_RightCrossHair.auto();
			        AI_RightCrossHair.move();
			        AI_RightCrossHair.draw();
			    } //Single cross-hair
				else if (usingUpgrade(0)){
			        AI_CentreCrossHair.auto();
			        AI_CentreCrossHair.move();
			        AI_CentreCrossHair.draw();
			    }
			    ctx.globalAlpha = 1;
			    
			    //AI Ship (neutralization) upgrades
			    if (usingUpgrade(4)){
					AI_LeftShip.auto();
					AI_LeftShip.chargeShip();
					AI_LeftShip.move();
					AI_LeftShip.draw();
					
					AI_RightShip.auto();
					AI_RightShip.chargeShip();
					AI_RightShip.move();
					AI_RightShip.draw();
			    }
			    if (usingUpgrade(3)){
			        AI_CentreShip.auto();
			        AI_CentreShip.chargeShip();
			        AI_CentreShip.move();
			        AI_CentreShip.draw();
			    }
			    
			    if (laserMode){
                    crossHair.move();
                    crossHair.draw();
                    crossHair.control();
    				
				} else {
                    playerShip.move();
                    playerShip.draw();
                    playerShip.control();
                    playerShip.chargeShip();
                    
                    //Find rotation based off mouse position
                    var dx = mx - playerShip.rect.centerx();
                    var dy = my - playerShip.rect.centery();
                    playerShip.rotation = Math.atan2(dy,dx);
                    
                    if (debugging){
                        ctx.fillStyle = 'blue';
                        ctx.beginPath();
                        ctx.moveTo(playerShip.rect.centerx(),playerShip.rect.centery());
                        ctx.lineTo(playerShip.rect.centerx() + dx,playerShip.rect.centery());
                        ctx.lineTo(playerShip.rect.centerx() + dx,playerShip.rect.centery());
                        ctx.lineTo(playerShip.rect.centerx() + dx,playerShip.rect.centery() + dy);
                        ctx.lineTo(playerShip.rect.centerx(),playerShip.rect.centery());
                        ctx.stroke(); 
                        ctx.fillText(dx, playerShip.rect.centerx()+dx/2,playerShip.rect.centery());
                        ctx.fillText(dy, playerShip.rect.centerx()+dx,playerShip.rect.centery()+dy/2);
                        ctx.fillText(playerShip.rotation, playerShip.rect.centerx()+dx/2,playerShip.rect.centery()+dy/2);
                    }
				}
				
				if (playerShip.invincibleTimer > 0){
				    playerShip.invincibleTimer -= dTime;
				}
				
				for (var i = 0; i < asteroids.length; i++){
					asteroids[i].draw();
					asteroids[i].move();
					
					//Countdown timer for asteroid particle effects
					if (asteroids[i].type == 'Tiny'){
					    asteroids[i].despawnTimer -= dTime;
					    
					    if (asteroids[i].despawnTimer < 0){
					        asteroids[i].toBeRemoved = true;
					    }
					}
					
					if (usingUpgrade(5) && //Has nanobot upgrade to autodestroy small particles
					    asteroids[i].type == 'Small' &&
					    randDChance(20)){
					    
					    //Blow up corrosion particles, chance is roughly once per 20 seconds
					    asteroids[i].explode()
					}
					
					if (asteroids[i].type == 'Large'){
						if (laserMode){
							zapAsteroid(crossHair, asteroids, i);
						}
						
						if (usingUpgrade(0)){
							zapAsteroid(AI_CentreCrossHair, asteroids, i);
						}
						
						if (usingUpgrade(1)){
						    zapAsteroid(AI_LeftCrossHair, asteroids, i);
							zapAsteroid(AI_RightCrossHair, asteroids, i);
						}
					}
					
					//Collision with player
					if (!laserMode && asteroids[i].type != 'Tiny' &&
					    playerShip.invincibleTimer <= 0 &&
					    collisionRect(asteroids[i].rect, playerShip.rect)){
					    
					    explosionParticles.push(new Explosion(playerShip.rect.centerx(),
					                                          playerShip.rect.centery()));
					    playerShip.rect.x = w / 2;
					    playerShip.rect.y = h / 2;
					    playerShip.dx = 0;
					    playerShip.dy = 0;
					    playerShip.invincibleTimer = 5;
					    
					    levelIncome.Corrosion -= randint(2000, 3000);
					    if (levelIncome.Corrosion < 0){
					        levelIncome.Corrosion = 0;
					    }
					}
				}
				
				for (var i = 0; i < bullets.length; i++){
				    bullets[i].draw();
				    bullets[i].move();
				    bullets[i].checkRemove();
                    
                    //Check asteroid collision
                    for (var j = 0; j < asteroids.length; j++){
                        if (asteroids[j].type != 'Tiny' &&
							!asteroids[j].toBeRemoved &&
                            collisionRect(bullets[i].rect, asteroids[j].rect)){
                            
                            bullets[i].toBeRemoved = true;
                            
                            if (asteroids[j].type == 'Small'){
                                asteroids[j].explode();
                                levelIncome.Corrosion += randint(400, 600);
                            }
                            break;
                        }
                    }
				}
				
				asteroids = removeQueuedItems(asteroids);
				bullets = removeQueuedItems(bullets);
					
				var C_LASER_RATE = dTime / 3; //Decharge after 3s
				
				corrosionLaserStrength += C_LASER_RATE / 2; //Recharge in 6 seconds
				
				if (usingUpgrade(1)){
					if (AI_LeftCrossHair.laserOn){
						corrosionLaserStrength -= C_LASER_RATE / 2 * AI_LASER_MULTIPLIER;
					} else if (AI_RightCrossHair.laserOn){
						corrosionLaserStrength -= C_LASER_RATE / 2 * AI_LASER_MULTIPLIER;
					}
				} else if (usingUpgrade(0) && AI_CentreCrossHair.laserOn){
                    corrosionLaserStrength -= C_LASER_RATE * AI_LASER_MULTIPLIER;
                }
                				
				if (crossHair.laserOn){
					corrosionLaserStrength -= C_LASER_RATE;
				}
				
				if (corrosionLaserStrength > 1){
					corrosionLaserStrength = 1;
				} else if (corrosionLaserStrength < 0){
					corrosionLaserStrength = 0;
				}
                
                //Reduce health when impurity above 100%
                if (calculateCorrosionMass() / 20 > 1){
                    corrosionHealth -= Math.pow(calculateCorrosionMass() / 20, 2.8) * dTime;
                }
                
				corrosionHealthBar.progress = corrosionHealth / 100;
				//Show percentage of corrosion, max is 20kg
				corrosionConcentrationBar.progress = calculateCorrosionMass() / 20;
				
				if (laserMode){
					corrosionLaserBar.progress = corrosionLaserStrength;
				} else {
				    corrosionShipBar.progress = playerShip.charge / playerShip.MAX_CHARGE;
				}
				
                if (corrosionHealth <= 0){
                    lostGame = true;
                }
			}
        }
        
		if (paused || showInstructions){
		    ctx.globalAlpha = 0.5;
			var text = getGameText(screen);
            
            ctx.font = '48pt NotoSans-Regular';
            ctx.fillText(text, w/2, h/7);
            ctx.font = DEFAULT_FONT; //Reset to default
            
            ctx.globalAlpha = 1;
            
            if (endGame){
                text = {'Core': '"Nobody made a greater mistake than he who did nothing because he could do only a little."',
						'Shielding': '"Tell a lie once and all your truths become questionable."',
						'Processing': '"A lie can travel half way around the world while the truth is putting on its shoes."',
						'Corrosion': '"A single lie destroys a whole reputation of integrity."'}[screen];
                
                ctx.fillStyle = 'grey';
                ctx.textAlign = 'right';
                ctx.font = '16pt NotoSans-Regular';
                ctx.fillText(text, w - SCREEN_BORDER - 3, MAIN_SCREEN_HEIGHT - 10);
                ctx.font = DEFAULT_FONT;
                ctx.textAlign = 'center';
            }
		}
		
	    infoWindow.draw();
		clickDisplay.draw();
		
		//Display info on level
        if (screen == 'Core' ||
            (screen == 'Upgrade' && currentGame == 'Core')){
            coreTemperatureBar.draw();
            coreHealthBar.draw();
			
			ctx.fillStyle = 'grey';
			ctx.font = '14pt NotoSans-Regular';
			
			ctx.fillText('Core Info', w/2, MAIN_SCREEN_HEIGHT + 20);
			ctx.fillText('Active Neutrons - ' + coreBalls.length, w/2, MAIN_SCREEN_HEIGHT + 40);
			ctx.fillText('Left Neutrons Released - ' + leftNeutronsReleased, w/2, MAIN_SCREEN_HEIGHT + 60);
			ctx.fillText('Right Neutrons Released - ' + rightNeutronsReleased, w/2, MAIN_SCREEN_HEIGHT + 80);
			ctx.fillText('Designated Balance - $' + levelIncome.Core, w/2, MAIN_SCREEN_HEIGHT + 100);
        }
        
        else if (screen == 'Shielding' ||
                 (screen == 'Upgrade' && currentGame == 'Shielding')){
            
            shieldingStrengthBar.draw();
            shieldingEnergyBar.draw();
			
			ctx.fillStyle = 'grey';
			ctx.font = '14pt NotoSans-Regular';
            
            //Look into making part of array + function for info
            ctx.fillText('Shielding Info', w/2, MAIN_SCREEN_HEIGHT + 20);
            ctx.fillText('Active Neutrons - ' + shieldingBalls.length, w/2, MAIN_SCREEN_HEIGHT + 40);
            ctx.fillText('Neutron Deflections - ' + neutronDeflections, w/2, MAIN_SCREEN_HEIGHT + 60);
            ctx.fillText('Designated Balance - $' + levelIncome.Shielding, w / 2, MAIN_SCREEN_HEIGHT + 80);
        }
		
		else if (screen == 'Processing' ||
				  (screen == 'Upgrade' && currentGame == 'Processing')){
			processingHealthBar.draw();
			processingImpurityBar.draw();
			
			if (Proc_Puzzle.visible){
				processingSaltProgressBar.draw();
			}
			
			ctx.fillStyle = 'grey';
			ctx.font = '14pt NotoSans-Regular';

			ctx.fillText('Processing Info', w / 2, MAIN_SCREEN_HEIGHT + 20);
			ctx.fillText('Salt Waste (dg/L) - ' + radioactiveSalts.length, w/2, MAIN_SCREEN_HEIGHT + 40);
			ctx.fillText('Designated Balance - $' + levelIncome.Processing, w/2, MAIN_SCREEN_HEIGHT + 60);
		}
		
		else if (screen == 'Corrosion' ||
				  (screen == 'Upgrade' && currentGame == 'Corrosion')){
			
			corrosionHealthBar.draw();
			corrosionConcentrationBar.draw();
			
			if (laserMode){
				corrosionLaserBar.draw();
			} else {
				corrosionShipBar.draw();
			}
			
			ctx.fillStyle = 'grey';
			ctx.font = '14pt NotoSans-Regular';

			ctx.fillText('Corrosion Info', w / 2, MAIN_SCREEN_HEIGHT + 20);
			ctx.fillText('Corrosion (dg/L) - ' + calculateCorrosionMass(), w/2, MAIN_SCREEN_HEIGHT + 40);
			ctx.fillText('Designated Balance - $' + levelIncome.Corrosion, w/2, MAIN_SCREEN_HEIGHT + 60);
			
			if (laserMode){
			    var mode = 'Laser';
			    
			} else {
			    var mode = 'Deconstructor';
			}
			
			ctx.fillText('Mode - ' + mode, w / 2, MAIN_SCREEN_HEIGHT + 80);
		}
        
        if (MINIGAME_SCREENS.includes(screen)){
            currentGame = screen;
        }
        
        //Draw explosions
        for (var particle of explosionParticles){
            particle.draw();
            
            if (particle.frame < 0){
                particle.toBeRemoved = true;
            }
        }
        
        explosionParticles = removeQueuedItems(explosionParticles);
        
        
        //If game has ended
        if (!ENDINGS.includes(screen)){ //If game hasn't ended, allow timer to tick if needed
            if (endGame && endGameTimer >= 0){
                ctx.fillStyle = 'red';
                ctx.font = '22pt Inconsolata';
                ctx.textAlign = 'start';
                
                ctx.fillText(getTimerString(), 10, 30);
                
                ctx.textAlign = 'center';
                ctx.font = DEFAULT_FONT;
                
                if (endGameTimer < 0){
                    setScreen('Ending - Time Out')
                    endMusic.volume = 0;
                    finalMusic.volume = 0.05; //Very quiet
                }
            }
        } else {
            //Text for end of game
            ctx.fillStyle = 'white';
            ctx.font = '16pt NotoSans-Regular';
            
            if (screen == 'Ending - Time Out'){
                wrapText(ENDING_TEXT[screen], w / 2, instructionRect.y, instructionRect.width);
            } else {
                wrapText(ENDING_TEXT[screen], w / 2, h - 150, w - 50);
            }
            
            ctx.font = DEFAULT_FONT;
            
            if (screen == 'Ending - Core'){
                fadeAwayButton.draw();
            } else {
                restartGameButton.draw();
            }
            
            if (screen != 'Ending - Time Out'){
                //Draw the newspaper - if not time out ending
                NEWSPAPER.draw();
            }
        }
        
        if (debugging){
            ctx.font = '20pt Inconsolata';
            ctx.textAlign = 'start';
            ctx.fillText('FPS - ' + Math.round(1 / dTime), 20, 30);
            ctx.textAlign = 'center';
        }
        
        ctx.font = DEFAULT_FONT;
		start = timestamp;
		requestAnimationFrame(paint);
        
	}////////////////////////////////////////////////////////////////////////////////END PAINT/ GAME ENGINE
	
	
	////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////
	/////	MOUSE LISTENER 
	//////////////////////////////////////////////////////
	/////////////////////////////////////////////////////


	/////////////////
	// Mouse Click
	///////////////
	canvas.addEventListener('click', function (evt){
		if (screen == 'Main Menu'){
			if (mainMenuPlayButton.rect.mouseOver()){
				setScreen('Factory Menu');
				playSound(clickButton);
				beginEvent('Beginning Tutorial');
			} else if (mainMenuOptionButton.rect.mouseOver()){
				setScreen('Options');
				playSound(clickButton);
			}
		} else if (screen == 'Factory Menu'){
		    for (var gameString of MINIGAME_SCREENS){
				
				if (factoryButtons[gameString].rect.mouseOver()){
					if (unlockedLevels.includes(gameString) || debugging){
                        setScreen(gameString);
                        
                        if (!initialized[gameString]){
                            restartMinigame();
                            initialized[gameString] = true;
                        }
                        
                        playSound(clickButton);
    
                        //First time entering core
                        if (gameString == 'Core'){
                            beginAEvent('Start Core');
                        } else if (gameString == 'Shielding'){
                            beginAEvent('Start Shielding');
                        } else if (gameString == 'Processing'){
                            beginAEvent('Start Processing');
                        } else if (gameString == 'Corrosion'){
                            beginAEvent('Start Corrosion');
                        }
                        
                        break;
					} else {
					    playSound(errorSound);
					}
				}
			}
			
			if (factoryButtons['EDT'].rect.mouseOver()){
				infoPrompt('The washroom is currently closed.');
				var input = waitForInput('Do you want to play games on your phone? ("Y" or "N")', ['Y', 'N']);
				
				if (input == 'Y') phoneGame();
				else {
					infoPrompt('You choose not to use your phone.')
				}
			}
			
			factoryPump1Button.click();
			factoryFreezePlugButton.click();
			factoryPump2Button.click();
		
 		} else if (screen == 'Options'){
			if (optionSoundButton.rect.mouseOver()){
				soundOn = !soundOn; //Toggle
				optionSoundButton.update(soundOn);
				playSound(clickButton);
			} else if (optionMusicButton.rect.mouseOver()){
			    musicOn = !musicOn;
			    optionMusicButton.update(musicOn);
			    getMusic();
			    playSound(clickButton);
			} else if (optionExplosionsButton.rect.mouseOver()){
				explosionsOn = !explosionsOn;
				optionExplosionsButton.update(explosionsOn);
				playSound(clickButton);
			} else if (optionBlurButton.rect.mouseOver()){
                blurNeutrons = !blurNeutrons;
                optionBlurButton.update(blurNeutrons);
                playSound(clickButton);
                
                //Toggle style
                if (blurNeutrons){
                    document.getElementById("neutrons").style.filter = "blur(2px)";
                } else {
                    document.getElementById("neutrons").style.filter = "";
                }
                
            }  else if (backButton.rect.mouseOver()){
				var index = pastScreens.length - 1;
				//Load most recent last screen and remove from array
				screen = pastScreens[index];
				pastScreens.splice(index, 1);
				getMusic();
			}
		} else if (screen == 'Corrosion Docs' &&
		           backButton.rect.mouseOver()){
            var index = pastScreens.length - 1;
            //Load most recent last screen and remove from array
            screen = pastScreens[index];
            pastScreens.splice(index, 1);
		}
        //If game has ended
        else if (ENDINGS.includes(screen)){
            if (screen == 'Ending - Core'){
                if (fadeAwayButton.rect.mouseOver()){
                    //All full circle, jquery to end the game, this culminating, and this course with some html
                    $('#canvas').toggle('fade');
                    $('#neutrons').toggle('fade');
                }
            } else {
                if (restartGameButton.rect.mouseOver()){
                    init();
                }
            }
        }
		else if (screen == 'Upgrade'){
		    if (inGameBackButton.rect.mouseOver()){
                screen = currentGame;
                playSound(clickButton);
            }
            
            else if (tritiumUpgradeRequired &&
                     currentGame == 'Processing' &&
                     upgradeTritiumButton.rect.mouseOver()){
                       
                if (levelIncome.Processing >= 5000 || debugging){
                    tritiumUpgradeRequired = false;
                    levelIncome.Processing -= 5000;
                    playSound(useUpgrade);
                } else {
                    playSound(errorSound);
                }
            }
            //Repair shielding
            else if (repairShieldingButton.rect.mouseOver() && currentGame == 'Shielding'){
                if (levelIncome[currentGame] >= 8000){
                    levelIncome[currentGame] -= 8000;
                    
                    for (var i = 0; i < 8; i++){
                        shieldingBlocks = repairShield(shieldingBlocks);
                    }
                    
                    shieldingStrengthBar.progress = shieldingBlockCount() / (SHIELDING_BRICK_COUNT_X * SHIELDING_BRICK_COUNT_Y);
                } else {
                    playSound(errorSound);
                }
            } else if (repairHealthButton.rect.mouseOver() && currentGame != 'Shielding'){
                if (levelIncome[currentGame] >= 8000){
                    levelIncome[currentGame] -= 8000;
                    
                    if (currentGame == 'Core'){
                        coreHealth += 20;
                        
                        if (coreHealth > 100){
                            coreHealth = 100;
                        }
                        
                        coreHealthBar.progress = coreHealth / 100;
                        
                    } else if (currentGame == 'Processing'){
                        processingHealth += 20;
                        
                        if (processingHealth > 100){
                            processingHealth = 100;
                        }
                        
                        processingHealthBar.progress = processingHealth / 100;
                    } else if (currentGame == 'Corrosion'){
                        corrosionHealth += 20;
                        
                        if (corrosionHealth > 100){
                            corrosionHealth = 100;
                        }
                        
                        corrosionHealthBar.progress = corrosionHealth / 100;
                    }
                } else {
                    playSound(errorSound);
                }
                
            } else {
                //Check if player clicked on valid box
                let boughtUpgrades = allBoughtUpgrades[currentGame];
				
				for (var i = 0; i < upgradeBoxes.length; i++){
					var canPurchase;
					
					if (upgradeBoxes[i].rect.mouseOver()){
					    //Player bought upgrade already
						if (boughtUpgrades.includes(i) || tritiumUpgradeRequired){
							canPurchase = false;
						}
						
						//First column does not have any pre-requisites AND player has not bought upgrade
						else if ((i % 3 == 0) &&
							     !(boughtUpgrades.includes(i))){
							canPurchase = true;
						}
						
						//Clicked on 2nd or 3rd column which requires having bought the item to the left (with index of i - 1)
						else if (boughtUpgrades.includes(i - 1)){
							canPurchase = true;
						} else {
							//Unable to buy item on third / fourth column
							canPurchase = false;
						}
						
						if (canPurchase){
							playSound(clickButton);
							desiredUpgrade = i;
							
							//Column / Tier 1 upgrades
							if (i % 3 == 0){
								baseUpgradeCost = 7500;
							} else if (i % 3 == 1){
								baseUpgradeCost = 10000;
							} else if (i % 3 == 2){
								baseUpgradeCost = 12500;
							}
							
						} else {
							playSound(errorSound);
						}
						
						break; //Can only click on one box
					}
				}
				
				//If wants to purchase an upgrade
				if (canPurchase){
					screen = 'Globe';
					
					//First time entering globe selection - give tour
					beginEvent('Globe Tutorial');
				}
            }
		} else if (screen == 'Globe'){
		    if (backButton.rect.mouseOver()){
                screen = 'Upgrade';
                playSound(clickButton);
                desiredUpgrade = null;
		    } else {
				for (var country of COUNTRIES){
					if (countryButton[country].rect.mouseOver()){
						var cost = Math.round(baseUpgradeCost * getItemCostPercentage(mouseoverCountry));
						if ((suspicion[country] < 0.85 &&
						     levelIncome[currentGame] >= cost
						     ) || debugging){
						    
							suspicion[country] += Math.random() / 3;
							
							levelIncome[currentGame] -= cost;
							
							screen = 'Upgrade';
							playSound(useUpgrade);
							//Buy upgrade
							allBoughtUpgrades[currentGame].push(desiredUpgrade);
							desiredUpgrade = null;
							
							//Everytime upgrade is bought, suspicion drops for other countries
							for (var j = 0; j < COUNTRIES.length; j++){
							    if (COUNTRIES[j] != country){
                                    //This causes suspicion to trend upwards to near
                                    //100% for all countries by the end of the game
                                    suspicion[COUNTRIES[j]] -= Math.random() / 2.5 / (COUNTRIES.length - 1);
							    }
							    
							    if (suspicion[COUNTRIES[j]] < 0){
							        suspicion[COUNTRIES[j]] = 0;
							    } else if (suspicion[COUNTRIES[j]] > 1){
                                    suspicion[COUNTRIES[j]] = 1;
                                }
							}
							
							if (hasAllUpgrades()){
								if (currentGame == 'Core'){
								    beginEvent('Finished Core');
									factoryPump1Button.payable = true;
								} else if (currentGame == 'Shielding'){
									beginEvent('Finished Shielding')
									factoryFreezePlugButton.payable = true;
								} else if (currentGame == 'Processing'){
                                    beginEvent('Finished Processing')
                                    factoryPump2Button.payable = true;
                                } else if (currentGame == 'Corrosion'){
                                    beginEvent('End game');
                                    
                                    endGame = true;
                                    
                                    /*
                                    Note that all the other music in the game will still play as normal. It's
                                    intentional and causes the player to remember how all their actions had
                                    actually built up to create a nuclear bomb, not nuclear power. Having this
                                    music play on top with a much louder volume distorts the ambience created
                                    by all the other music into something much much darker...
                                    */
                                    endMusic.play();
                                }
							}
							
							if (currentGame == 'Core'){
							    //First time buying upgrade let player know they can toggle
							    beginEvent('Toggle Info');
							}
							
							else if (currentGame == 'Shielding'){
							    if (countBoughtUpgrades() == 2){
							        beginEvent('Shielding High Energy Warning');
							        highEnergyNeutrons = true;
							    }
							    
							    else if (countBoughtUpgrades() == 3){
							        //Teach neutron flux - beginEvent
							        shieldingFluxStage = 'Low';
							    }
							    
                                else if (countBoughtUpgrades() == 5){
                                    shieldingFluxStage = 'Medium';
                                }
                                
                                else if (countBoughtUpgrades() == 8){
                                    shieldingFluxStage = 'High';
                                }
							}
							
							else if (currentGame == 'Processing'){
								if (countBoughtUpgrades() == 5){
									beginEvent('Tritium Processing');
									tritiumUpgradeRequired = true;
								} else if (countBoughtUpgrades() == 8){
									beginEvent('Tritium Info');
								}
							}
							else if (currentGame == 'Corrosion'){
                                if (countBoughtUpgrades() == 8){
                                    beginEvent('Corrosion Documents');
                                }
                            }
							
						} else {
							playSound(errorSound);
						}
					}
				}
			}
		} else if (screen == 'Processing'){
			//If player clicked on salt
			for (var radioactiveSalt of radioactiveSalts){
				if (radioactiveSalt.rect.mouseOver() &&
					!radioactiveSalt.purified){
					//Reset tiles
					resetProcessingPuzzle();
					
					Proc_Puzzle.visible = true;
					Proc_Puzzle.saltID = radioactiveSalt.id;
				}
			}
			
			if (Proc_Puzzle.displayFinished){			
				//Check if player clicked on tile
				if (Proc_Puzzle.visible){
					for (var i = 0; i < processingTiles.length; i++){
						if (processingTiles[i].rect.mouseOver()){
							clickDisplay.instantiate();
							processingTileSounds[i].play();
							
							//Check if player clicked on tile
							var queue = radioactiveSalts[findRSaltIndex()].queue;
							
							Proc_Puzzle.clickedQueue.push(i);
							
							var misclicked = false;
							
							//Check if player clicked everything correct
							//TODO DUPLICATE VARIABLE
							for (var i = 0; i < Proc_Puzzle.clickedQueue.length; i++){
								//Check if player misclicked
								if (Proc_Puzzle.clickedQueue[i] != queue[i]){
									misclicked = true;
									break
								}
							}
							
							if (misclicked){
								//Make reset animation
								Proc_Puzzle.cellDisplayTimer = 1;
								Proc_Puzzle.displayCurrentID = 0;
								Proc_Puzzle.displayFinished = false;
								Proc_Puzzle.clickedQueue = [];
							} else { //Player clicked correctly
								if (Proc_Puzzle.clickedQueue.length == queue.length){
									//Deactivate salt
									radioactiveSalts[findRSaltIndex()].purified = true;
                                    radioactiveSalts[findRSaltIndex()].payProcessing();									
									
									resetProcessingPuzzle();
								}
							}
							
							break; //Stop checking tiles
						}
					}
				}
			}
		}
		else if (screen == 'Corrosion'){
			if (!laserMode){
				playerShip.shoot();
			}
		}
		
		//Playing a minigame
		if (paused){
		    if (pausedResumeButton.rect.mouseOver()){
                paused = false;
                playSound(clickButton);
		    } else if (pausedExitButton.rect.mouseOver()){
				if (screen == 'Processing'){
					resetProcessingPuzzle();
				}
                
                if (currentGame == 'Core'){
                    beginEvent('Leaving Core');
                }
                
		        pastScreens = [];
		        setScreen('Factory Menu');
		        paused = false;
		        playSound(clickButton);
		        
		    } else if (pausedRestartButton.rect.mouseOver()){
		        if (hasAllUpgrades()){
		            playSound(errorSound);
		        } else {
                    restartMinigame();
                    paused = false;
                    playSound(clickButton);
		        }
		    } else if (pausedInstructionButton.rect.mouseOver()){
				showInstructions = true;
				paused = false;
			}
			//As long as not on main menu or paused
		} else if (infoWindow.wasClicked()){
            infoWindow.click();
            
            if (event == 'Corrosion Documents'){
                setScreen('Corrosion Docs');
            }
            
            //Finished beginning tutorial prompts
            if (event == 'Beginning Tutorial' && !infoWindow.visible){
                unlockLevel('Core');
            }
        }
		
		if (MINIGAME_SCREENS.includes(screen) && !paused){
			if(upgradeButton.rect.mouseOver()){
                screen = 'Upgrade';
                playSound(upgradeButtonSound);
			}
			else { //Check if player is toggling upgrade
				for (var u_button of upgradeToggleButtons){
					var id = u_button.id;
					if (u_button.outerRect.mouseOver() &&
						hasUpgrade(id)){
						
						//Toggle upgrade
						usingBoughtUpgrade[screen][id] = !usingBoughtUpgrade[screen][id];
						
						//Toggled off something that comes up
						//TODO - fix
						if (['Core', 'Shielding', 'Processing'].includes(screen)){
						    if (id == 7){
						        usingBoughtUpgrade[screen][5] = usingBoughtUpgrade[screen][id];
						        usingBoughtUpgrade[screen][6] = usingBoughtUpgrade[screen][id];
						    }
                            if (id == 6){
                                usingBoughtUpgrade[screen][5] = usingBoughtUpgrade[screen][id];
                                usingBoughtUpgrade[screen][7] = !usingBoughtUpgrade[screen][id];
                            }
						}
						
						break;
					}
				}
			}
		}

	}, false);

	canvas.addEventListener ('mouseout', function(){pause = true;}, false);
	canvas.addEventListener ('mouseover', function(){pause = false;}, false);

  	canvas.addEventListener('mousemove', function(evt) {
    	var mousePos = getMousePos(canvas, evt);

		mx = mousePos.x;
		my = mousePos.y;
		updateLibMouse(mx,my); //From Epic Template v7
  	}, false);
    
    function unlockLevel(level){
        //Kludge to fix bug where aEvents trigger event actions
        if (!unlockedLevels.includes(level)){
            unlockedLevels.push(level);
            //Showing an explosion where the player is supposed
            //to go might not be the best indicator...
            explode(factoryButtons[level].rect);
        }
    }
    
    function endTimer(){
        endGameTimer -= 1;
    }
	
	function getTimerString(){
        var minute = Math.floor(endGameTimer / 60);
        var second = Math.round(endGameTimer % 60);
        
        //Make 0 to 9 appear as 00 to 09
        if (second < 10){
            second = '0' + second;
        }
        
        return minute + ':' + second;
    }

	function zapAsteroid(currentCrossHair, asteroids, i){
		var distance = dist(asteroids[i].rect, currentCrossHair.rect);
		
		if (distance < 100 && currentCrossHair.laserOn){
			var intensity = 1 / distance * 300 * currentCrossHair.getPower();
			asteroids[i].health -= intensity * corrosionLaserStrength;
			
			if (asteroids[i].health < 0){ //Blow up asteroid
				asteroids[i].explode();
				levelIncome.Corrosion += randint(100, 300);
				
				//Make smaller components of asteroid
				var asteroidCount = randint(2, 3);
				for (j = 0; j < asteroidCount; j++){
					asteroids.push(new SmallAsteroid(asteroids[i]));
				}
			}
		}
	}
	
    function setDash(dashed){
        if (dashed){
            ctx.setLineDash([3, 3]);
        } else {
            ctx.setLineDash([])
        }
    }
    
    function drawCrossHair(origX, origY, dashed, radius){
        ctx.strokeStyle = 'white';
        
        setDash(dashed)
        
		const x = Math.round(origX);
		const y = Math.round(origY);
		
        //Vertical
        ctx.beginPath();
        ctx.moveTo(x, y - radius);
		
		var bottom = y + radius;
		if (bottom > MAIN_SCREEN_HEIGHT){
			bottom = MAIN_SCREEN_HEIGHT;
		}
		
        ctx.lineTo(x, bottom)
        ctx.stroke();
        
        //Horizontal
        ctx.beginPath();
        ctx.moveTo(x - radius, y);
        ctx.lineTo(x + radius, y)
        ctx.stroke();
    }
	
	function calculateCorrosionMass(){
		var mass = 0;
		var type;
		
		for (var asteroid of asteroids){
		    type = asteroid.type;
			if (type == 'Large'){
				mass += 3;
			} else if (type == 'Small'){
				mass += 1;
			} else if (type == 'Tiny'){
			    mass += 0;
			}else {
				prompt('Asteroid type error');
			}
		}
		
		return mass;
	}
	
	function repairShield(shieldingBlocks){
        for (var i = 0; i < shieldingBlocks.length; i++){
            if (shieldingBlocks[i].removed){
                shieldingBlocks[i].removed = false;
                break;
            }
        }
        return shieldingBlocks;
	}
	
	//http://stackoverflow.com/questions/2259476/rotating-a-point-about-another-point-2d
	function rotatePoint(originX, originY, pointX, pointY, angle){
		return {x: Math.cos(angle) * (pointX - originX) - Math.sin(angle) * (pointY - originY) + originX,
				y: Math.sin(angle) * (pointX - originX) - Math.cos(angle) * (pointY - originY) + originY};
	}
	
	function getGameText(game){
		var text;
		
		if (game == 'Core'){
			text = 'Reactor Core';
			ctx.fillStyle = 'orange';
		} else if (game == 'Shielding'){
			text = 'Neutron Shielding';
			ctx.fillStyle = 'cyan';
		} else if (game == 'Processing'){
			text = 'Salt Processing';
			ctx.fillStyle = 'silver';
		} else if (game == 'Corrosion'){
			text = 'Corrosion';
			ctx.fillStyle = 'silver';
		}
		
		return text;
	}
	
	function findRSaltIndex(){
		if (radioactiveSalts.length == 0) prompt('no salt');
		for (var i = 0; i < radioactiveSalts.length; i++){
			if (radioactiveSalts[i].id == Proc_Puzzle.saltID){
				return i;
			}
		}
	}
	
	function getGameString(){
		if (screen == 'Upgrade' || screen == 'Globe'){
			return currentGame;
		} else {
			return screen;
		}
	}
	
	function usingUpgrade(i){
		return (hasUpgrade(i) &&
				usingBoughtUpgrade[getGameString()][i]);
	}
	
	function hasUpgrade(i){
		return allBoughtUpgrades[getGameString()].includes(i);
	}
	
	function hasAllUpgrades(){
	    for (var i = 0; i < 9; i++){
	        if (!hasUpgrade(i)){
	            return false
	        }
	    }
	    
	    return true;
	}
	
	function countBoughtUpgrades(){
		var numberOfUpgrades = 0;
		var id;
		
		for (var i = 0; i < 9; i++){
			if (hasUpgrade(i)){
				numberOfUpgrades++;
			}
		}
		return numberOfUpgrades;
	}

	function drawControlRod(x){
		ctx.fillRect(x - CONTROL_ROD_WIDTH / 2, SCREEN_BORDER,
		             CONTROL_ROD_WIDTH, MAIN_SCREEN_HEIGHT - SCREEN_BORDER);
	}
	
	function drawGraphiteBar(y, colour){
		ctx.fillStyle = colour;
		ctx.fillRect(0, y - GRAPHITE_BAR_HEIGHT / 2,
					 w, GRAPHITE_BAR_HEIGHT);
	}
	
	function getItemCostPercentage(country){
	    return upgradeCost[currentGame][desiredUpgrade][country];
	}
	
	function getPercentage(number){
	    var percentage = Math.round(number * 100, 3);
	    return percentage + '%'
	}
	
	function shieldingBlockCount(){
	    var count = 0;
	    
        for (var block of shieldingBlocks){
            if (!block.removed){
                count++;
            }
        }
        
        return count;
	}
	
	//Called by Ball and Salt class
	function drawSphere(rect, colour){
	    ctx.fillStyle = colour;
		ctx.beginPath();
		//Radius is slightly smaller than collision rect
		var radius = (rect.width + rect.height) / 2 - 1;
		ctx.arc(rect.centerx(), rect.centery(), radius, 0, TAU);
		ctx.fill();
	}
	
	function playSound(sound){
	    if (soundOn){
	       sound.progress = 0;
	       sound.play();
	    }
	}
	
	function removeQueuedItems(particles){
		return particles.filter(i => !i.toBeRemoved);
	}
	
	function drawToggleUpgradeText(){
		ctx.fillStyle = 'grey';
		ctx.font = '12pt NotoSans-Regular';
		ctx.fillText('Toggle Upgrades', upgradeToggleButtons[4].outerRect.centerx(),
					 upgradeToggleButtons[4].outerRect.y - 10);
		ctx.font = DEFAULT_FONT;
	}
	
	function drawInfoBar(){
        ctx.fillStyle = 'rgb(64, 64, 64)';
        ctx.fillRect(0, MAIN_SCREEN_HEIGHT, w, INFO_HEIGHT);
	}
	
	function setScreen(newScreen){
	    explosionParticles = [];
		pastScreens.push(screen);
		screen = newScreen;
		lostGame = false;
		getMusic();
	};
	
	function restartMinigame(){
		upgradeProgress = 0;
		allBoughtUpgrades[screen] = [];
		levelIncome[screen] = 0;
		
		if (screen == 'Core'){
			//Game variables
			coreBalls = [];
			
			leftPaddle = new Core_Paddle(10);
			rightPaddle = new Core_Paddle(w - 10 - PADDLE_WIDTH);
			
			coreTemperature = 0;
			coreHealth = 100; //In percent
			leftNeutronsReleased = 0;
			rightNeutronsReleased = 0;
		}
		else if (screen == 'Shielding'){
			shieldingBalls = [];
			
			shieldingPaddle = new Shielding_Paddle();
			shieldingBlocks = [];
			
			AI_Central_Sh_Paddle = new Shielding_AI_Paddle('Centre');
			AI_Left_Sh_Paddle = new Shielding_AI_Paddle('Left');
			AI_Right_Sh_Paddle = new Shielding_AI_Paddle('Right');
			
			for (var y = 0; y < SHIELDING_BRICK_COUNT_Y; y++){
				for (var x = 0; x < SHIELDING_BRICK_COUNT_X; x++){
					shieldingBlocks.push(new Shielding_Brick(x, y));
				}
			}
			
			neutronDeflections = 0;
		}
		else if (screen == 'Processing'){
			saltParticles = [];
			radioactiveSalts = [];
			
			resetProcessingPuzzle();
			
			processingHealth = 100; //In percent
		}
		else if (screen == 'Corrosion'){
		
		    corrosionHealth = 100; //Percent
		    corrosionLaserStrength = 1; //0 to 1
		    
			playerShip = new PlayerShip(w / 2, h / 2, 50, 50);
			crossHair = new PlayerCrossHair();
			crossHair.laserOn = false;
			
			AI_CentreCrossHair = new AICrossHair('Centre');
			AI_LeftCrossHair = new AICrossHair('Left');
			AI_RightCrossHair = new AICrossHair('Right');
			
			AI_CentreShip = new AIShip('Centre');
			AI_LeftShip = new AIShip('Left');
			AI_RightShip = new AIShip('Right');
			
			asteroids = [];
			bullets = [];
			
			//Start with just one asteroid
			asteroids.push(new LargeAsteroid(Math.random() * w, Math.random() * h));
		}
		
		if (screen != 'Core' && screen != 'Shielding'){
			heavyWaterUsed = false;
		}
	}
	
	function getMusic(){
        //Play music
        finalMusic.volume = 0; //Default is off
        if (musicOn){
            if (screen == 'Core'){
                coreMusic.volume = MUSIC_VOLUME;
            } else {
                coreMusic.volume = 0;
                radiationSound.volume = 0;
            }
        
            if (screen == 'Shielding'){
                shieldingMusic.volume = MUSIC_VOLUME;
            } else {
                shieldingMusic.volume = 0;
            }
        
            if (MENU_SCREENS.includes(screen)){
                menuMusic.volume = MUSIC_VOLUME;
            } else {
                menuMusic.volume = 0;
            }
            
            if (screen == 'Processing'){
                processingMusic.volume = MUSIC_VOLUME;
            } else {
                processingMusic.volume = 0;
            }
            
            if (screen == 'Corrosion'){
                corrosionMusic.volume = MUSIC_VOLUME;
            } else {
                corrosionMusic.volume = 0;
            }
            
            if (screen == 'Corrosion Docs'){
                forebodingMusic.volume = MUSIC_VOLUME;
            } else {
                forebodingMusic.volume = 0;
            }
            
        } else {
            coreMusic.volume = 0;
            menuMusic.volume = 0;
            radiationSound.volume = 0;
            processingMusic.volume = 0;
            shieldingMusic.volume = 0;
            corrosionMusic.volume = 0;
            forebodingMusic.volume = 0;
        }
	}
	
	function getMousePos(canvas, evt) 
	{
        var rect = canvas.getBoundingClientRect();
    	return {
      		x: evt.clientX - rect.left,
      		y: evt.clientY - rect.top
    	};
  	}
	
	function collisionRect(object1, object2){
		return (object1.x < object2.right() && 
				object1.right() > object2.x &&
				object1.y < object2.bottom() &&
				object1.bottom() > object2.y);
	}
	
	function collisionPoint(pointX, pointY, rect){
		return (pointX > rect.x && pointX < rect.right() &&
			    pointY > rect.y && pointY < rect.bottom());
	}
    
	//wrapText function copy pasted without modification from http://www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
	//Don't mark this
	function wrapText(text, x, y, maxWidth) {		
		var lineHeight = 25;
		var words = text.split(' ');
		var line = '';
		
		y += lineHeight; //Custom kludge - shifts text to fit in box
		
		for(var n = 0; n < words.length; n++) {
		    var testLine = line + words[n] + ' ';
		    var metrics = ctx.measureText(testLine);
		    var testWidth = metrics.width;
		    if (testWidth > maxWidth && n > 0) {
				ctx.fillText(line, x, y);
				line = words[n] + ' ';
				y += lineHeight;
		    }
		    else {
			    line = testLine;
		    }
		}
		
		ctx.fillText(line, x, y);
	}

	///////////////////////////////////
	//////////////////////////////////
	////////	KEY BOARD INPUT
	////////////////////////////////


	

	window.addEventListener('keydown', function(evt){
		var key = evt.keyCode;
		if (key == 114){ //F3
			debugging = !debugging;
			//endGame = true;
		} else if (key == 115){ //F4
		    levelIncome[currentGame] += 10000;
		} else if (key == 117){ //F6
		    beginEvent('Core - Info Heat');
		}
		
		if (screen == 'Core'){
			if (key == 87){ //W
				leftPaddle.moveUp = true;
			} else if (key == 83){ //S
				leftPaddle.moveDown = true;
			}
		}
		else if (screen == 'Shielding'){
			if (key == 65){ //A
				shieldingPaddle.moveLeft = true;
			} else if (key == 68){ //D
				shieldingPaddle.moveRight = true;
			}
		} else if (screen == 'Corrosion'){
			if (key == 87){ //W
				holdW = true;
			} else if (key == 83){ //S
				holdS = true;
			}
			if (key == 65){ //A
				holdA = true;
			} else if (key == 68){ //D
				holdD = true;
			}
			
			if (key == 32){ //Space
			    if (laserMode){
			        crossHair.laserOn = true;
			    } else {
			        playerShip.shoot();
			    }
			}
			
			if (key == 16){ //Left shift
				laserMode = !laserMode;
				
				//Make sure ship and laser are at same locations upon switching
                crossHair.laserOn = false;
                    				
				if (laserMode){
					crossHair.rect.setCenter(playerShip.rect)
			        crossHair.dx = playerShip.dx;
			        crossHair.dy = playerShip.dy;
			    } else {
					playerShip.rect.setCenter(crossHair.rect)
                    playerShip.dx = crossHair.dx;
                    playerShip.dy = crossHair.dy;
				}
			}
		} else if (screen == 'Globe' && key == 27){ //Escape
            screen = 'Upgrade';
            playSound(clickButton);
            desiredUpgrade = null;
        }
		
		if (MINIGAME_SCREENS.includes(screen)){
			if (key == 27){ //Escape
				if (lostGame){
					lostGame = false;
					restartMinigame();
				} else if (showInstructions){
					showInstructions = false;
				} else {
					paused = !paused;
				}
			}
            else if (!paused && key == 69){ //Press E
                screen = 'Upgrade';
                playSound(upgradeButtonSound);
			}
	    } else if (screen == 'Factory Menu'){
	        if (key == 27){ //Escape
	           setScreen('Main Menu');
	        }
	    }
	}, false);


	window.addEventListener('keyup', function(evt){
		var key = evt.keyCode;
		
		if (screen == 'Core'){
    		if (key == 87){ //W
    			leftPaddle.moveUp = false;
    		} else if (key == 83){ //S
    			leftPaddle.moveDown = false;
    		}
		}
		
		else if (screen == 'Shielding'){
    		if (key == 65){ //A
    			shieldingPaddle.moveLeft = false;
    		} else if (key == 68){ //D
    			shieldingPaddle.moveRight = false;
    		}
		}
		
		else if (screen == 'Corrosion'){
            if (laserMode && key == 32){ //Space
                crossHair.laserOn = false;
            }
		}
		
		//Corrosion level
		if (key == 87){ //W
			holdW = false;
		} else if (key == 83){ //S
			holdS = false;
		}
		if (key == 65){ //A
			holdA = false;
		} else if (key == 68){ //D
			holdD = false;
		}
		
	}, false);



})
