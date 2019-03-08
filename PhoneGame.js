/*
Easter egg feature - this game is a recreation of my first text adventure which was made in August 2013
It can be found by clicking on the Emergency Dump Tanks and using your phone to play games.
*/
var gold;
var bankBalance;
var playerLocation;
var inventory;
var caveType;
var currentDepth;
var completedCave;

var oreList = ['Ruby', 'Sapphire', 'Emerald'];

//When finishing cave - queued messages
var firstMessage;
var secondMessage;
var thirdMessage;

//Library variables
var numberOfAdventures;
var caveAdventures;
var caveSize;

var marketBaseValue; //Market variable
//Market temp variables
var itemCost;
var desiredItem;
var merchandise;

var stockInventory; //Stock market
var availableStocks = ['Miner Co.', 'Exploration Inc', 'Blocks and Crafts']; //Unchanging
var minerValue; //Stocks
var explorationValue;
var blocksValue;

var minerOldValue;
var explorationOldValue;
var blocksOldValue;
var oldStockValue; //Temporary variable for stock market

var warehouseInventory; //Warehouse

var leaveCity; //Guard Post variables
/////////////////////////////////
////////////////////////////////
////////	GAME INIT
///////	Runs this code right away, as soon as the page loads.
//////	Use this code to get everything in order before your game starts 
//////////////////////////////
/////////////////////////////
function phoneGame()
{
	
	gold = 100;
	
	bankBalance = 20;
	playerLocation = 'SmallTown';
	merchandise = ['Stone Sword', 'Torches', 'Rope', 'Old Pickaxe', 'Golden Ingot', 'Iron Pickaxe', 'Iron Sword'];
	inventory = ['Wooden Sword'];
	caveType = null;
	caveSize = null;
	
	//Library variables
	numberOfAdventures = 0;
	caveAdventures = [];
	
	//Market
	marketBaseValue = randomUniform(0.7, 1.3);
	
	stockInventory = [];
	
	minerValue = 25;
	explorationValue = 75;
	blocksValue = 250;
	
	minerOldValue = [];
	explorationOldValue = [];
	blocksOldValue = [];
	
	for (var i = 0; i < 5; i++){
		updateStocks();
	}
	
	warehouseInventory = [];
	infoPrompt('Cave Game - A port from the 2013 Text Edition');
	infoPrompt('You can type "Gold" or "View Inventory" at any time provided a prompt '
			 + 'does not say (Enter to continue) in which case input is ignored.'
			 + ' You can only choose to stop playing on your phone after passing through a cave.');
	
	mainGame();
	
//////////
///STATE VARIABLES
}
function mainGame(){
	while(true){ //This while loop is the loop for everything in text game
		while(true){ //This while loop keeps the player in the town until they leave for caves (break)
			if (playerLocation == 'SmallTown'){
				infoPrompt('You are standing in a small town, ready to plan your adventure... There are 3 buildings here you can enter, the bank, the market, and the library.');
				
				input = waitForInput('Type "Goto Bank/Library/Market", "Continue Quest."',
									 ['Goto Bank', 'Goto Market', "Goto Library", 'Continue Quest']);
				
				if (input == 'Goto Bank') bank();
				else if (input == 'Goto Library') library();
				else if (input == 'Goto Market') market();
				
				else if (input == 'Continue Quest'){
					leaveCity = guardPost();
					
					//If player successfully passed guard post, they can leave
					if (leaveCity) break;
				}
			} else if (playerLocation == 'SecondTown'){
				infoPrompt('You are in a large town, ready to continue your adventure... There are 5 buildings here you can enter, the bank, the market, the library, the stock market, and the warehouse.');
				
				input = waitForInput('Type "Goto Bank/Library/Market/Stock Market/Warehouse", "Continue Quest"',
									 ['Goto Bank', 'Goto Market', 'Goto Library', 'Goto Stock Market', 'Goto Warehouse', 'Continue Quest']);

				//Code below is same as smalltown
				if (input == 'Goto Bank') bank();
				else if (input == 'Goto Library') library();
				else if (input == 'Goto Market') market();
				
				else if (input == 'Continue Quest'){
					leaveCity = guardPost();
					
					//If player successfully passed guard post, they can leave
					if (leaveCity) break;
				}
				//New buildings start here
				else if (input == 'Goto Stock Market'){
					infoPrompt('Welcome to the Stock Market! Here you can buy stocks and watch their value fluctuate!'
							 + ' If you\'re lucky you might become rich, just be a little careful. You currently have '
							 + stockInventory.length + ' stocks.');
					
					while(true){
						input = getInput('Type "Buy/Sell", "View Stocks", or "Leave".');
						
						if (input == 'Leave') break;
						
						else if (input == 'View Stocks'){
							infoPrompt('We have these stocks available. (Prepare for information overload :) )',
									   + availableStocks[0] + ' - ' + stockValue(availableStocks[0]),
									   + availableStocks[1] + ' - ' + stockValue(availableStocks[1]),
									   + availableStocks[2] + ' - ' + stockValue(availableStocks[2])
									   );
							
							infoPrompt('The previous to current values of all stocks are...'
									 + 'Miner Co. - ' + minerOldValue
									 + ', Exploration Inc - ' + explorationOldValue
									 + ', Blocks and Crafts - ' + blocksOldValue);
							
							infoPrompt('Name the company and we can tell you more information!');
							
							while(true){
								var requestStock = getInput('Pick one of the following, ' + availableStocks);
								
								if (availableStocks.indexOf(requestStock) == -1){
									infoPrompt('That company never existed, the stocks are, ' + availableStocks);
								} else {
									break;
								}
							}
							
							if (requestStock == availableStocks[0]){
								oldStockValue = minerOldValue;
							} else if (requestStock == availableStocks[1]){
								oldStockValue = explorationOldValue;
							} else if (requestStock == availableStocks[2]){
								oldStockValue = blocksOldValue;
							}
							
							stockCritic();
						}
						
						else if (input == 'Buy'){
							var requestStock = getInput('What do you want to buy?');
							
							while (availableStocks.indexOf(requestStock) == -1){
								requestStock = getInput('That stock doesn\'t exist, why don\'t you look for information before you invest...'
													 + 'Try again, here are the stocks. ' + availableStocks);
							}
							
							itemValue = stockValue(requestStock);
							
							if (itemValue > gold){
								infoPrompt('You do not have enough money to buy the stock, hopefully only your wealth changes...');
								continue; //Give up on trying to buy stock and loop back to asking what player wants to do in stock market
							}
							
							infoPrompt('How many stocks do you want to buy? The cost of one stock is ' + itemValue);
							
							while(true){
								var quantity = getInput('The maximum number of stocks you can buy is ' +
														Math.floor(gold / itemValue) + ' stocks.');
								quantity = Number(quantity);
								
								if (quantity <= Math.floor(gold / itemValue) && quantity > 0){
									break;
								}
							}
							
							if (itemValue * quantity < gold){ //Check if player can afford
								var input = waitForInput('That will cost about ' + itemValue * quantity + ' gold, is that acceptable?'
													   + ' ("Y" or "N")', ['Y', 'N']);
								
								if (input == 'Y'){
									for (var i = 0; i < quantity; i++){
										stockInventory.push(requestStock);
									}
									
									gold -= itemValue * quantity;
									infoPrompt('Thank you! Have a nice day, you currently have '
											 + gold + ' gold left.');
								} else {
									infoPrompt('Sorry then, maybe one day it\'s value will decrease...');
								}
								
							} else {
								infoPrompt('You don\'t have enough money to buy ' + quantity + ' stocks. '
										 + 'That would require ' + itemValue * quantity + ' gold and you only have ' + gold);
							}
						} else if (input == 'Sell'){
							var requestStock = getInput('What do you want to sell?');
							
							if (stockInventory.indexOf(requestStock) == -1){
								infoPrompt('You don\'t have that company\'s stock...');
							} else {
								itemValue = stockValue(requestStock);
								
								var input = waitForInput('We will give you ' + itemValue + ' gold for the ' + requestStock +
														 '\'s stock, is that good? ("Y" or "N")', ['Y', 'N']);
								
								if (input == 'Y'){
									var maxQuantity = count(stockInventory, requestStock);
									
									if (maxQuantity > 1){
										while(true){
											var requestQuantity = Number(getInput('You can sell 1 - ' + maxQuantity +
																				  '. How much do you want to sell?'));
											
											if (requestQuantity <= maxQuantity && requestQuantity > 0){
												infoPrompt('You sold ' + requestQuantity + ' for ' + (itemValue * requestQuantity) + ' gold.');
												break;
											}
										}
									}
									
									//Remove sold stocks
									var stocksRemoved = 0;
									for (var i = stockInventory.length - 1; i >= 0; i--){
										if (stockInventory[i] == requestStock){
											stockInventory.splice(i, 1);
											stocksRemoved++;
											
											if (stocksRemoved == requestQuantity) break;
										}
									}
									
									gold += itemValue * requestQuantity;
									infoPrompt('That was a good deal, you now have ' + gold + ' gold.');
								}
								else {
									infoPrompt('Sorry, maybe you just need to wait. May the odds be ever in your favor.');
								}
							}
						}
					}
				
				} else if (input == 'Goto Warehouse'){
					infoPrompt('Welcome to the Warehouse! You can deposit your items for safekeeping if you don\'t want it. You currently have ' +
							   inventory.length + '  items in your inventory and ' + warehouseInventory.length + ' items with me!');
					
					while(true){
						input = getInput('Type "Deposit/Withdraw", "View Inside", or "Leave".');
						
						if (input == 'Leave') break;
						
						else if (input == 'Deposit'){
							var requestItem = getInput('What do you want to deposit?');
							
							if (inventory.indexOf(requestItem) == -1){
								infoPrompt('I don\'t understand what you mean, please repeat what you want to deposit.');
							} else {
								warehouseInventory.push(requestItem);
								var index = inventory.indexOf(requestItem);
								inventory.splice(index, 1);
								
								infoPrompt(randomChoice(['Thank you, my warehouse gets more and more full!',
														 'Thank you! I\'m going to need to move out, and get a new warehouse!',
														 'Oh that\'sssssss a very nice item you deposited...',
														 'I\'ll keep it safe! Do not worry!',
														 'You can count on us! I mean me!']));
							}
						}
						
						else if (input == 'Withdraw'){
							var requestItem = getInput('What item do you want to withdraw?');
							
							if (warehouseInventory.indexOf(requestItem) == -1){
								infoPrompt('We don\'t have that with us, but we didn\'t lose anything!');
							} else {
								inventory.push(requestItem);
								var index = warehouseInventory.indexOf(requestItem);
								warehouseInventory.splice(index, 1);
								
								infoPrompt('There you go!');
							}
						}
						
						else if (input == 'View Inside'){
							if(warehouseInventory.length == 0){
								infoPrompt('You have nothing inside!');
							} else {
								infoPrompt('You put these items inside...' + warehouseInventory);
							}
						}
					}
				}
				
			}
		}
		
		//Left town and now exploring
		
		numberOfAdventures++;
		//Set up array to store all the info about this cave as player progresses
		caveAdventures.push([]);
		
		if (caveType == '1'){
			infoPrompt('You have begun your adventure by entering the small cave.');
			caveSize = randint(8, 12);
		} else if (caveType == '2'){
			infoPrompt('You have begun your adventure in the large cave.');
			caveSize = randint(15, 25);
		} else if (caveType == '3'){
			infoPrompt('You have begun your adventure through the legendary cave.');
			caveSize = 50;
		}
		
		//Player is now in cave
		for (var caveIteration = 0; caveIteration < caveSize; caveIteration++){
			//By default - leaving this for loop counts as completing cave
			completedCave = true;
			
			//All activity inside caves happens in given function which returns a log of what happened
			caveAdventures[caveAdventures.length - 1].push(caveDecisions());
			
			if (gold == 0){
				infoPrompt('You have no gold left, you should leave the cave or risk dying.');
			} else if (gold < 0) {
				infoPrompt('You have run out of gold and died. In the bank you had ' + bankBalance + ' gold left. Everything will now be erased...');
				phoneGame(); //Restart game using recursion
			}
			
			while(true){
				input = getInput('Type "Help" for more information or enter a command.')
				if (input == ''){
					break; //Continue cave
				} else if (input == 'View Progress'){
					infoPrompt('You are currently ' + caveIteration + ' compartments inside the cave.');
				} else if (input == 'Leave'){
					infoPrompt('You take the nearest exit and leave the cave. You see the sun high in the sky.');
					infoPrompt('You walk towards the nearest town in the distance.')
					completedCave = false;
					break;
				} else {
					infoPrompt('Type "Gold" to see current amount of gold. Type "Leave" to leave the cave. Type "View Progress" to see how deep you are in the cave. Type "View Inventory" to view your inventory. Just press enter to continue through the cave.');
				}	
			}

		}
		
		if (completedCave){
			 //Messages for finishing cave
			 if (caveType == '1'){
				 firstMessage = 'After a "short" adventure through the cave, you finally reached the end.';
			 } else if (caveType == '2'){
				 firstMessage = 'After a "long" expedition through the labyrinth, you finally reached the end.';
			 } else if (caveType == '3'){
				 firstMessage = 'Some adventurers gave up, but after your eternal voyage you finally make it through.';
			 }
			 
			 secondMessage = randomChoice(['The feeling of the sun on your back provides renewed strength from the cold cave.',
											'The bright blue sky above you welcomes you back home as you see color once again.',
											'You think you hear someone, but perhaps it was only an echo...',
											'You find yourself looking back to a cave, and forward to the vast landscape.',
											'With the pitch black cave behind you, you decide to continue forward.']);
			
			 thirdMessage = randomChoice(['You see the small town in the distance and follow the paved road back...',
										  'You walk through the forest with the town in sight, getting ready to explain your adventures...',
										  'The lights glow from the town to which you tiredly stumble forward...',
										  'Now that the town is in sight you walk towards the light...',
										  'You see the city in the distance and run with all your strength from the blackness which follows...']);
			
			infoPrompt(firstMessage);
			infoPrompt(secondMessage);
			infoPrompt(thirdMessage);
			
			//Update variables
			bankBalance = Math.round(bankBalance * (1 + caveIteration / 100));
			
			updateStocks();
			
			if (playerLocation == 'SmallTown'){
				infoPrompt('You travel to the second town.');
				playerLocation = 'SecondTown';
			} else if (playerLocation == 'SecondTown'){
				infoPrompt('You travel back to the small town.');
				playerLocation = 'SmallTown';
			}
		}
		
        input = waitForInput('Do you want to stop playing on your phone? You can type "Y" or "N".',
                             ['Y', 'N']);
        
        if (input == 'Y'){
            break;
        } else {
            infoPrompt('Past the point of no return... you delve back into your phone...')
        }
	}
}

