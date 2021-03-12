/********************
 * TODO
 * circular ref detection
 * Link to self (aloow and routing)
 *
 * Breadth-first search of 'tree' - leafs are bulbs and/or previously visited gates
 * https://levelup.gitconnected.com/finding-the-shortest-path-in-javascript-pt-1-breadth-first-search-67ae4653dbec
 *
 ********************/

const canvas = document.createElement( 'canvas' );
const ctx2d = canvas.getContext( '2d' );
document.body.appendChild( canvas );

const rect = canvas.parentNode.getBoundingClientRect();
let width = canvas.width = rect.width;
let height = canvas.height = rect.height;

let linkHue = 0;
const linkHueStep = 227;

let dirty = false;

let gates = [];

canvas.onmousemove = mousemove;
canvas.onmousedown = mousedown;
canvas.onmouseup = mouseup;
window.onresize = resize;
file.onchange = loadCircuit;

window.requestAnimationFrame( loop );



//------------------------------------------------------------------------
function loop() {
    clear();
    //updateCircuit();
    updateUI();
    drawUI();
    window.requestAnimationFrame( loop );
}


//------------------------------------------------------------------------
Number.prototype.clamp = Number.prototype.clamp || function (min, max) {
    return this < min ? min : (this > max ? max : this);
};



//------------------------------------------------------------------------
//------------------------------------------------------------------------
class Gate extends Draggable {

    constructor( ctx, x, y, { numInputs=2,
                              minInputs=2,
                              maxInputs=8,
                              hasOutput=true,
                              terminator=false,
                              label='GATE',
                              on=false,
                              backColour='#555',
                              foreColour='#000' } = {} ) {
        super( ctx, x, y,
               terminator ? 100 : 60,
               terminator ? 40  : (numInputs > 2 ? (numInputs - 2) * 40 + 100 : 100),
               label,
               backColour,
               foreColour );

        numInputs = numInputs > maxInputs ? maxInputs : (numInputs < minInputs ? minInputs : numInputs);
        this.minInputs = minInputs;
        this.maxInputs = maxInputs;
        this.terminator = terminator;
        this.updated = false;

        this.inputs = [];
        for( let i = 0; i < numInputs; i++ ) {
            this.inputs.push( {
                x : () => this.x,
                y : () => this.y + (this.terminator ? this.h / 2 : ((this.inputs.length < 2 ? 50 : 30) + i * 40)),
                link : null
            } );
        }

        if( hasOutput ) {
            this.output = {
                x : () => this.x + this.w,
                y : () => this.y + this.h / 2,
                links: [],
                active: on
            };
        }

        //this.linkColour = 'hsl(' + 360 * Math.random() + ', 50%, 50%)';
        this.linkHue = linkHue;
        linkHue += linkHueStep;

        console.log( this );
    }

    setLabel( newLabel ) {
        super.setLabel( newLabel );

        if( !this.terminator ) {
            this.w = 60;
            this.ctx.font = "bold 30px Arial";
            let height = this.ctx.measureText( newLabel ).width + 20;
            this.h = height < this.h ? this.h : (height < 100 ? 100 : height);
        }
    }


    connectInput( index, targetGate ) {
        if( index < this.inputs.length ) {
            this.inputs[index].link = targetGate;
            targetGate.output.links.push( { gate : this, index : index } );
        }
    }

    connectOutput( targetGate, targetIndex ) {
        if( targetIndex < targetGate.inputs.length ) {
            targetGate.inputs[targetIndex].link = this;
            this.output.links.push( { gate: targetGate, index: targetIndex } );
        }
    }

    disconnectInput( index ) {
        if( index < this.inputs.length && this.inputs[index].link ) {
            this.inputs[index].link = null;
        }
    }

    disconnectOutput( targetGate, targetIndex ) {
        if( this.output ) {
            for( const [index, link] of Object.entries( this.output.links ) ) {
                if( link.gate == targetGate && link.index == targetIndex ) {
                    this.output.links.splice( index, 1 );
                    break;
                }
            }
        }
    }

