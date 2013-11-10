
var cdgLog = function(message) {
    console.log(message);
};


/************************************************
 *
 * CDGContext represents a specific state of 
 * the screen, clut and other CDG variables.
 * 
 ************************************************/

var CDGContext = function() {
    this.init(); 
};
CDGContext.prototype.WIDTH = 300; 
CDGContext.prototype.HEIGHT = 216; 
CDGContext.prototype.DISPLAY_WIDTH = 288; 
CDGContext.prototype.DISPLAY_HEIGHT = 192;
CDGContext.prototype.DISPLAY_BOUNDS = [ 6, 12, 294, 204 ];
CDGContext.prototype.TILE_WIDTH = 6;
CDGContext.prototype.TILE_HEIGHT = 12;

CDGContext.prototype.init = function() {
    this.hOffset = 0; 
    this.vOffset = 0;
    this.keyColor = null;

    this.clut = new Array(16); // color lookup table
    for (var i = 0; i < 16; i++) {
        this.clut[i] = 0;
    }
    
    this.pixels = new Array(this.WIDTH*this.HEIGHT);
    this.buffer = new Array(this.WIDTH*this.HEIGHT);

    for (var i = 0; i < this.WIDTH*this.HEIGHT; i++) {
        this.pixels[i] = 0;
        this.buffer[i] = 0;
    }
};
CDGContext.prototype.setCLUTEntry = function(index, r, g, b) {
    this.clut[index] = "rgb(" + 17*r + ',' + 17*g + ',' + 17*b + ')';
};

CDGContext.prototype.renderFrameDebug = function(canvas) {
     
    /* determine size of a 'pixel' that will fit. */
    var pw = Math.min(Math.floor(canvas.width / this.WIDTH), 
                      Math.floor(canvas.height / this.HEIGHT));
    
    /* canvas is too small */
    if (pw == 0) {
        /* could indicate this ... */
        return;
    }

    var ctx = canvas.getContext('2d');
    ctx.save();
    for (var x=0; x < this.WIDTH; x++) {
        for (var y=0; y < this.HEIGHT; y++) {
            var color_index = this.pixels[x + y*this.WIDTH];
            if (color_index == this.keyColor) {
                ctx.clearRect(x*pw,y*pw, pw, pw);
            }
            else {
                ctx.fillStyle = this.clut[color_index];
                ctx.fillRect(x*pw, y*pw, pw, pw);
            }
        }
    }
    ctx.restore();
}

CDGContext.prototype.renderFrame = function(canvas) {

    /* determine size of a 'pixel' that will fit. */
    var pw = Math.min(Math.floor(canvas.width / this.DISPLAY_WIDTH), 
                      Math.floor(canvas.height / this.DISPLAY_HEIGHT));
    
    /* canvas is too small */
    if (pw == 0) {
        /* could indicate this ... */
        return;
    }

    var canvas_xoff = 0;
    var canvas_yoff = 0;
    var ctx = canvas.getContext('2d');
    for (var x=0; x < this.DISPLAY_WIDTH; x++) {
        for (var y=0; y < this.DISPLAY_HEIGHT; y++) {
            var px = x + this.hOffset + this.DISPLAY_BOUNDS[0]; 
            var py = y + this.vOffset + this.DISPLAY_BOUNDS[1];
            var color_index = this.pixels[px + py*this.WIDTH];
            if (color_index == this.keyColor) {
                ctx.clearRect(canvas_xoff + x*pw, canvas_yoff + y*pw, pw, pw);
            }
            else {
                ctx.fillStyle = this.clut[color_index];
                ctx.fillRect(canvas_xoff + x*pw, canvas_yoff + y*pw, pw, pw);
            }
        }
    }
};

var CDG_NOOP            =  0;
var CDG_MEMORY_PRESET   =  1;
var CDG_BORDER_PRESET   =  2;
var CDG_TILE_BLOCK      =  6;
var CDG_SCROLL_PRESET   = 20;
var CDG_SCROLL_COPY     = 24;
var CDG_SET_KEY_COLOR   = 28;
var CDG_LOAD_CLUT_LOW   = 30;
var CDG_LOAD_CLUT_HI    = 31;
var CDG_TILE_BLOCK_XOR  = 38;