function randomUniform(min, max){
	return min + Math.random() * (max - min);
}

//min and max are inclusive
function randint(min, max){
	return min + Math.floor(Math.random() * (max - min + 1));
}

function caveDecisions(){
	//Describe procedurally generated cave
	var caveEnvironment = getCaveEnvironment()
	infoPrompt(caveEnvironment);
	
	if (caveType == '1'){
		caveEvent = caveOneEvents();
	} else if (caveType == '2'){
		caveEvent = caveTwoEvents();
	} else if (caveType == '3'){
		caveEvent = caveThreeEvents();
	}
	
	//Store only the ID
	return [caveEnvironment, caveEvent];
}

function caveOneEvents(){
	var eventID = randint(1, 6);
	var caveEvent;
	
	if (eventID == 1){
		caveEvent = 'This section of the cave is uneventful, you decide to continue.'
		infoPrompt(caveEvent);
	} else if (eventID == 2){
		var numberOfPaths = randint(2, 3);
		caveEvent = multiplePaths(numberOfPaths);
		infoPrompt(caveEvent)
	} else if (eventID == 3){
		var amountOfGold = randint(5, 10);
		gold += amountOfGold;
		caveEvent = 'You find a chest of gold, there is ' + amountOfGold + ' gold inside.'
		infoPrompt(caveEvent);
	} else if (eventID == 4){
		caveEvent = 'You see a shadow move by you try to follow it, but it disappears...'
		infoPrompt(caveEvent);
	} else if (eventID == 5){
		var dragonStrength = randint(1, 10);
		var temp = dragonBattle(gold, 50, 200, dragonStrength);
		caveEvent = temp[0];
		gold = temp[1];
		infoPrompt(caveEvent);
	} else if (eventID == 6){
		if (randint(0, 1)){ //50% true / false
			caveEvent = 'You see another explorer, he sees you but walks away. Maybe in the future you can trade?';
		} else {
			caveEvent = cave_NPC();
		}
		
		infoPrompt(caveEvent);
	}
	
	return caveEvent;
}