    clicked() {
        if( super.clicked() ) {
            // Has click already been processed?
            return true;
        }

        // Edit
        if( this.terminator && mouse.overIcon( this.x + this.w - 20, this.y ) ) {
            var label = prompt( 'Enter label', this.label );
            if( label != null && label != '' ) {
                this.setLabel( label );
                dirty = true;
            }
            return true;
        }

        // Add Inout
        if( this.inputs.length < this.maxInputs && mouse.overIcon( this.x, this.y + this.h ) ) {
            let i = this.inputs.length;
            this.inputs.push( {
                x : () => this.x,
                y : () => this.y + 30 + i * 40,
                link : null
            } );
            this.h += 40;
            dirty = true;

            return true;
        }

        // Delete Inout
        if( this.inputs.length > this.minInputs && mouse.overIcon( this.x + 20, this.y + this.h ) ) {
            let input = this.inputs.pop();
            if( input.link ) {
                input.link.disconnectOutput( this, inputs.length );
                input.link = null;
            }
            this.h -= 40;
            dirty = true;

            return true;
        }

        // Inputs
        if( mouse.connectFrom != this ) {
            for( const [index, input] of Object.entries( this.inputs ) ) {
                if( mouse.overIcon( input.x(), input.y() ) ) {
                    if( input.link ) {
                        // Delete link
                        input.link.disconnectOutput( this, index );
                        input.link = null;
                    }
                    if( mouse.connecting ) {
                        this.connectInput( index, mouse.connectFrom );
                        mouse.stopConnecting();
                    }
                    dirty = true;
                    return true;
                }
            }
        }

        // Output
        if( mouse.connectFrom != this ) {
            // Only if not connecting
            if( !mouse.connecting ) {
                if( this.output ) {
                    if( mouse.overIcon( this.output.x(), this.output.y() ) ) {
                        // Start connecting
                        mouse.startConnecting( this );
                        dirty = true;
                        return true;
                    }
                }
            }
        }

        return false;
    }

    remove() {
        for( const [index, input] of Object.entries( this.inputs ) ) {
            if( input.link ) {
                input.link.disconnectOutput( this, index );
                input.link = null;
            }
        }

        if( this.output && this.output.links.length > 0 ) {
            this.output.links.forEach( (link) => {
                link.gate.disconnectInput( link.index );
            } );
            this.output.links = [];
        }

        super.remove();
    }

    updateOutput() {
        if( this.updated || !this.output ) return;
        this.updated = true;
        this.output.links.forEach( (link) => { link.gate.updateOutput(); } );
    }

    draw() {
        this.drawInputs();
        this.drawOutput();
        super.draw();
    }

    drawInputs() {
        this.ctx.lineWidth = this.thick;
        this.inputs.forEach( (input) => {
            this.ctx.fillStyle = input.link ? (input.link.output.active ? '#ff0' : '#000') : '#333';
            this.ctx.beginPath();
            this.ctx.arc( input.x(), input.y(), 10, Math.PI / 2, Math.PI * 3 / 2 );
            this.ctx.fill();
        } );
    }

    drawOutput() {
        this.ctx.lineWidth = this.thick;
        if( this.output ) {
            this.ctx.fillStyle = this.output.active ? '#ff0' : (this.output.links.length > 0 ? '#000' : '#333');
            this.ctx.beginPath();
            this.ctx.arc( this.output.x(), this.output.y(), 10, -Math.PI / 2, Math.PI / 2 );
            this.ctx.fill();
        }
    }

    drawLabel() {
        if( this.terminator ) {
            super.drawLabel();
        }
        else {
            this.ctx.save();
            this.ctx.translate( this.x, this.y );
            this.ctx.rotate( -Math.PI / 2 );
            this.ctx.translate( -this.h, 0 );
            this.ctx.font = 'bold 30px Arial';
            this.ctx.fillStyle = this.fore;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText( this.label, this.h / 2, this.w / 2 + 2 );
            this.ctx.restore();
        }
    }