var CDG_SCROLL_NONE  = 0; 
var CDG_SCROLL_LEFT  = 1; 
var CDG_SCROLL_RIGHT = 2;
var CDG_SCROLL_UP    = 1; 
var CDG_SCROLL_DOWN  = 2;

var CDG_DATA         = 4;

var CDGInstruction = function() {};
CDGInstruction.prototype.dump = function() {
    return this.name;
};

/************************************************
 *
 * NOOP
 * 
 ************************************************/
var CDGNoopInstruction = function() {};
CDGNoopInstruction.prototype = new CDGInstruction();
CDGNoopInstruction.prototype.instruction = CDG_NOOP;
CDGNoopInstruction.prototype.name = 'Noop';
CDGNoopInstruction.prototype.execute = function(context) {};

/************************************************
 *
 * MEMORY_PRESET
 * 
 ************************************************/
var CDGMemoryPresetInstruction = function(bytes, offset) {
    if (arguments.length > 0) {
        this.init(bytes, offset);
    }
};
CDGMemoryPresetInstruction.prototype = new CDGInstruction();
CDGMemoryPresetInstruction.prototype.instruction = CDG_MEMORY_PRESET;
CDGMemoryPresetInstruction.prototype.name = 'Memory Preset';
CDGMemoryPresetInstruction.prototype.init = function(bytes, offset) {
    var doff = offset + CDG_DATA;
    this.color = bytes[doff] & 0x0F;
    this.repeat = bytes[doff+1] & 0x0F;
};
CDGMemoryPresetInstruction.prototype.execute = function(context) {
    for (var i = 0; i < context.WIDTH*context.HEIGHT; i++) {
        context.pixels[i] = this.color;
    }
};



/************************************************
 *
 * BORDER_PRESET
 * 
 ************************************************/

var CDGBorderPresetInstruction = function(bytes, offset) {  
    if (arguments.length > 0) {
        this.init(bytes, offset);
    }
};
CDGBorderPresetInstruction.prototype = new CDGInstruction();
CDGBorderPresetInstruction.prototype.instruction = CDG_BORDER_PRESET;
CDGBorderPresetInstruction.prototype.name = 'Border Preset';
CDGBorderPresetInstruction.prototype.init = function(bytes, offset) {
    this.color = bytes[offset+CDG_DATA] & 0x0F;    
};
CDGBorderPresetInstruction.prototype.execute = function(context) {
    var b = context.DISPLAY_BOUNDS; 
    for (var x = 0; x < context.WIDTH; x++) {
        for (var y = 0; y < b[1]; y++) {
            context.pixels[x+y*context.WIDTH] = this.color;
        }
        for (var y = b[3]+1; y < context.HEIGHT; y++) {
            context.pixels[x+y*context.WIDTH] = this.color;
        }
    }
    for (var y = b[1]; y <= b[3]; y++) {
        for (var x = 0; x < b[0]; x++) {
            context.pixels[x+y*context.WIDTH] = this.color;            
        }
        for (var x = b[2]+1; x < context.WIDTH; x++) {
            context.pixels[x+y*context.WIDTH] = this.color;            
        }
    }
};


/************************************************
 *
 * TILE_BLOCK
 * 
 ************************************************/

var CDGTileBlockInstruction = function(bytes, offset) {
    if (arguments.length > 0) {
        this.init(bytes, offset);
    }
};
CDGTileBlockInstruction.prototype = new CDGInstruction();
CDGTileBlockInstruction.prototype.instruction = CDG_TILE_BLOCK;
CDGTileBlockInstruction.prototype.name = 'Tile Block';
CDGTileBlockInstruction.prototype.init = function(bytes, offset) {
    var doff = offset + CDG_DATA;
    // some players check bytes[doff+1] & 0x20 and ignores if it is set (?)
    this.colors = [bytes[doff] & 0x0F, bytes[doff+1] & 0x0F];
    this.row    = bytes[doff+2] & 0x1F;  
    this.column = bytes[doff+3] & 0x3F;
    this.pixels = bytes.slice(doff+4, doff+16);
    this._offset = offset;
};
CDGTileBlockInstruction.prototype.execute = function(context) {
    /* blit a tile */
    var x = this.column*context.TILE_WIDTH;
    var y = this.row*context.TILE_HEIGHT;

    var b = context.DISPLAY_BOUNDS; 
    if (x + 6 > context.WIDTH || y + 12 > context.HEIGHT) {
        cdgLog("TileBlock out of bounds (" + this.row + "," + this.column +")");
        return;
    }

    for (var i = 0; i < 12; i++) {
        var curbyte = this.pixels[i];
        for (var j = 0; j < 6; j++) {
            var color = this.colors[((curbyte >> (5-j)) & 0x1)]; 
            var offset = x+j + (y+i)*context.WIDTH;
            this.op(context, offset, color); 
        }
    }
};
CDGTileBlockInstruction.prototype.op = function(context, offset, color) {
    context.pixels[offset] = color;
};
CDGTileBlockInstruction.prototype.dump = function() {
    return this.name + '(' + this.row + ', ' + this.column + ') @' + this._offset;
};


