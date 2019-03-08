var ctx;
var mx;
var my;

const TAU = Math.PI * 2;

const BUTTON_WIDTH = 180;
const PHI = 1.618;
const BUTTON_HEIGHT = Math.round(BUTTON_WIDTH / PHI); //Make a golden rectangle
var w;
var h;

function updateLibMouse(a,b){
	mx = a;
	my = b;
}

function initializeLib(c){
	ctx = c;
	
	w = $("#canvas").width();
	h = $("#canvas").height();	
}

//Audio - music code from The Rising
function addLoopMusic(path, play=true){
	var musicVar = new Audio(path);
	
	musicVar.addEventListener('ended', function(){
		this.currentTime = 0;
		this.play();
	}, false);
	
	if (play){
		musicVar.play();
	}
	
	return musicVar;
}

function collisionRect(object1, object2){
    return (object1.x < object2.x + object2.width && 
            object1.x + object1.width > object2.x &&
            object1.y < object2.y + object2.height &&
            object1.y + object1.height > object2.y)
    
}

class Rect {
    constructor(x, y, w, h){
    	this.x = x;
    	this.y = y;
    	
    	this.width = w;
    	this.height = h;
	}
	
	right(){
		return this.x + this.width;
	}
	
	bottom(){
		return this.y + this.height;
	}
	
	centery(){
		return this.y + this.height / 2;
	}
	
	centerx(){
		return this.x + this.width / 2;
	}
	
	draw(){
		ctx.fillRect(Math.round(this.x), Math.round(this.y), Math.round(this.width), Math.round(this.height));
	}
	
	highlightDraw(){
		//Make button brighter when moused over
		if (this.mouseOver()){
			ctx.globalAlpha = 0.5;
		} else {
			ctx.globalAlpha = 0;
		}
		
		ctx.fillStyle = 'white';
		this.draw();
		
		ctx.globalAlpha = 1;
	}
	
	mouseOver(){
		return (mx > this.x && mx < this.right() &&
				my > this.y && my < this.bottom());
	}
	
	inflate(dw, dh){
		var width = this.width + dw;
		var height = this.height + dh;
		
		var x = this.centerx() - width / 2;
		var y = this.centery() - height / 2;
		
		return new Rect(x, y, width, height);
	}
	
	debug(){
		console.log('x: ' + this.x,
					'y: ' + this.y,
					'w: ' + this.width,
					'h: ' + this.height);
	}
	
	setCenter(targetRect){
		this.x = targetRect.centerx() - this.width / 2;
		this.y = targetRect.centery() - this.height / 2;
	}
	
	setCenterx(centerx){
		this.x = centerx - this.width / 2;
	}
	
	setCentery(centery){
		this.y = centery - this.height / 2;
	}
	
	setBottom(bottom){
		this.y = bottom - this.height;
	}
	
	setRight(right){
		this.x = right - this.width;
	}
};

function dist(rectOne, rectTwo){
	var x1 = rectOne.centerx();
	var y1 = rectOne.centery();
	
	var x2 = rectTwo.centerx();
	var y2 = rectTwo.centery();
	
	return Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2));
}

//Base class which other classes inherit
class Button {
    constructor(text){
        this.text = text;
        this.underline = false;
    }
	
	draw(){
		//Draw button
		ctx.fillStyle = this.getColour(); //Can be overwritten by classes via inheritance
		ctx.globalAlpha = 0.4;
		this.rect.draw();
		ctx.globalAlpha = 1;
		//Draw highlight if mouseover
		this.rect.highlightDraw();
		
		ctx.fillStyle = 'white';
        
        console.log(ctx.font);
        ctx.fillText(this.text, this.rect.centerx(), this.rect.centery());
        
        if (this.underline){
            this.underlineText(this.text, this.rect.centerx(), this.rect.centery())
        }
    }
    	
    underlineText(text, x, y){
      var width = ctx.measureText(text).width;
      var padding = width * 0.05;
    
      switch(ctx.textAlign){
        case "center":
        x -= (width/2); break;
        case "right":
        x -= width; break;
      }
    
    var height = ctx.measureText('I').width;
      y += height / 2;
    
      ctx.beginPath();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.moveTo(x-padding,y);
      ctx.lineTo(x+width+padding,y);
      ctx.stroke();
    
    }
	
	getColour(){
		return 'white';
	}
}

class MenuButton extends Button {
    constructor(y, text){
        super(text);

    	//Center button horizontally
    	this.rect = new Rect(w / 2 - BUTTON_WIDTH / 2, y, BUTTON_WIDTH, BUTTON_HEIGHT);
	}
}

class ToggleButton extends MenuButton {
	constructor(y, text){
	    super(y, text);
	    
        //Make button bigger than default
        this.rect.width += 20;
        this.rect.x -= 10;
        
        this.prefix = text;
	}
    
	update(toggleVariable){
		var suffix;
		if (toggleVariable){
			suffix = 'On';
		} else {
			suffix = 'Off';
		}
		
		this.text = this.prefix + ' - ' + suffix;
	}
}

class SmallButton extends Button {
    constructor(x, y, width, height, text){
	   super(text);
    	
    	//Center button horizontally
    	this.rect = new Rect(x, y, width, height);
    }
}
