var keyBinds = [87, 83, 65, 68, 81, 69, 32, 13];
var keys = [];
var mouse = {
	x: 0,
	y: 0,
	left: false,
	right: false
}

var W, H, player, world, canvas, ctx, trees, treesCount, camera, minimap, friction, titans, titansCount, titanMinSpd, titanMaxSpd, titanMinSize, titanMaxSize;
var rebindKey = false;
var rebindKeyIndex = 0;

var lastUpdate = Date.now();

function initGame() {
	$('#menu, #logo').slideUp('slow', function() {
		$('body, html, canvas').css({
			'position': 'absolute',
			'padding': '0',
			'margin': '0'
		});
	});
	$('canvas').fadeIn('fast');

	var canvas = document.getElementById('canvas');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	W = canvas.width;
	H = canvas.height;

	var name = $('#name').val();

	if(name == '') name = 'Unnamed';

	Game(canvas, name);
}

function showSettings() {
	$('#menu, #logo').slideUp('slow');
	$('#settings').slideDown('slow');
}

function hideSettings() {
	$('#settings').slideUp('slow');
	$('#menu, #logo').slideDown('slow');
}

function replaceKey(n) {
	$('#settings table tr:nth-child(' + n + ') td').css('background-color', '#85abc6');
	$('#settings table tr:nth-child(' + n + ') button').css('background-color', '#85abc6');
	rebindKeyIndex = n - 2;
	rebindKey = true;
}

function replaceKeyStop(n, code) {
	$('#settings table tr:nth-child(' + n + ') td').css('background-color', '#d8d8d8');
	$('#settings table tr:nth-child(' + n + ') button').css('background-color', '#c0ced8');
	rebindKeyIndex = 0;
	rebindKey = false;

	var keyName = '';
	if(code == 32) {
		keyName = 'Space';
	}
	else if(code == 13) {
		keyName = 'Enter';
	}
	else if(code == 27) {
		keyName = 'Escape';
	}
	else if(code == 17) {
		keyName = 'Left Ctrl';
	}
	else if(code == 18) {
		keyName = 'Left Alt';
	}	
	else if(code == 16) {
		keyName = 'Left Shift';
	}	
	else if(code == 9) {
		keyName = 'Tab';
	}	
	else {
		keyName = String.fromCharCode(code);
	}
	$('#settings table tr:nth-child(' + n + ') td:first-child').html(keyName);
}

function random(min,max) {
	return Math.floor(Math.random()*(max-min+1)+min);
}

function isColliding(a, b) {
	if((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) < (a.r + b.r) * (a.r + b.r)) {
		return true;
	}
	else {
		return false;
	}
}