/************************************************
 *
 * TILE_BLOCK_XOR
 * 
 ************************************************/

var CDGTileBlockXORInstruction = function(bytes, offset) {  
    if (arguments.length > 0) {
        this.init(bytes, offset);
    }
};
CDGTileBlockXORInstruction.prototype = new CDGTileBlockInstruction();
CDGTileBlockXORInstruction.prototype.instruction = CDG_TILE_BLOCK_XOR;
CDGTileBlockXORInstruction.prototype.name = 'Tile Block (XOR)';
CDGTileBlockXORInstruction.prototype.op = function(context, offset, color) {
    context.pixels[offset] = context.pixels[offset] ^ color;
};



/************************************************
 *
 * SCROLL_PRESET
 * 
 ************************************************/

var CDGScrollPresetInstruction = function(bytes, offset) {
    if (arguments.length > 0) {
        this.init(bytes, offset);
    }
};
CDGScrollPresetInstruction.prototype = new CDGInstruction();
CDGScrollPresetInstruction.prototype.instruction = CDG_SCROLL_PRESET;
CDGScrollPresetInstruction.prototype.name = 'Scroll Preset';
CDGScrollPresetInstruction.prototype.init = function(bytes, offset) {
    var doff = offset + CDG_DATA; 
    this.color = bytes[doff] & 0x0F; 
    
    var hScroll = bytes[doff+1] & 0x3F;
    this.hCmd = (hScroll & 0x30) >> 4;
    this.hOffset = (hScroll & 0x07);
    
    var vScroll = bytes[doff+2] & 0x3F; 
    this.vCmd = (vScroll & 0x30) >> 4;
    this.vOffset = (vScroll & 0x07);
};
CDGScrollPresetInstruction.prototype.execute = function(context) {
    context.hOffset = Math.min(this.hOffset, 5);
    context.vOffset = Math.min(this.vOffset, 11);
    
    var hmove = 0; 
    if (this.hCmd == CDG_SCROLL_RIGHT) {
        hmove = context.TILE_WIDTH; 
    }
    else if (this.hCmd == CDG_SCROLL_LEFT) {
        hmove = -context.TILE_WIDTH;
    }
    
    var vmove = 0; 
    if (this.vCmd == CDG_SCROLL_DOWN) {
        vmove = context.TILE_HEIGHT; 
    }
    else if (this.vCmd == CDG_SCROLL_UP) {
        vmove = -context.TILE_HEIGHT;
    }
    
    if (hmove == 0 && vmove == 0) {
        return;
    }
    
    for (var x = 0; x < context.WIDTH; x++) {
        for (var y = 0; y < context.HEIGHT; y++) {
            offx = x + hmove; 
            offy = y + ymove; 
            context.buffer[x+y*context.WIDTH] = this.getPixel(context, offx, offy);
        }
    }
    var tmp = context.pixels; 
    context.pixels = context.buffer;
    context.buffer = tmp;
};
CDGScrollPresetInstruction.prototype.getPixel = function(context, offx, offy) {
    if (offx > 0 && offx < context.WIDTH && offy > 0 && offy < context.HEIGHT) {
        return context.pixels[offx + offy*context.WIDTH];
    }
    else {
        return this.color;
    }
};



/************************************************
 *
 * SCROLL_COPY 
 * 
 ************************************************/