    drawActions() {
        // Only add base actions if not in connecting mode
        if( this.interacting() && !mouse.connecting ) {
            // Standard delete
            super.drawActions();

            // Add / remove inputs
            if( this.inputs.length < this.maxInputs ) {
                this.drawIcon( '+', this.x, this.y + this.h, '#090' );
            }
            if( this.inputs.length > this.minInputs ) {
                this.drawIcon( '-', this.x + 20, this.y + this.h, '#f00' );
            }

            if( this.terminator ) {
                this.drawIcon( 'edit', this.x + this.w - 20, this.y, '#333' );
            }
        }

        // Only add actions tp in/out if not connecting from here
        if( this.interacting() && mouse.connectFrom != this ) {

            // Either not connecting, or we are, but from an output
            this.inputs.forEach( (input) => {
                // Show disconnects for links, unless in connection mode
                if( mouse.connecting ) {
                    this.drawIcon( '>', input.x(), input.y(), '#00c' );
                }
                else if( input.link ) {
                    this.drawIcon( 'X', input.x(), input.y(), '#00c' );
                }
            } );

            // If not connecting
            if( !mouse.connecting ) {
                if( this.output ) {
                    this.drawIcon( '>', this.output.x(), this.output.y(), '#00c' );
                }
            }
        }
    }
}


//------------------------------------------------------------------------
class SWITCH extends Gate {
    constructor( ctx, x, y, label='IN', on=false ) {

        super( ctx, x, y, { numInputs : 0,
                            minInputs : 0,
                            maxInputs : 0,
                            terminator : true,
                            label: label,
                            on: on } );
    }

    drawFill() {
        this.ctx.fillStyle = this.output.active? '#ff0' : this.fill;
        this.ctx.globalAlpha = this.drag || (this.hover && mouse.dragging) ? 0.7 : 1;
        this.ctx.shadowColor = this.drag ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)';
        this.ctx.fillRect( this.x, this.y, this.w, this.h );
    }

    clicked() {
        // Only toggle if button wasn't handled (false from super)
        if( !super.clicked() ) {
            this.output.active = !this.output.active;
            updateCircuit( this );

            // FIX THIS! Get gates to somehow update selves...?
            gates.forEach( (item) => {
                if( item.label == this.label && item.terminator && item.output ) {
                    item.output.active = this.output.active;
                }
            } );
        }
    }
}


//------------------------------------------------------------------------
class BULB extends Gate {
    constructor( ctx, x, y, label='OUT' ) {

        super( ctx, x, y, { numInputs : 1,
                            minInputs : 1,
                            maxInputs : 1,
                            hasOutput : false,
                            terminator : true,
                            label: label } );
    }

    drawFill() {
        this.ctx.fillStyle = this.inputs[0].link ? (this.inputs[0].link.output.active ? '#ff0' : this.fill) : this.fill;
        this.ctx.globalAlpha = this.drag || (this.hover && mouse.dragging) ? 0.7 : 1;
        this.ctx.shadowColor = this.drag ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)';
        this.ctx.fillRect( this.x, this.y, this.w, this.h );
    }
}

//------------------------------------------------------------------------
class NOT extends Gate {

    constructor( ctx, x, y ) {
        super( ctx, x, y, { label : 'NOT', numInputs : 1, minInputs : 1, maxInputs : 1, backColour: '#f44336' } );
    }

    updateOutput() {
        if( this.updated ) return;

        let input = this.inputs[0];
        let inputValue = input.link ? input.link.output.active : false;
        this.output.active = !inputValue;

        super.updateOutput();
    }
}

//------------------------------------------------------------------------
class AND extends Gate {

    constructor( ctx, x, y, numInputs ) {
        super( ctx, x, y, { label : 'AND', numInputs : numInputs, backColour: '#2196f3' } );
    }

    updateOutput() {
        if( this.updated ) return;

        let active = true;
        this.inputs.forEach( (input) => {
            let inputValue = input.link ? input.link.output.active : false;
            active &&= inputValue;
        } );
        this.output.active = active;

        super.updateOutput();
    }
}

//------------------------------------------------------------------------
class OR extends Gate {

    constructor( ctx, x, y, numInputs ) {
        super( ctx, x, y, { label : 'OR', numInputs : numInputs, backColour: '#4caf50' } );
    }

    updateOutput() {
        if( this.updated ) return;

        let active = false;
        this.inputs.forEach( (input) => {
            let inputValue = input.link ? input.link.output.active : false;
            active ||= inputValue;
        } );
        this.output.active = active;

        super.updateOutput();
    }
}


//------------------------------------------------------------------------
class XOR extends Gate {