function caveTwoEvents(){
	var eventID = randint(1, 11);
	console.log(eventID);
	
	if (eventID == 1){
		caveEvent = 'Your adventure appears uneventful so you decide to continue.';
		infoPrompt(caveEvent);
	} else if (eventID == 2){
		var numberOfPaths = randint(3, 5);
		caveEvent = multiplePaths(numberOfPaths);
		infoPrompt(caveEvent)
	} else if (eventID == 3){
		var amountOfGold;
		var typeOfChest = randomChoice(['old wooden chest', 'chest made of gold']);
		
		if (typeOfChest == 'old wooden chest'){
			amountOfGold = randint(2, 4);
		} else {
			amountOfGold = randint(7, 12);
		}
		
		gold += amountOfGold;
		caveEvent = 'You find a ' + typeOfChest + ', there is ' + amountOfGold + ' gold inside.';
		infoPrompt(caveEvent);
	
	} else if (eventID == 4){
		caveEvent = 'You notice large footsteps in the ground, something was here before.';
		infoPrompt(caveEvent);
	} else if (eventID == 5){
		caveEvent = 'You find that the floor and walls are smooth, this place was underwater before.';
		infoPrompt(caveEvent);
	} else if (eventID == 6){
		var dragonStrength = randint(1, 15);
		var temp = dragonBattle(gold, 50, 300, dragonStrength);
		caveEvent = temp[0];
		gold = temp[1];
		infoPrompt(caveEvent);
	} else if (eventID == 7){
		var oreType = randomChoice(oreList)
		var prefix = 'You see the rock to be sparkling a ';
		
		if (oreType == 'Ruby'){
			caveEvent = prefix + 'piercing red, it appears to be Ruby...';
		} else if (oreType == 'Sapphire'){
			caveEvent = prefix + 'bright blue, it appears to be Sapphire...';
		} else if (oreType == 'Emerald'){
			caveEvent = prefix + 'brilliant green, it appears to be Emerald...';
		}
		
		mineOre(oreType, caveEvent, 'Old Pickaxe');
		
	} else if (eventID == 8){
		if (inventory.indexOf('Rope') == -1){
			caveEvent = 'You see a deep cavern, if you bring rope you could explore the deeper crevices...';
		} else {
			caveEvent = 'You have rope but can still not pass...'
		}
		infoPrompt(caveEvent);
	} else if (eventID == 9){
		if (inventory.indexOf('Torches') == -1){
			caveEvent = 'There is a pitch black tunnel, you would need a torch to pass through.';
		} else {
			caveEvent = 'You have torches but can still not pass...';
		}
		infoPrompt(caveEvent);
	} else if (eventID == 10){
		if (inventory.indexOf('Ladder') == -1){
			caveEvent = 'There is a massive cliff ahead of you, if you bring a ladder you might reach the top.';
		} else {
			caveEvent = 'You have a ladder but can still not pass...';
		}
		infoPrompt(caveEvent);
	} else if (eventID == 11){
		if (randint(0, 1)){
			caveEvent = 'You see an expert explorer, he sees you but walks away. If you could trade with him then he may have valuables!';    
		} else {
			caveEvent = cave_NPC();
		}
		infoPrompt(caveEvent);
	}
	
	return caveEvent;
}