var CDGScrollCopyInstruction = function(bytes, offset) {  
    if (arguments.length > 0) {
        this.init(bytes, offset);
    }
};
CDGScrollCopyInstruction.prototype = new CDGScrollPresetInstruction();
CDGScrollCopyInstruction.prototype.instruction = CDG_SCROLL_COPY;
CDGScrollCopyInstruction.prototype.name = 'Scroll Copy';
CDGScrollPresetInstruction.prototype.getPixel = function(context, offx, offy) {
    offx = (offx + context.WIDTH) % context.WIDTH; 
    offy = (offy + context.HEIGHT) % context.HEIGHT;
    return context.pixels[offx + offy*context.WIDTH];
};


/************************************************
 *
 * SET_KEY_COLOR
 * 
 ************************************************/

var CDGSetKeyColorInstruction = function(bytes, offset) { 
    if (arguments.length > 0) {
        this.init(bytes, offset);
    }
};
CDGSetKeyColorInstruction.prototype = new CDGInstruction();
CDGSetKeyColorInstruction.prototype.instruction = CDG_SET_KEY_COLOR;
CDGSetKeyColorInstruction.prototype.name = 'Set Key Color';
CDGSetKeyColorInstruction.prototype.init = function(bytes, offset) {
    this.index = bytes[offset+CDG_DATA] & 0x0F;
};
CDGSetKeyColorInstruction.prototype.execute = function(context) {
    context.keyColor = this.index;
};


/************************************************
 *
 * LOAD_CLUT_LOW
 * 
 ************************************************/

var CDGLoadCLUTLowInstruction = function(bytes, offset) {
    if (arguments.length > 0) {
        this.init(bytes, offset);
    }
};
CDGLoadCLUTLowInstruction.prototype = new CDGInstruction();
CDGLoadCLUTLowInstruction.prototype.instruction = CDG_LOAD_CLUT_LOW;
CDGLoadCLUTLowInstruction.prototype.name = 'Load CLUT (Low)';
CDGLoadCLUTLowInstruction.prototype.CLUT_OFFSET = 0;
CDGLoadCLUTLowInstruction.prototype.init = function(bytes, offset) {
    var doff = offset + CDG_DATA;
    this.colors = Array(8);
    for (var i = 0; i < 8; i++) {
        var cur = doff + 2*i; 
                
        var color = (bytes[cur] & 0x3F) << 6;
        color += bytes[cur+1] & 0x3F;
        
        var rgb = Array(3);
        rgb[0] = color >> 8; // red
        rgb[1] = (color & 0xF0) >> 4; // green 
        rgb[2] = color & 0xF; // blue
        this.colors[i] = rgb;
    }
};
CDGLoadCLUTLowInstruction.prototype.execute = function(context) {
    for (var i = 0; i < 8; i++) {
        context.setCLUTEntry(i + this.CLUT_OFFSET, 
                             this.colors[i][0],
                             this.colors[i][1],
                             this.colors[i][2]);
    }
};



/************************************************
 *
 * LOAD_CLUT_HI
 * 
 ************************************************/

var CDGLoadCLUTHighInstruction = function(bytes, offset) {
    if (arguments.length > 0) {
        this.init(bytes, offset);
    }
};
CDGLoadCLUTHighInstruction.prototype = new CDGLoadCLUTLowInstruction();
CDGLoadCLUTHighInstruction.prototype.instruction = CDG_LOAD_CLUT_HI;
CDGLoadCLUTHighInstruction.prototype.name = 'Load CLUT (High)';
CDGLoadCLUTHighInstruction.prototype.CLUT_OFFSET = 8; 


/************************************************
 *
 * CDGParser
 * 
 ************************************************/

var CDGParser = function() {};
CDGParser.prototype.COMMAND_MASK = 0x3F;
CDGParser.prototype.CDG_COMMAND = 0x9;
CDGParser.prototype.PACKET_SIZE = 24;