    constructor( ctx, x, y, numInputs ) {
        super( ctx, x, y, { label : 'XOR', numInputs : numInputs, backColour: '#00bcd4' } );
    }

    updateOutput() {
        if( this.updated ) return;

        let active = false;
        this.inputs.forEach( (input) => {
            let inputValue = input.link ? input.link.output.active : false;
            active ^= inputValue;
        } );
        this.output.active = active;

        super.updateOutput();
    }
}

//------------------------------------------------------------------------
class NAND extends Gate {

    constructor( ctx, x, y, numInputs ) {
        super( ctx, x, y, { label : 'NAND', numInputs : numInputs, backColour: '#ba68c8' } );
    }

    updateOutput() {
        if( this.updated ) return;

        let active = false;
        this.inputs.forEach( (input) => {
            let inputValue = input.link ? input.link.output.active : false;
            active ||= !inputValue;
        } );
        this.output.active = active;

        super.updateOutput();
    }
}

//------------------------------------------------------------------------
class NOR extends Gate {

    constructor( ctx, x, y, numInputs ) {
        super( ctx, x, y, { label : 'NOR', numInputs : numInputs, backColour: '#ff9800' } );
    }

    updateOutput() {
        if( this.updated ) return;

        let active = true;
        this.inputs.forEach( (input) => {
            let inputValue = input.link ? input.link.output.active : false;
            active &&= !inputValue;
        } );
        this.output.active = active;

        super.updateOutput();
    }
}



//------------------------------------------------------------------------
function saveCircuit() {
    let gateData = [];

    gates.forEach( (gate) => {
        let gateInfo = {
            type    : gate.constructor.name,
            x       : gate.x,
            y       : gate.y,
            label   : (gate.terminator ? gate.label : null),
            inputs  : []
        };

        gate.inputs.forEach( (input) => {
            if( input.link ) {
                gateInfo.inputs.push( gates.indexOf( input.link ) );
            }
        } );

        gateData.push( gateInfo );
    } );

    const json = JSON.stringify( gateData, null, '  ' );
    const blob = new Blob( [json], { type : 'octet/stream' } );
    const filename = 'circuit.json';

    let newLink = document.createElement( 'a' );
    newLink.download = filename;

    if( window.webkitURL != null ) {
        newLink.href = window.webkitURL.createObjectURL( blob );
    }
    else {
        newLink.href = window.URL.createObjectURL( blob );
    }

    newLink.style.display = 'none';
    document.body.appendChild( newLink );
    newLink.click();
}


function loadCircuit() {
    closeFilePick();

    let input = document.getElementById( 'file' );

    if( input.files[0] ) {
        let file = input.files[0];
        let fr = new FileReader();

        fr.onload = () => {
            let gateData = JSON.parse( fr.result );
            console.log( gateData );

            gates = [];

            // Add in gates
            gateData.forEach( (gate) => {
                let newGate = getGate( gate.type );

                if( newGate ) {
                    newGate.x = gate.x;
                    newGate.y = gate.y;
                    if( gate.label ) newGate.setLabel( gate.label );
                    gates.push( newGate );
                }
            } );

            // Make connections
            for( const [index, gateInfo] of Object.entries( gateData ) ) {
                for( const [inputIndex, gateIndex] of Object.entries( gateInfo.inputs ) ) {
                    gates[index].connectInput( inputIndex, gates[gateIndex] );
                }
            }

            dirty = false;
        };

        fr.readAsText( file );
    }
}


function clearCircuit() {
    if( dirty ) {
        if( !confirm( 'You have unsaved changes. Ok to discard them?' ) ) return;
    }
    gates = [];
}


function openFilePick() {
    if( dirty ) {
        if( !confirm( 'You have unsaved changes. Ok to discard them?' ) ) return;
    }
    document.getElementById( 'filepick' ).style.display = 'block';
}


function closeFilePick() {
    document.getElementById( 'filepick' ).style.display = 'none';
}



//------------------------------------------------------------------------


function addGate( el ) {
    let gateType = el.classList[0];

    console.log( `Adding ${gateType}...` );

    let newGate = getGate( gateType );

    if( newGate ) {
        gates.push( newGate );
    }

    dirty = true;
}