function caveThreeEvents(){
	var eventID = randint(1, 7);
	
	if (eventID == 1){
		caveEvent = 'Nothing interesting has turned up yet, is this cave really legendary?';
		infoPrompt(caveEvent);
	} else if (eventID == 2){
		var numberOfPaths = randint(2, 4);
		caveEvent = multiplePaths(numberOfPaths);
		infoPrompt(caveEvent)
	} else if (eventID == 3){
		var i = randint(1, 25);
		var typeOfChest;
		var amountOfGold;
		
		if (i < 10){ //40%
			amountOfGold = randint(2, 4);
			typeOfChest = 'old wooden chest';
		} else if (i >= 11 && i < 14){ //odds are 4/25
			amountOfGold = randint(7, 12);
			typeOfChest = 'chest made of gold';
		} else if (i >= 15 && i < 24){ //40%
			amountOfGold = 0;
			typeOfChest = 'empty chest';
		} else { // odds are 1/25 - 4%
			amountOfGold = 250;
			typeOfChest = 'diamond chest';
		}
		
		gold += amountOfGold;
		caveEvent = 'You find a ' + typeOfChest + ', there is ' + amountOfGold + ' gold inside.';
		infoPrompt(caveEvent);
		
	} else if (eventID == 4){
		var i = randint(1, 2);
		var typeOfEncampment;
		
		if (i == 1){
			typeOfEncampment = 'it is abandoned, someone must have been here a long time ago. There is 2 gold inside.';
			gold += 2;
		} else {
			typeOfEncampment = 'a small fire inside means that someone is also here. You are not alone.';
		}
		
		caveEvent = 'You stumble upon a camp, ' + typeOfEncampment;
		infoPrompt(caveEvent);
	
	} else if (eventID == 5){
		var dragonStrength = randint(1, 15);
		var temp = dragonBattle(gold, 100, 500, dragonStrength);
		caveEvent = temp[0];
		gold = temp[1];
		infoPrompt(caveEvent);
		
	} else if (eventID == 6){
		var oreType = randomChoice(['Gold', 'Pyrite', 'Diamond']);
		
		if (oreType == 'Gold' || oreType == 'Pyrite'){
			caveEvent = 'You see a rock iwth a stream of gold, it must be gold!';
		} else if (oreType == 'Diamond'){
			caveEvent = 'A rock nearby shines a bright colour, diamond!';
		}
		
		mineOre(oreType, caveEvent, 'Iron Pickaxe');
		
	
	} else if (eventID == 7){
		caveEvent = 'You walk towards the light (a tunnel) - but it is guarded by a wall of pythons. (You can get the original and full game here) http://cave-explorer.weebly.com/cave-game.html';
	}
	
	return caveEvent;
}

function cave_NPC(){
	var caveEvent;
	var input = waitForInput('You see another explorer! Do you want to talk to him? ("Y" or "N")',
							 ['Y', 'N']);
	
	if (input == 'N'){
		caveEvent = 'You see an explorer! You ignore him...';
		return caveEvent;
	}
	
	//Create inventory of NPC
	var npcInventory = [];
	var itemCount = randint(2, 6);
	
	for (var i = 0; i < itemCount; i++){
		npcInventory.push(randomChoice(merchandise))
		
		//Random chance of adding ores
		if (randint(0, 1)){
			var oreType = randomChoice(oreList);
			
			var temp = randint(1, 6);
			var oreQuality;
			
			if (temp <= 3){
				oreQuality = 'Poor';
			} else if (temp == 4 || temp == 5){
				oreQuality = 'Normal';
			} else if (temp == 6){
				oreQuality = 'Good';
			}
			
			npcInventory.push(oreQuality + ' ' + oreType);
		}
	}
	
	var playerInput;
	//Player interactions with NPC
	infoPrompt('You chose to speak to him, what do you want to do?');
	while (playerInput != 'Leave'){
		playerInput = getInput('"Trade", "Leave" or "Help" for more information.');
		
		if (playerInput == 'Help'){
			infoPrompt('You can type "Trade" or "Leave".');
		}
		else if (playerInput == 'Trade'){
			infoPrompt('You currently have ' + inventory
					 + '. The explorer has ' + npcInventory)
		   
		   while(true){
			   playerInput = getInput('Type "Request Item" or "Stop Trading".');
			   
			   if (playerInput == 'Stop Trading') break;
			   
			   else if (playerInput == 'Request Item'){
				   var requestItem = getInput('What do you want to trade for?');
				   
				   if (npcInventory.indexOf(requestItem) == -1){
					   infoPrompt('I don\'t have that...');
				   } else {
					   //Calculate value of requested item
					   var itemValue = marketValue(requestItem);
					   var tempValue = 0;
					   var itemOffer = [];
					   var currentItemValue;
					   
					   for (var i = 0; i < inventory.length; i++){
						   currentItemValue = marketValue(inventory[i]);
						   
						   if (currentItemValue > tempValue && currentItemValue + tempValue < itemValue){
							   tempValue = currentItemValue;
							   itemOffer.push(inventory[i]);
						   }
					   }
					   
					   var goldOffer = itemValue - tempValue;
					   
					   //Finished calculating how much an item is worth in terms
					   //of items in the player's inventory and player's gold
					   if (itemOffer.length > 0){
						   infoPrompt('I would like your ' + itemOffer);
					   }
					   if (goldOffer > 0){
						   infoPrompt('And I want ' + goldOffer + ' of your gold.');
					   }
					   
					   if (waitForInput('"Y" or "N" ?', ['Y', 'N']) == 'Y'){
						   //Remove items that player trades away
						   for (var i = 0; i < itemOffer.length; i++){
								var index = inventory.indexOf(itemOffer[i]);
								inventory.splice(index, 1);
						   }
						   
						   inventory.push(requestItem);
						   gold -= goldOffer;
						   infoPrompt('It\'s good that we came to a deal.');
						   
					   } else {
						   infoPrompt('Anything else then?');
					   }
				   }
			   }
			}
		}
	}
	//Only gets returned if player ends up talking to explorer
	caveEvent = 'You see another explorer and you choose to talk to him.'
}