CDGParser.prototype.BY_TYPE = {};
CDGParser.prototype.BY_TYPE[CDG_MEMORY_PRESET]  = CDGMemoryPresetInstruction;
CDGParser.prototype.BY_TYPE[CDG_BORDER_PRESET]  = CDGBorderPresetInstruction;
CDGParser.prototype.BY_TYPE[CDG_TILE_BLOCK]     = CDGTileBlockInstruction;
CDGParser.prototype.BY_TYPE[CDG_SCROLL_PRESET]  = CDGScrollPresetInstruction;
CDGParser.prototype.BY_TYPE[CDG_SCROLL_COPY]    = CDGScrollCopyInstruction;
CDGParser.prototype.BY_TYPE[CDG_SET_KEY_COLOR]  = CDGSetKeyColorInstruction;
CDGParser.prototype.BY_TYPE[CDG_LOAD_CLUT_LOW]  = CDGLoadCLUTLowInstruction;
CDGParser.prototype.BY_TYPE[CDG_LOAD_CLUT_HI]   = CDGLoadCLUTHighInstruction;
CDGParser.prototype.BY_TYPE[CDG_TILE_BLOCK_XOR] = CDGTileBlockXORInstruction;


CDGParser.prototype.parseOne = function(bytes, offset) {
    var command = bytes[offset] & this.COMMAND_MASK;
    /* if this packet is a cdg command */
    
    if (command == this.CDG_COMMAND) {
        var opcode = bytes[offset+1] & this.COMMAND_MASK;
        var InstructionType = this.BY_TYPE[opcode];
        if (typeof(InstructionType) != 'undefined') {
            return new InstructionType(bytes, offset);
        }
        else {
            cdgLog("Unknown CDG instruction (instruction = " + opcode + ")");
            return new CDGNoopInstruction();
        }
    }
    return new CDGNoopInstruction();
};

CDGParser.prototype.stringToByteArray = function(data) {
    var bytes = new Array(data.length);
    for (var i = 0; i < data.length; ++i) {
        bytes[i] = data.charCodeAt(i) & 0xFF;
    }
    return bytes;
};

CDGParser.prototype.parseDataString = function(data) {
    var instructions = new Array();
    var bytes = this.stringToByteArray(data);
    for (var offset = 0; offset < bytes.length; offset += this.PACKET_SIZE) {
        var instruction = this.parseOne(bytes, offset); 
        if (instruction != null) {
            instructions.push(instruction);
        }
    }
    return instructions;
};


/************************************************
 *
 * CDGPlayer
 * 
 ************************************************/

var CDGPlayer = function(canvas) {
    if (arguments.length > 0) {
        this.init(canvas);
    }
};
CDGPlayer.prototype.init = function(canvas) {
    this.canvas = canvas;
    this.context = new CDGContext();
    this.instructions = [];
    this.pc = -1;
    this.updater = null;
    this.startTime = 0;
};
CDGPlayer.prototype.load = function(url) {
    $.ajax({
        url: url,
        beforeSend: function( xhr ) {
          xhr.overrideMimeType( 'text/plain; charset=x-user-defined' );
        },
        context: this,
        success: function(data, status, xhr) {
            var parser = new CDGParser();
            this.instructions = parser.parseDataString(data);
            this.pc = 0;
        },
        error: function(xhr, status, error) {
          cdgLog("error loading cdg from url " + url);
        },
        
    });
};

CDGPlayer.prototype.render = function() {
    this.context.renderFrameDebug(this.canvas);
};

CDGPlayer.prototype.step = function() {
    if (this.pc >= 0 && this.pc < this.instructions.length) {
        this.instructions[this.pc].execute(this.context);
        this.pc += 1;
    }
    else {
        cdgLog("No more instructions.");
        this.pc = -1;
    }
};

CDGPlayer.prototype.fastForward = function(count) {
    var max = this.pc + count; 
    while (this.pc >= 0 && this.pc < max) {
        this.step();
    }
};

CDGPlayer.prototype.rawTicks = function() {
    return new Date().valueOf();
};

CDGPlayer.prototype.playerTicks = function() {
    return this.rawTicks() - this.startTime;
};

CDGPlayer.prototype.play = function() {
    this.startTime = this.rawTicks();
    var thisPlayer = this;
    this.updater = setInterval(function() {thisPlayer.update();}, 50);
};

CDGPlayer.prototype.stop = function() {
    if (this.updater != null) {
        clearInterval(this.updater);
    }
};

CDGPlayer.prototype.update = function() {
    if (this.pc >= 0) {
        var now = this.playerTicks();
        var pcForNow = 4*Math.floor(3*now/40); 
        var ffAmt = pcForNow - this.pc;
        if (ffAmt > 0) {
            this.fastForward(ffAmt);
            this.render();
        }
    }
};