function getGate( gateType ) {

    switch( gateType.toLowerCase() ) {
        case 'switch':
            return new SWITCH( ctx2d );
        case 'bulb':
            return new BULB( ctx2d );
        case 'not':
            return new NOT( ctx2d );
        case 'and':
            return new AND( ctx2d );
        case 'or':
            return new OR( ctx2d );
        case 'xor':
            return new XOR( ctx2d );
        case 'nand':
            return new NAND( ctx2d );
        case 'nor':
            return new NOR( ctx2d );
        default:
            return null;
    }
}



//------------------------------------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


function resize() {
    let rect = canvas.parentNode.getBoundingClientRect();
    width = canvas.width = rect.width;
    height = canvas.height = rect.height;
}

function clear() {
    ctx2d.clearRect(0, 0, width, height);
}

function updateUI() {
    gates.forEach( (gate) => {
        gate.hover = mouse.overItem( gate );

        //if (shape.hover && mouse.down) {
        if( mouse.down ) {
            if( gate.drag ) {
                gate.x = Math.round( (mouse.x - gate.xOff) / 10 ) * 10;
                gate.y = Math.round( (mouse.y - gate.yOff) / 10 ) * 10;
            }
        }
        else {
            gate.drag = false;
        }

        gate.x = gate.x.clamp( 0, width  - gate.w );
        gate.y = gate.y.clamp( 0, height - gate.h );
    } );
}

function updateCircuit( rootGate ) {
    rootGate.output.links.forEach( (link) => {
        gates.forEach( (gateToClear) => { gateToClear.updated = false; } );
        link.gate.updateOutput();
    } );
}


//------------------------------------------------------------------------
function drawUI() {
    gates.forEach( (gate) => gate.draw() );
    drawConnections();
    drawMouseConnection();

    canvas.style.cursor = mouse.connecting ? 'grabbing' : 'default';
    gates.some( (gate) => {
        if( gate.drag ) {
            canvas.style.cursor = 'grabbing';
            return true;
        }
    } );
}


function drawMouseConnection() {
    let start = { x : 0, y : 0 };
    let end   = { x : mouse.x, y : mouse.y };

    if( mouse.connectFrom ) {
        start.x = mouse.connectFrom.output.x();
        start.y = mouse.connectFrom.output.y();
    }
    else {
        mouse.stopConnecting();
    }

    if( mouse.connecting ) {
        ctx2d.lineCap = 'round';
        ctx2d.lineJoin = 'round';
        ctx2d.lineWidth = 5;
        ctx2d.strokeStyle = '#fff';
        ctx2d.fillStyle = '#fff';
        ctx2d.globalAlpha = 0.7;
        ctx2d.setLineDash([5, 10]);

        ctx2d.beginPath();
        ctx2d.moveTo( start.x, start.y );
        ctx2d.lineTo( end.x, end.y );
        ctx2d.stroke();

        ctx2d.beginPath();
        ctx2d.arc( start.x, start.y, 10, 0, Math.PI * 2 );
        ctx2d.fill();

        ctx2d.beginPath();
        ctx2d.arc( end.x, end.y, 10, 0, Math.PI * 2 );
        ctx2d.fill();
    }
}