function mineOre(oreType, caveEvent, neededPickaxe){
	if (inventory.indexOf(neededPickaxe) == -1){ //Don't have pickaxe
		caveEvent += ' Perhaps you can gather this rock in the future... (you don\'t have a pickaxe)';
		infoPrompt(caveEvent);
	} else {
		var oreQuality;
		var i = randint(1, 14);
		
		if (i <= 9){ //64%
			oreQuality = 'Poor';
		} else if (i >= 10 && i < 14){ //28%
			oreQuality = 'Normal';
		} else if (i == 14 || i == 15){ //15%
			oreQuality = 'Good';
		}
		
		caveEvent += 'The ore quality is ' + oreQuality + '. Do you want to mine it?';
		
		infoPrompt(caveEvent);
		
		//Ask player if they want to mine the ore
		var input = waitForInput('"Y" or "N"', ['Y', 'N']); 
		
		/*
		caveEvent stores all text the player receives about a specific event in a cave,
		this additional text is both added to the caveEvent variable and displayed separately
		rather than shown using infoPrompt(caveEvent) to avoid duplicate messages
		*/
		var extraText;
		
		if (input == 'Y'){
			extraText = ' You mine the ore and get a ' + oreType + '. Perhaps it\'s worth a lot of money.';
		} else {
			extraText = ' You decide not to mine the ore in hopes of finding something worth your time.'
		}
		
		caveEvent += extraText
		infoPrompt(extraText)
	}
}

function library(){
	if (numberOfAdventures == 0){
		infoPrompt('The library is currently closed... (it will be open once you explore at least one cave!)');
	} else {
		infoPrompt('Welcome to the Library, here you can view the records of every event you experienced in the cave.');
		infoPrompt('You have survived, ' + numberOfAdventures + ' adventures.');
		
		//Keep player in library until they type "Leave"
		while(true){
			input = waitForInput('Type "View History" or "Leave".',
								 ['View History', 'Leave']);
			
			if (input == 'Leave') break;
			else if (input == 'View History'){
				infoPrompt('Please type which adventure you want to hear about');
				
				while(true){
					input = getInput('Type a number between 1 and ' + numberOfAdventures);
					input = Math.round(Number(input));
					
					if (input >= 1 && input <= numberOfAdventures) break;
				}
				
				var adventureRequest = input;
				
				infoPrompt('Please tell me what compartment you want me to tell you about.');
				
				while(true){
					input = getInput('Type a number between 1 and ' + caveAdventures[adventureRequest - 1].length);
					input = Math.round(Number(input));
					
					if (input >= 1 && input <= caveAdventures[adventureRequest - 1].length) break;
				}
				
				var levelRequest = input;
				
				infoPrompt('Ok, I got it...');
				infoPrompt('.... *searching* .....');
				
				infoPrompt(caveAdventures[adventureRequest - 1][levelRequest - 1][0])
				infoPrompt(caveAdventures[adventureRequest - 1][levelRequest - 1][1]);
			}
		}
	}
}

function bank(){
	infoPrompt('Welcome to the Bank, you can loan money here to extend the duration of your mission.');
	infoPrompt('You currently have ' + bankBalance + ' gold in the bank and ' + gold + ' gold on you.');
	
	while(true){
		input = getInput('Type "Deposit", "Withdraw", "View Balance", or "Leave"');
		
		if (input == 'Deposit'){
			input = getInput('Please type the amount of gold you want to deposit.');
			
			var deposit = Math.round(Number(input));
			
			if (deposit < 0){
				infoPrompt('Why don\'t you ask for a loan instead?');
			} else if (deposit > gold){
				infoPrompt('You do not have that much money.');
			} else {
				gold -= deposit;
				bankBalance += deposit;
				infoPrompt('Thank you for your transaction, anything else?');
			}
		}
		
		else if (input == 'Withdraw'){
			input = getInput('Please type the amount of gold you want to withdraw.');
			var withdraw = Math.round(Number(input))
			
			if (withdraw < 0){
				infoPrompt('You are not allowed to withdraw a negative (or imaginary.. or complex) amount of gold.');
			} else if (withdraw > bankBalance){
				infoPrompt('Sorry, you do not have that much money in the bank.');
			} else {
				gold += withdraw;
				bankBalance -= withdraw;
				infoPrompt('Thank you for your transaction, anything else?');
			}
		}
		
		else if (input == 'View Balance'){
			infoPrompt('You currently have ' + bankBalance + ' gold in the bank.');
			infoPrompt('You are currently holding ' + gold + ' gold with you.');
		}
		
		else if (input == 'Leave'){
			break;
		}
	}
}