function distance(a, b) {
	return Math.sqrt(Math.abs((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)));
}
function distanceSq(a, b) {
	return Math.abs((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
function length(a) {
	return Math.sqrt(Math.abs((a.x * a.x) + (a.y * a.y)));
}
function normalize(a) {
	var lng = length(a);
	var nx = a.x / lng;
	var ny = a.y / lng;
	return {x: nx, y: ny};
}

function getForce(a, b) {
	var magnitude = b.r / distance(a, b);
	var direction = {
		x: a.x - b.x,
		y: a.y - b.y
	}
	var normDir = normalize(direction);
	direction.x = normDir.x;
	direction.y = normDir.y;
	direction.x *= magnitude;
	direction.y *= magnitude;
	return direction;
}
function vectorField(a, b) {
	var force = {
		x: 0,
		y: 0
	}
	for (var i = 0; i < b.length; i++) {
		var obstacleForce = getForce(a, b[i]);
		force.x += obstacleForce.x;
		force.y += obstacleForce.y;
	}
	return force;
}

function Hook(owner) {
	this.x = 0;
	this.y = 0;

	this.owner = owner;

	this.r = 5;

	this.length = 0;
	this.maxLength = 750;

	this.speed = 0.5;
	this.hookSpeed = 25;

	this.shooted = false;
	this.hooked = false;
	this.target = {
		x: null,
		y: null
	}

	this.update = function() {
		if(this.shooted && !this.hooked) {
			if(this.x < this.target.x) this.x += this.hookSpeed;
			if(this.x > this.target.x) this.x -= this.hookSpeed;
			if(this.y < this.target.y) this.y += this.hookSpeed;
			if(this.y > this.target.y) this.y -= this.hookSpeed;		

			this.length	= distance(this.owner, this);
			if(this.length > this.maxLength) {
				this.shooted = false;
				this.hooked = false;
				this.target.x = null;
				this.target.y = null;
				this.x = null;
				this.y = null;
			}
		}
		if(this.hooked) {
			var angle = Math.atan2(this.x - this.owner.x, -(this.y - this.owner.y));
			var vx = this.speed * Math.sin(angle);
			var vy = this.speed * -Math.cos(angle);

			if(this.owner.reelingIn) {
				vx *= 3;
				vy *= 3;
			}
			else if(this.owner.reelingOut) {
				vx *= -0.5;
				vy *= -0.5;
			}			

			this.owner.velX += vx;
			this.owner.velY += vy;
		}
	}

	this.render = function() {
		if(this.shooted) {
			ctx.beginPath();
			ctx.moveTo(this.owner.x - camera.x, this.owner.y - camera.y);
			ctx.lineTo(this.x - camera.x, this.y - camera.y);
			ctx.strokeStyle = '#000000';
			ctx.lineWidth = 5;
			ctx.stroke();
		}
	}
}

function Player(x, y, r, speed, color, name, acceleration) {
	this.x = x;
	this.y = y;
	this.velX = 0;
	this.velY = 0;
	this.accX = 0;
	this.accY = 0;
	this.speed = speed;
	this.acceleration = acceleration;
	this.r = r;
	this.color = color;
	this.name = name;
	this.angle = 0;
	this.obstacles = [];
	this.attacking = false;

	this.hooks = [new Hook(this), new Hook(this)];

	this.hitbox = {
		x: 0,
		y: 0,
		r: this.r
	}

	this.reelingIn = false;
	this.reelingOut = false;

	this.hook = function(type) {
		if(!this.hooks[type].shooted) {
			var tx = camera.x + mouse.x;
			var ty = camera.y + mouse.y;

			this.hooks[type].x = this.x;
			this.hooks[type].y = this.y;

			this.hooks[type].target.x = tx;
			this.hooks[type].target.y = ty;
			this.hooks[type].shooted = true;
			this.hooks[type].hooked = false;	
		}
	}

	this.unhook = function(type) {
		this.hooks[type].target.x = null;
		this.hooks[type].target.y = null;
		this.hooks[type].shooted = false;
		this.hooks[type].hooked = false;
		this.hooks[type].x = null;
		this.hooks[type].y = null;
	}

	this.doubleHook = function(obj) {
		var closestDis1 = 596000000;
		var index1 = 0;
		for (var i = 0; i < obj.length; i++) {
			var dis = distanceSq(this, obj[i]);
			if(dis < closestDis1) {
				closestDis1 = dis;
				index1 = i;
			}
		}
		var closestDis2 = 596000000;
		var index2 = 0;
		for (var i = 0; i < obj.length; i++) {
			if(i == index1) continue;
			var dis = distanceSq(this, obj[i]);
			if(dis < closestDis2) {
				closestDis2 = dis;
				index2 = i;
			}
		}

		if(!this.hooks[0].shooted) {
			var tx = obj[index1].x;
			var ty = obj[index1].y;

			this.hooks[0].x = this.x;
			this.hooks[0].y = this.y;

			this.hooks[0].target.x = tx;
			this.hooks[0].target.y = ty;
			this.hooks[0].shooted = true;
			this.hooks[0].hooked = false;	
		}
		if(!this.hooks[1].shooted) {
			var tx = obj[index2].x;
			var ty = obj[index2].y;

			this.hooks[1].x = this.x;
			this.hooks[1].y = this.y;

			this.hooks[1].target.x = tx;
			this.hooks[1].target.y = ty;
			this.hooks[1].shooted = true;
			this.hooks[1].hooked = false;	
		}
	}

	this.reelIn = function() {
		if(!this.reelingIn) {
			this.reelingIn = true;
			var THIS = this;
			setTimeout(function() {
				THIS.reelingIn = false;
			}, 100);
		}
	}

	this.reelOut = function() {
		if(!this.reelingOut) {
			this.reelingOut = true;
			var THIS = this;
			setTimeout(function() {
				THIS.reelingOut = false;
			}, 100);
		}
	}

	this.update = function(obj, dt) {
		if(keys[keyBinds[0]]) {	// W
			if(this.accY > -this.speed) {
				this.accY -= this.acceleration;
			}
		}
		if(keys[keyBinds[1]]) {	// S
			if(this.accY < this.speed) {
				this.accY += this.acceleration;
			}
		}
		if(keys[keyBinds[2]]) {	// A
			if(this.accX > -this.speed) {
				this.accX -= this.acceleration;
			}
		}
		if(keys[keyBinds[3]]) {	// D
			if(this.accX < this.speed) {
				this.accX += this.acceleration;
			}
		}

		if(keys[keyBinds[0]] || keys[keyBinds[1]]) {
			this.acceleratingY = true;
		}
		else {
			this.acceleratingY = false;
		}

		if(keys[keyBinds[2]] || keys[keyBinds[3]]) {
			this.acceleratingX = true;
		}
		else {
			this.acceleratingX = false;
		}

		if(keys[keyBinds[4]]) {	// Q
			this.hook(0);
		}	
		else {
			if(!keys[keyBinds[6]]) this.unhook(0);
		}
		if(keys[keyBinds[5]]) {	// E
			this.hook(1);
		}	
		else {
			if(!keys[keyBinds[6]]) this.unhook(1);
		}	

		if(keys[keyBinds[6]]) {	// Space
			this.doubleHook(obj);
		}		

		if(mouse.left) {
			this.attacking = true;
		}
		else {
			var THIS = this;
			setTimeout(function() {
				THIS.attacking = false;
			}, 1000);
		}

		this.angle = Math.atan2((this.x - mouse.x - camera.x), -(this.y - mouse.y - camera.y));

		this.hitbox.x = this.x + (this.r * 1.5 * -Math.sin(this.angle));
		this.hitbox.y = this.y + (this.r * 1.5 * Math.cos(this.angle));

		this.velX += this.accX;
		this.velY += this.accY;

		var deltaFactor = (dt * 0.001) * (1000 / dt);

		this.x += this.velX * deltaFactor;
		this.y += this.velY * deltaFactor;

		if(this.velX < 0) {
			this.velX += friction;
		}
		if(this.velX > 0) {
			this.velX -= friction;
		}
		if(this.velY < 0) {
			this.velY += friction;
		}
		if(this.velY > 0) {
			this.velY -= friction;
		}	

		if(this.accX < 0) {
			this.accX += friction;
		}
		if(this.accX > 0) {
			this.accX -= friction;
		}
		if(this.accY < 0) {
			this.accY += friction;
		}
		if(this.accY > 0) {
			this.accY -= friction;
		}		

		if(this.x < 0) {
			this.x = 0;
			this.velX = 0;
			this.accX = 0;
		} 
		if(this.x > world.w - this.r) {
			this.x = world.w - this.r;
			this.velX = 0;
			this.accX = 0;
		}
		if(this.y < 0) {
			this.y = 0;
			this.velY = 0;
			this.accY = 0;
		}
		if(this.y > world.h - this.r) {
			this.y = world.h - this.r;
			this.velY = 0;
			this.accY = 0;
		}
		this.obstacles = [];
	}

	this.render = function() {
		ctx.beginPath();
		ctx.arc(this.x - camera.x, this.y - camera.y, this.r, 0, 2*Math.PI);
		ctx.fillStyle = this.color;
		ctx.fill();

		ctx.beginPath();
		ctx.arc(this.hitbox.x - camera.x, this.hitbox.y - camera.y, this.hitbox.r, 0, 2*Math.PI);
		ctx.fillStyle = '#FF0000';
		ctx.fill();
		ctx.strokeStyle = '#000000';
		ctx.lineWidth = 2;
		ctx.stroke();		

		ctx.font = '15px Arial';
		ctx.fillStyle = '#000000';
		ctx.textAlign = 'center';
		ctx.fillText(this.name, W/2, H/2 - this.r * 2);
	}
}

function Titan(x, y, r, spd, rspd) {
	this.x = x;
	this.y = y;
	this.r = r;
	this.spd = spd;
	this.velX = 0;
	this.velY = 0;
	this.accX = 0;
	this.accY = 0;
	this.color = '#e2c25f';
	this.strokeColor = '#000000';
	this.strokeWidth = this.r / 10;
	this.angle = 0;
	this.rotateSpeed = rspd;
	this.target = {
		x: this.x,
		y: this.y
	}
	this.range = {
		x: 0,
		y: 0,
		r: this.r * 5
	}
	this.hitbox = {
		x: 0,
		y: 0,
		r: this.r / 2
	}

	this.update = function(dt) {
		this.angle += (Math.atan2(this.x - this.target.x, -(this.y - this.target.y)) - this.angle) / this.rotateSpeed;

		this.hitbox.x = this.x + (this.r * Math.sin(this.angle));
		this.hitbox.y = this.y + (this.r * -Math.cos(this.angle));

		var deltaFactor = (dt * 0.001) * (1000 / dt);

		this.accX = this.spd * -Math.sin(this.angle) * deltaFactor;
		this.accY = this.spd * Math.cos(this.angle) * deltaFactor;

		this.velX += this.accX;
		this.velY += this.accY;

		this.velX *= 0.5;
		this.velY *= 0.5;

		this.x += this.velX;
		this.y += this.velY;

		if(this.x < 0) {
			this.x = 0;
			this.velX = 0;
			this.accX = 0;
		} 
		if(this.x > world.w - this.r) {
			this.x = world.w - this.r;
			this.velX = 0;
			this.accX = 0;
		}
		if(this.y < 0) {
			this.y = 0;
			this.velY = 0;
			this.accY = 0;
		}
		if(this.y > world.h - this.r) {
			this.y = world.h - this.r;
			this.velY = 0;
			this.accY = 0;
		}		
		this.range.x = this.x;
		this.range.y = this.y;
	}

	this.attack = function() {

	}

	this.render = function() {
		ctx.beginPath();
		ctx.arc(this.x - camera.x, this.y - camera.y, this.r, 0, 2*Math.PI);
		ctx.fillStyle = this.color;
		ctx.fill();
		ctx.strokeStyle = this.strokeColor;
		ctx.lineWidth = this.strokeWidth;
		ctx.stroke();

		ctx.beginPath();
		ctx.arc(this.hitbox.x - camera.x, this.hitbox.y - camera.y, this.hitbox.r, 0, 2*Math.PI);
		ctx.fillStyle = '#FF0000';
		ctx.fill();
		ctx.stroke();
	}
}

function Tree(x, y, r) {
	this.x = x;
	this.y = y;
	this.r = r;
	this.color = '#6a4611';

	this.render = function() {
		ctx.beginPath();
		ctx.arc(this.x - camera.x, this.y - camera.y, this.r, 0, 2*Math.PI);
		ctx.fillStyle = this.color;
		ctx.fill();
	}
}

function Camera(x, y) {
	this.x = x;
	this.y = y;
	this.angle = 0;

	this.update = function(pl) {
		this.x = pl.x - W/2;
		this.y = pl.y - H/2;
	}
}

function Minimap(w, xoff, yoff) {
	this.w = w;
	this.h = world.h * this.w / world.w;

	this.xoff = xoff;
	this.yoff = yoff;

	this.x = W - this.w - this.xoff;
	this.y = H - this.h - this.yoff;

	this.objects = [];
	this.objects2 = [];

	this.player = {
		x: 0,
		y: 0,
		r: player.r / 10
	}

	this.generate = function(obj, obj2) {
		for(var i = 0; i < obj.length; i++) {
			this.objects.push({
				x: this.x + obj[i].x / (world.w / this.w), 
				y: this.y + obj[i].y / (world.h / this.h),
				r: obj[i].r / 20
			});
		}
		for(var i = 0; i < obj2.length; i++) {
			this.objects2.push({
				x: this.x + obj2[i].x / (world.w / this.w), 
				y: this.y + obj2[i].y / (world.h / this.h),
				r: obj2[i].r / 20
			});
		}
	} 

	this.update = function(p, t) {
		this.player.x = this.x + p.x / (world.w / this.w);
		this.player.y = this.y + p.y / (world.h / this.h);
		for(var i = 0; i < t.length; i++) {			
			this.objects2[i].x = this.x + t[i].x / (world.w / this.w);
			this.objects2[i].y = this.y + t[i].y / (world.h / this.h);
		}
	}

	this.render = function() {
		ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
		ctx.fillRect(this.x, this.y, this.w, this.h);

		for (var i = 0; i < this.objects.length; i++) {
			ctx.beginPath();
			ctx.arc(this.objects[i].x, this.objects[i].y, this.objects[i].r, 0, 2*Math.PI);
			ctx.fillStyle = '#000000';
			ctx.fill();
		}

		for (var i = 0; i < this.objects2.length; i++) {
			ctx.beginPath();
			ctx.arc(this.objects2[i].x, this.objects2[i].y, this.objects2[i].r, 0, 2*Math.PI);
			ctx.fillStyle = '#FF0000';
			ctx.fill();
		}		

		ctx.beginPath();
		ctx.arc(this.player.x, this.player.y, this.player.r, 0, 2*Math.PI);
		ctx.fillStyle = '#FFFFFF';
		ctx.fill();
	}
}

function World(w, h) {
	this.w = w;
	this.h = h;

	this.render = function() {
		ctx.fillStyle = '#586d26';
		if(camera.x < W) {
			ctx.fillRect(-50 - player.r - camera.x, 0, 50, H);
		}
		if(camera.x > this.w - W) {
			ctx.fillRect(this.w - camera.x, 0, 50, H);
		}
		if(camera.y < H) {
			ctx.fillRect(0, -50 - player.r - camera.y, W, 50);
		}
		if(camera.y > this.h - H) {
			ctx.fillRect(0, this.h - camera.y, W, 50);
		}
	}
}

function Game(c, n) {
	console.log('Game Started');

	canvas = c;
	ctx = canvas.getContext("2d");

	world = new World(20000, 14000);

	player = new Player(random(0, world.w), random(0, world.h), 20, 0.02, '#2135ED', n, 0.01);

	trees = [];
	treesCount = 300;
	var treeMinSize = 35;
	var treeMaxSize = 75;

	for(var i = 0; i < treesCount; i++) {
		trees.push(new Tree(random(0, world.w), random(0, world.h), random(treeMinSize, treeMaxSize)));
	}

	titans = [];
	titansCount = 5;
	titanMinSpd = 1;
	titanMaxSpd = 3;
	titanMinSize = 25;
	titanMaxSize = 85;

	for (var i = 0; i < titansCount; i++) {
		titans.push(new Titan(random(0, world.w), random(0, world.h), random(titanMinSize, titanMaxSize), random(titanMinSpd, titanMaxSpd), 100));
	}
	console.log(titans);

	camera = new Camera(0, 0);

	minimap = new Minimap(250, 50, 50);

	minimap.generate(trees, titans);

	friction = 0.005;

	gameLoop();
}

function update(dt) {
	player.update(trees, dt);
	camera.update(player);

	for (var i = 0; i < titans.length; i++) {
		titans[i].update(dt);
		titans[i].target = player;
	}

	minimap.update(player, titans);

	for (var i = 0; i < player.hooks.length; i++) {
		player.hooks[i].update();
	}

	for (var i = 0; i < trees.length; i++) {
		for (var j = 0; j < player.hooks.length; j++) {
			if(isColliding(trees[i], player.hooks[j])) {
				player.hooks[j].hooked = true;
			}
		}
	}

	for (var i = 0; i < titans.length; i++) {
		for (var j = 0; j < player.hooks.length; j++) {
			if(titans[i] == undefined) continue;
			if(isColliding(titans[i], player.hooks[j])) {
				player.hooks[j].hooked = true;
				player.hooks[j].x = titans[i].x;
				player.hooks[j].y = titans[i].y;
			}
		}
	}

	for (var i = 0; i < titans.length; i++) {
		for (var j = 0; j < titans.length; j++) {
			if(i == j) continue;
			if(titans[i] == undefined || titans[j] == undefined) continue;
			if(isColliding(titans[i], titans[j])) {
				var obstacles = [titans[j]];
				var collisionForce = vectorField(titans[i], obstacles);
				titans[i].velX = collisionForce.x * 10;
				titans[i].velY = collisionForce.y * 10;			
			}
		}
	}

	for (var i = 0; i < titans.length; i++) {
		for (var j = 0; j < trees.length; j++) {
			if(titans[i] == undefined) continue;
			if(isColliding(titans[i], trees[j])) {
				var obstacles = [trees[j]];				
				var collisionForce = vectorField(titans[i], obstacles);
				titans[i].velX = collisionForce.x * 10;
				titans[i].velY = collisionForce.y * 10;
				titans[i].accX = 0.2;
				titans[i].accY = 0.2;	
			}		
		}
	}

	for(var i = 0; i < treesCount; i++) {
		if(isColliding(player, trees[i])) {
			var obstacles = [trees[i]];
			var collisionForce = vectorField(player, obstacles);
			player.velX = collisionForce.x;
			player.velY = collisionForce.y;
			player.accX *= 0.2;
			player.accY *= 0.2;
		}
	}

	for(var i = 0; i < titans.length; i++) {
		if(titans[i] == undefined) continue;
		if(isColliding(player, titans[i])) {
			var obstacles = [titans[i]];
			var collisionForce = vectorField(player, obstacles);
			player.velX = collisionForce.x * 6;
			player.velY = collisionForce.y * 6;
			player.accX *= 0.2;
			player.accY *= 0.2;			
		}
	}

	if(player.attacking && !mouse.left) {
		for(var i = 0; i < titans.length; i++) {
			if(titans[i] == undefined) continue;
			if(isColliding(player.hitbox, titans[i].hitbox)) {
				titans.splice(i, 1);
				minimap.objects2.splice(i, 1);
				break;
			}
		}
	}
}

function render() {
	ctx.clearRect(0, 0, W, H);

	world.render();

	for (var i = 0; i < player.hooks.length; i++) {
		player.hooks[i].render();
	}

	player.render();

	for(var i = 0; i < treesCount; i++) {
		if(trees[i].x + trees[i].r > camera.x && trees[i].x - trees[i].r < camera.x + W && trees[i].y + trees[i].r > camera.y && trees[i].y - trees[i].r < camera.y + H) {
			trees[i].render();
		}
	}

	for (var i = 0; i < titans.length; i++) {
		if(titans[i] == undefined) continue;		
		titans[i].render();
	}

	minimap.render();
}

function gameLoop() {
	var now = Date.now();
	var dt = now - lastUpdate;
	lastUpdate = now;

	update(dt);
	render();

	requestAnimationFrame(gameLoop);
}

$(window).keydown(function(e) {
	keys[e.which] = true;

	if(rebindKey) {
		keyBinds[rebindKeyIndex] = e.which;
		replaceKeyStop(rebindKeyIndex + 2, e.which);
	}
});

$(window).keyup(function(e) {
	keys[e.which] = false;
});

$(window).mousemove(function(e) {
	mouse.x = e.pageX;
	mouse.y = e.pageY;
});

$(window).mousedown(function(e) {
	if(e.which == 1) {
		mouse.left = true;
	}
	else if(e.which == 2) {
		mouse.right = true;
	}
});

$(window).mouseup(function(e) {
	if(e.which == 1) {
		mouse.left = false;
	}
	else if(e.which == 2) {
		mouse.right = false;
	}
});

$(window).mousewheel(function(e) {
	if(e.deltaY > 0) {
		player.reelOut();
	}
	else if(e.deltaY < 0) {
		player.reelIn();
	}
});