function drawConnections() {
    ctx2d.lineCap = 'butt';
    ctx2d.lineJoin = 'round';
    ctx2d.lineWidth = 5;
    ctx2d.globalAlpha = 1;
    ctx2d.setLineDash([]);

    gates.forEach( (gate) => {
        let inputsUsed = [];

        for( let i = 0; i < gate.inputs.length; i++ ) {
            if( gate.inputs[i].link ) {
                inputsUsed.push(i);
            }
        }

        for( let i = 0; i < inputsUsed.length; i++ ) {
            let input = gate.inputs[inputsUsed[i]];
            let outputGate = input.link;
            let output = outputGate.output;

            let start = { x : output.x(), y : output.y() };
            let end   = { x : input.x(),  y : input.y() };

            let outputGateToLeft  = (outputGate.x + outputGate.w <= gate.x - 30);
            let outputGateAbove   = (outputGate.y + outputGate.h <= gate.y - 20);
            let outputGateBelow   = (outputGate.y >= gate.y + gate.h + 20);

            let vertOverlap  = !outputGateBelow && !outputGateAbove;

            let inputIsAtTop   = end.y < (gate.y + gate.h / 2);
            let routeRoundTop  =  inputIsAtTop && (start.y <= gate.y + gate.h) ||
                                 !inputIsAtTop && (start.y <= gate.y);
            let routeRoundLeft = outputGate.x <= gate.x;

            let routeTopY  = (outputGate.y <= gate.y ? outputGate.y : gate.y) - 10;
            let routeBotY  = (outputGate.y + outputGate.h <= gate.y + gate.h ? gate.y + gate.h : outputGate.y + outputGate.h ) + 10;
            let routeLeftX = outputGate.x - 20;

            ctx2d.strokeStyle = outputGate.output.active ? `hsl(${outputGate.linkHue}, 100%, 80%)` :
                                                           `hsl(${outputGate.linkHue}, 100%, 10%)`;

            ctx2d.beginPath();
            ctx2d.moveTo( start.x + 10, start.y );

            if( outputGateToLeft ) {
                //ctx2d.lineTo( start.x + 10 + (end.x - start.x - 20) / 5, start.y );
                //ctx2d.lineTo( end.x   - 10 - (end.x - start.x - 20) / 5, end.y );
                //ctx2d.lineTo( start.x + 15 + Math.abs(end.x - start.x - 35) / 5, start.y );
                //ctx2d.lineTo( end.x - 15 - Math.abs(end.x - start.x - 35) / 5, end.y );
                ctx2d.lineTo( start.x + 20, start.y );
                ctx2d.lineTo( end.x - 15 - Math.abs(end.x - start.x - 35) * 0.8, end.y );
                //ctx2d.lineTo( start.x + 15, start.y );
                //ctx2d.lineTo( end.x - 15, end.y );
            }
            else if( vertOverlap && !outputGateToLeft) {
                ctx2d.lineTo( start.x + 20,      start.y );
                ctx2d.lineTo( start.x + 20,      routeRoundTop ? routeTopY : routeBotY );
                ctx2d.lineTo( outputGate.x - 20, routeRoundTop ? routeTopY : routeBotY );
                ctx2d.lineTo( routeRoundLeft ? routeLeftX : end.x - 20, routeRoundTop ? gate.y - 10 : gate.y + gate.h + 10 );
                ctx2d.lineTo( routeRoundLeft ? routeLeftX : end.x - 20, end.y );
            }
            else if( !vertOverlap && !outputGateToLeft ) {
                ctx2d.lineTo( start.x + 20, start.y );
                ctx2d.lineTo( start.x + 20, outputGateBelow ? outputGate.y - 10 : outputGate.y + outputGate.h + 10 );
                ctx2d.lineTo( end.x - 20,   outputGateAbove ? gate.y - 10       : gate.y + gate.h + 10 );
                ctx2d.lineTo( end.x - 20,   end.y );
            }


            ctx2d.lineTo( end.x - 10, end.y );
            ctx2d.stroke();
        }
    } );
}


//------------------------------------------------------------------------
function mousemove(e) {
    mouse.x = e.pageX - canvas.offsetLeft;
    mouse.y = e.pageY - canvas.offsetTop;

    gates.some( (gate) => {
        if( gate.click ) {
            gate.click = false;
            gate.drag = true;
            mouse.dragging = true;
            dirty = true;
            return true;
        }
    } );
}

function mousedown(e) {
    mouse.down = true;
    mouse.dragging = false;

    gates.forEach( (gate) => {
        gate.drag = false;
        gate.click = false;
    } );

    let somethingClicked = false;

    gates.reverse().some( (gate) => {
        if( gate.hover ) {
            gate.click = true;
            gate.xOff = mouse.x - gate.x;
            gate.yOff = mouse.y - gate.y;
            somethingClicked = true;
            return true;
        }
    } );
    gates.reverse();

    if( !somethingClicked ) {
        mouse.stopConnecting();
    }
}

function mouseup(e) {
    mouse.down = false;
    mouse.dragging = false;

    gates.forEach( (gate) => {
        if( gate.click ) {
            gate.clicked();
        }

        gate.click = false;
        gate.drag = false;
    } );
}