function market(){
	infoPrompt('Welcome to the Market, you can buy and sell things here using your very valuable gold!');
	infoPrompt('You currently have a ' + inventory + ' and ' + gold + ' gold on you.');
	
	while(true){ //Loop keeps player in market until they type "Leave"
		input = getInput('Type "Buy/Sell", "View Merchandise", or "Leave".');
		
		if (input == 'View Merchandise'){
			if (merchandise.length == 0){
				infoPrompt('There\'s nothing left!');
			} else {
				infoPrompt('We have these items in stock... ' + merchandise);
				infoPrompt('Name the item and we can tell you the price!');
				
				//Ask player to ask for item's price - make the default a random bit of merchandise
				var requestItem = getInput('', randomChoice(merchandise));
				
				if (merchandise.indexOf(requestItem) != -1){
					var itemValue = marketValue(requestItem);
					infoPrompt('The cost of the ' + requestItem + ' is... ' + itemValue + ' gold! That\'s a great value!');
				} else {
					infoPrompt('We don\'t have that...');
				}
			}
		}
		else if (input == 'Leave') break;
		
		else if (input == 'Buy'){
			if (gold < 0){
				infoPrompt('Sorry, you do not have enough gold to buy anything.');
			} else if (merchandise.length == 0){
				infoPrompt('Sorry, you bought everything in the market.');
			} else {
				while(true){ //Keep asking for player to buy valid merchandise
					input = getInput('What would you like to buy? - ' + merchandise + ' (You can also type "Cancel")');
					
					if (input == 'Cancel') break;
					else if (merchandise.indexOf(input) != -1){
						desiredItem = input;
						itemCost = marketValue(desiredItem);
						break;
					}
				}
				
				if (input != 'Cancel'){
					if (itemCost > gold){ //Cannot afford item
						infoPrompt('The item you want costs ' + itemCost + ' gold but you only have ' + gold + '. Buy it next time.');
					}
					
					else{
						input = waitForInput('The ' + desiredItem + ' will cost about ' + itemCost + ' gold, is that acceptable? You can type "Y" or "N".',
											 ['Y', 'N']);
						
						if (input == 'Y'){
							//Remove from merchandise
							var index = merchandise.indexOf(desiredItem);
							merchandise.splice(index, 1);
							inventory.push(desiredItem);
							gold -= itemCost;
							
							infoPrompt('Your inventory now contains the ' + desiredItem + '.');
							infoPrompt('Thank you! Have a nice day, you currently have ' + gold + ' gold left.');
						} else {
							infoPrompt('Sorry then, maybe one day we\'ll have discounts...');
						}
					}
				}
				
				
			}
		} else if (input == 'Sell'){
			if (inventory.length == 0){
				infoPrompt('Sorry, you do not have any items to sell.');
			} else {
				while(true){
					input = getInput('What would you like to sell? - ' + inventory + ' (You can also type "Cancel")');
					
					if (input == 'Cancel') break;
					else if (inventory.indexOf(input) != -1){
						desiredItem = input;
						itemValue = marketValue(desiredItem)
						break;
					}
				}
				
				if (input != 'Cancel'){
					input = waitForInput('Are you sure you want to sell the ' + desiredItem + ' for ' + itemValue + '? You can type "Y" or "N".',
										 ['Y', 'N']);
					
					if (input == 'Y'){
						//Remove from inventory
						var index = inventory.indexOf(desiredItem);
						inventory.splice(index, 1);
						gold += itemValue;
						merchandise.push(desiredItem);
						infoPrompt("You've sold the " + desiredItem + '.');
					}
				}
			}
		}
	}
}

function guardPost(){
	var leaveCity = false;
	
	if (gold < 5){
		infoPrompt('You do not have enough money to begin an expedition. You need to spend 5 gold to leave the city.');
	}
	
	else{
		gold -= 5;
		infoPrompt('You pay the guard, 5 gold to pass...');
		var guardMessage = 'Guard Keeper: ';
		
		guardMessage += randomChoice(['Good luck with your adventure...',
									  'This world is vast, and it feels like it\'s always expanding!',
									  'Did you hear about the city to the land of the North? They have useful supplies.',
									  'You look prepared, are you going far away? Don\'t fall off the world!',
									  'Thank you for your payment... I don\'t get payed enough...',
									  'It is rumoured that there is a city of gold underground near the core.']);
		
		infoPrompt(guardMessage);
		infoPrompt('You walk through the building to the other end.');
		
		caveType = waitForInput('Guard Superior: Which of the three caves are you going to? (1, 2, or 3)',
								['1', '2', '3']);
		if (caveType == '1'){
			infoPrompt('Guard Superior: Ok you\'ve chosen the small cave, only one sane people pick...');
		} else if (caveType == '2'){
			infoPrompt('Guard Superior: You\'ve picked the labyrinth, and why are you going alone?');
		} else if (caveType == '3'){
			infoPrompt('Guard Superior: ...');
		}
		
		guardMessage = 'Guard Superior: ';
		
		guardMessage = randomChoice(['If you don\'t make it, let me inherit the rest of your gold!',
									 'There have been countless people like you, good luck.',
									 'I honestly think it is foolish to try and enter a cave for money...',
									 'Wait a moment, you plan on going to the caves? That\'s suicide...',
									 'Now hurry up! You\'re lucky you came here late, I used to charge 20 gold just to leave this place!'
									 ])
		infoPrompt(guardMessage)
		leaveCity = true; //Leave while(true) that keeps player in town
	}
	
	return leaveCity;
}

function multiplePaths(numberOfPaths){
	//Ask player to pick path - technically it doesn't matter and the path isn't stored
	caveEvent = 'You find yourself looking down ' + numberOfPaths + ' paths, which path do you choose?';
	infoPrompt(caveEvent)
	
	while(true){
		var pathChoice = getInput('Pick a number between 1 and ' + numberOfPaths + '.');
		
		if(pathChoice <= numberOfPaths && pathChoice > 0) break;
	};
	
	return caveEvent;
}

function dragonBattle(gold, goldLoss, goldGain, dragonStrength){
	var decisionMade = randomChoice(['Avoid', 'Attack']);
	var playerAttacksDragon = false;
	var suffix;
	
	if (decisionMade == 'Avoid'){ //Let player choose whether to attack if not attacked by dragon
		var input = waitForInput('There is a dragon do you want to attack it? "Y" or "N"',
								 ['Y', 'N']);
	   
		if (input == 'Y'){
			playerAttacksDragon = true;
			decisionMade = 'Attack';
		}
	}
	
	if (decisionMade == 'Avoid'){
		suffix = randomChoice(['you decide to keep your distance and move away.',
										 'the dragon sees you but you are able to run away.'])
	} else if (decisionMade == 'Attack'){
		//Calculate player strength
		var playerAttack;
		var success;
		
		//Percentage of success is playerAttack * 10
		
		if (inventory.indexOf('Iron Sword') != -1){
			playerAttack = 9;
		} else if (inventory.indexOf('Stone Sword') != -1){
			playerAttack = 3;
		} else if (inventory.indexOf('Wooden Sword') != -1){
			playerAttack = 1;
		} else { //No sword, 10% chance of 1 strength attack
			if (randint(0, 9) == 0){
				playerAttack = 1;
			}
		}
		
		var battleOutcome;
		if (playerAttack >= dragonStrength){
			battleOutcome = 'after a long and heroic battle you defeat the dragon! You find ' + goldGain + ' gold in the chests he was guarding.';
			gold += goldGain;
			
		} else {
			battleOutcome = 'after a short battle you were defeated.';
			gold -= goldLoss;
		}
		
		suffix = 'the dragon attacks you, ' + battleOutcome;
	}
	
	if (playerAttacksDragon){
		caveEvent = 'You attack the dragon, ' + suffix;
	} else {
		caveEvent = 'You see a dragon, ' + suffix;
	}
	
	return [caveEvent, gold];
}

function getCaveEnvironment(){
	var id = Math.floor(Math.random() * 33);
	
	if (id == 33){
		var caveSection = randomChoice(['floor', 'ceiling', 'walls']);
		var environment = 'The ' + caveSection + ' begins to pulsate and warp, heat radiates and you realize lava is nearby.';
	} else {
		var environment =  ['The air is thick and moist, you cannot see very far.',
							'The air feels thin and you have trouble catching your breath.',
							'The cold drafts freeze everything, and make the stone walls very cold.',
							'The cave air is cold, but you feel the floor to be warm from lava underneath.',
							'Large stalactites and stalagmites make the moist cave harder to pass through.',
							'A river of lava flows in front of you, you go back and take another route.',
							'You see a flickering light in the distance, it must be a torch from another explorer.',
							'The cave floor begins to crumble below your feet, you decide to run through and continue your adventure.',
							'Streams of water and lava meet and create huge amounts of steam, blocking your vision.',
							'In the dark you have trouble seeing, and stumble blindly.',
							'The floor is deeply cratered as if someone had set off explosives to kill something.',
							'The floor is warm to the touch and made of thick basalt, it would be wise not to dig down...',
							'The cave ceiling slopes sharply upward, your footsteps echo hundreds of times in the large room.',
							'The rocks in the cave seem to absorb your light, then they slowly fade to nothingness...',
							'You try to touch the cave walls and they crumble to your touch, you feel the air and notice its dryness.',
							'The air becomes damp and you notice the stone is soft to your fingertips.',
							'You reach a clearing only to realize it\'s a large room, you watch the subterrainean waterfall and continue with renewed confidence.',
							'The water if up to your waist, you make sure not to get your items wet.',
							'You take a step forward and slip, the rocks here are polished smooth and shiny...',
							'You see a light and chase it, ahead there is a pool of lava which you use to get comfortable and dry off.',
							'You walk and discover a shocking sight, a stream of lava pours off a cliff freezing while falling and hitting the ground as stone.',
							'You begin to feel it rain... No! Rocks are falling from the ceiling onto you... The room is weakening!',
							'You feel the ground shake and you fall down, a fissure opens on the ground and you see lava flowing.',
							'The ground shakes and you notice a hole open up in the wall, you follow through it.',
							'You look at the ground and notice sand, there is even a small cactus on the ground, what got a desert down here?',
							'The cave seems ordinary but as you look back you realize the exit is gone.',
							'The ceiling walls begin to heat up and descend, is it melting?',
							'You see drops of lava and look at yourself to see a dark singe on your clothing.',
							'There is a deep lake of lava, it wouldn\'t be a good idea to swim.',
							'Behind you the ceiling collapses and lava rushes behind, you run forward.',
							'You hear a deafening explosion, and steam quickly fills the room.',
							'You notice that the floor sounds hollow as you walk through.'
							][id];
	}
	
	return environment;
}

function marketValue(requestItem){
	var i = requestItem;
	var value;
	
	if (i == 'Wooden Sword') value = 20;
	else if (i == 'Stone Sword') value = 40;
	else if (i == 'Torches') value = 5;
	else if (i == 'Rope') value = 20;
	else if (i == 'Old Pickaxe') value = 50;
	else if (i == 'Golden Ingot') value = 150;
	else if (i == 'Iron Pickaxe') value = 500;
	else if (i == 'Iron Sword') value = 450;
	
	//Check for ores which have only three possible prefixes
	else if (i.substring(0, 4) == 'Poor') value = 10;
	else if (i.substring(0, 6) == 'Normal') value = 25;
	else if (i.substring(0, 4) == 'Good') value = 50;
	
	return Math.round(value * marketBaseValue);
}

function stockValue(requestedStock){
	if (requestedStock == 'Miner Co.'){
		return minerValue;
	} else if (requestedStock == 'Exploration Inc'){
		return explorationValue;
	} else if (requestedStock == 'Blocks and Crafts'){
		return blocksValue;
	}
}

function getBaseChange(i){
	var baseChange = 0;
	
	if (Math.round(oldStockValue[i] * 0.9) <= oldStockValue[i + 1] &&
		oldStockValue[i + 1] < Math.round(oldStockValue[i] * 0.95)){
		baseChange -= 2; //Change in value is 90 - 95%
	}
	else if (Math.round(oldStockValue[i] * 0.95) <= oldStockValue[i + 1] &&
			 oldStockValue[i + 1] < Math.round(oldStockValue[i + 2])){
		baseChange -= 1; //Change in value is 95 - 99%
	}
	else if (Math.round(oldStockValue[i]) < oldStockValue[i + 1] &&
			 oldStockValue[i + 1] <= Math.round(oldStockValue[i + 2] * 1.05)){
		baseChange += 1; //Change in value is >100 - 105%
	}
	else if (Math.round(oldStockValue[i] * 1.05) < oldStockValue[i + 1] &&
			 oldStockValue[i + 1] <= Math.round(oldStockValue[i + 2] * 1.1)){
		baseChange += 2; //Change in value is 106 - 110%
	}
	
	return baseChange;
}

function updateStocks(){
	minerValue = Math.round(minerValue * randomUniform(0.9, 1.1));
	explorationValue = Math.round(explorationValue * randomUniform(0.75, 1.25));
	blocksValue = Math.round(blocksValue * randomUniform(0.95, 1.05));
	
	//In order for the stock critic to analyze about trends, old values are needed
	minerOldValue.push(minerValue);
	explorationOldValue.push(explorationValue);
	blocksOldValue.push(blocksValue);
	
	//Only keep 5 most recent elements
	if (minerOldValue.length > 5){
		minerOldValue.shift(); //Removes first (oldest) element in array
		explorationOldValue.shift();
		blocksOldValue.shift();
	}
}

function stockCritic(){
	var returnSentence = '';

	var baseChange = 0;
	for (var i = 0; i < oldStockValue.length - 1; i++){
		if (oldStockValue[i] < oldStockValue[i + 1]){
			baseChange += 1;
		} else if (oldStockValue[i] > oldStockValue[i + 1]){
			baseChange -= 1;
		}
	}
	
	if (baseChange == 0){
		returnSentence += 'That stock has increased and decreased an equal amount of times.';
	} else if (baseChange > 0){
		returnSentence += 'The economy is doing well, the stock market went up ' + baseChange + ' time(s).';
	} else if (baseChange < 0){
		returnSentence += 'The market isn\'t doing too well, it decreased ' + (-baseChange) + ' time(s).';
	}
	
	var baseChange1 = 0;
	var baseChange2 = 0;
	
	for (var i = 0; i < 2; i++){
		baseChange1 = getBaseChange(i);
		baseChange2 = getBaseChange(i + 2);
	}
	
	if (baseChange1 == -3 || baseChange1 == -4){
		returnSentence += ' The first half decreased steeply.';
	} else if (baseChange1 == -1 || baseChange1 == -2){
		returnSentence += ' The first half decreased slightly.';
	} else if (baseChange1 == 1 || baseChange1 == 2){
		returnSentence += ' The first half increased somewhat.';
	} else if (baseChange1 == 3 || baseChange1 == 4){
		returnSentence += ' The first half increased rapidly.';
	} else {
		returnSentence += ' The first half did not see much change.';
	}
	
	//Same as above code block but uses baseChange2 rather than baseChange1
	if (baseChange2 == -3 || baseChange2 == -4){
		returnSentence += ' The second half decreased steeply.';
	} else if (baseChange2 == -1 || baseChange2 == -2){
		returnSentence += ' The second half decreased slightly.';
	} else if (baseChange2 == 1 || baseChange2 == 2){
		returnSentence += ' The second half increased somewhat.';
	} else if (baseChange2 == 3 || baseChange2 == 4){
		returnSentence += ' The second half increased rapidly.';
	} else {
		returnSentence += ' The second half did not see much change.';
	}
	
	infoPrompt(returnSentence);
}

function count(array, element){
	var quantity = 0;
	
	for (var i = 0; i < array.length; i++){
		if (array[i] == element){
			quantity++;
		}
	}
	
	return quantity;
}

function randomChoice(array){
	var index = Math.floor(Math.random() * array.length);
	
	return array[index];
}

function infoPrompt(promptString){
	prompt(promptString + ' (Enter to continue)');
}

//Always gives player option to restart game
function getInput(promptString){
	//If the player looks up gold or inventory info, loop back and wait for desired input
	while(true){
		var input = prompt(promptString);
		
		if (input == 'Gold'){
			infoPrompt('You have ' + gold + ' gold.');
		
		} else if (input == 'View Inventory'){
			infoPrompt('You currently have ' + inventory + ' in your inventory.');
		
		} else if (input == 'Cheat'){
			cheat();
			
		} else {
			return input;
		}
	}

}

function cheat(){
	var input = waitForInput('Enter cheat code - "Gold", "Inventory", "Stock '
						   + 'Inventory", "Change Location", "Console"',
						   ['Gold', 'Inventory', 'Stock Inventory', 'Change Location', 'Console']);
	
	if (input == 'Gold'){
		gold = Number(getInput('Enter the amount of gold you want.'));
		infoPrompt('Changed gold quantity to ' + gold + '.');
	}
	
	else if (input == 'Inventory'){
		var cheatSelection = waitForInput('Do you want to "Add" or "Remove" an item?',
										  ['Add', 'Remove']);
		
		if (cheatSelection == 'Add'){
			var newItem = getInput('What item do you want?');
			inventory.push(newItem);
			infoPrompt(newItem = ' was added to your inventory.');
		} else if (cheatSelection == 'Remove'){
			if (inventory.length == 0){
				infoPrompt('Inventory is empty. No items were removed.');
			} else {
				var selectItem = waitForInput('What item do you want to remove? ' + inventory,
											  inventory); //Valid answers are anything in inventory
				
				var index = inventory.indexOf(selectItem);
				inventory.splice(index, 1);
				infoPrompt(selectItem + ' successfully removed.');
			}
		}
	}
	
	else if (input == 'Stock Inventory'){
		var desiredStock = waitForInput('What stock do you want? ' + availableStocks,
										availableStocks);
		stockInventory.push(desiredStock);
		infoPrompt(desiredStock + ' was added to your stock inventory.');
	}
	
	else if (input == 'Change Location'){
		var desiredLocation = waitForInput('Please pick a playerLocation, "SmallTown" or "SecondTown".',
										   ['SmallTown', 'SecondTown']);
		
		playerLocation = desiredLocation;
		infoPrompt('Located changed to ' + playerLocation);
	}
	
	//Let's people execute any line of code by giving them access to (possibly) the most dangerous function in javascript, eval
	else if (input == 'Console'){
		do {
			input = getInput('To exit the console type "Exit" on the next prompt or'
						   + ' type your javascript code here and beware of crashes.');
			
			if(input != 'Exit'){
				eval(input); //Turns the input into a line of javascript and executes!
			}
		} while (input != 'Exit')
		infoPrompt('Exited console.');
	}    
}

function waitForInput(promptString, acceptableInputs){
	while(true){
		var input = getInput(promptString);
		var index = acceptableInputs.indexOf(input);
		
		if (index != -1){
			return input;
		}
	}
}
