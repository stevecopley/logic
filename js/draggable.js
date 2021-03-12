class Draggable {
    constructor( ctx,
                 x=(width - 100) / 2, y=(height - 100) / 2,
                 w=100, h=100,
                 label='',
                 fill='#FFC300', fore='#000', stroke='#000', thick=3 ) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.label = label;
        this.fill = fill;
        this.fore = fore;
        this.stroke = stroke;
        this.thick = thick;
        this.hover = false;
        this.drag = false;
        this.click = false;
        this.xOff = 0;
        this.yOff = 0;
    }

    clicked() {
        //console.log( `${this.constructor.name} (${this.label}) clicked` );
        // Close icon
        if( mouse.overIcon( this.x + this.w, this.y ) ) {
            this.remove();
            // Indicate that click has been acted on
            return true;
        }

        return false;
    }

    remove() {
        const index = gates.indexOf( this );
        if( index > -1 ) {
            gates.splice( index, 1 );
        }
        dirty = true;
    }

    draw() {
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.globalAlpha = 1;
        this.ctx.setLineDash([]);
        this.ctx.shadowBlur = 12;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 6;

        this.drawFill();
        this.drawBorder();
        this.drawLabel();
        this.drawActions();
    }

    interacting() {
        return this.hover && !mouse.dragging;
    }

    setLabel( newLabel ) {
        this.label = newLabel;
        this.ctx.font = "bold 24px Arial";
        let width = this.ctx.measureText( newLabel ).width + 20;
        this.w = width < this.w ? this.w : (width < 100 ? 100 : width);
    }

    drawFill() {
        this.ctx.fillStyle = this.fill;
        this.ctx.globalAlpha = this.drag || (this.hover && mouse.dragging) ? 0.7 : 1;
        this.ctx.shadowColor = this.drag ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)';
        this.ctx.fillRect( this.x, this.y, this.w, this.h );
    }

    drawBorder() {
        this.ctx.lineWidth = this.thick;
        this.ctx.strokeStyle = this.drag || this.interacting() ? '#fff' : this.stroke;
        this.ctx.shadowColor = 'rgba(0,0,0,0)';
        this.ctx.globalAlpha = 1;
        this.ctx.strokeRect( this.x, this.y, this.w, this.h );
    }

    drawLabel() {
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = this.fore;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText( this.label, this.x + this.w / 2, this.y + this.h / 2 + 2 );
    }

    drawIcon( type, x, y, colour='#000' ) {
        this.ctx.lineWidth = this.thick;
        this.ctx.strokeStyle = colour;
        this.ctx.fillStyle = '#fff';

        this.ctx.beginPath();
        this.ctx.arc( x, y, 10, 0, Math.PI * 2 );
        this.ctx.fill();

        this.ctx.beginPath();

        switch( type ) {
            case 'X':
                this.ctx.moveTo( x - 5, y - 5 );
                this.ctx.lineTo( x + 5, y + 5 );
                this.ctx.moveTo( x + 5, y - 5 );
                this.ctx.lineTo( x - 5, y + 5 );
                break;

            case '+':
                this.ctx.moveTo( x,     y - 5 );
                this.ctx.lineTo( x,     y + 5 );
                this.ctx.moveTo( x - 5, y );
                this.ctx.lineTo( x + 5, y );
                break;

            case '-':
                this.ctx.moveTo( x - 5, y );
                this.ctx.lineTo( x + 5, y );
                break;

            case '>':
                this.ctx.moveTo( x - 3, y + 5 );
                this.ctx.lineTo( x + 3, y );
                this.ctx.lineTo( x - 3, y - 5 );
                break;

            case 'edit':
                this.ctx.moveTo( x + 3, y - 6 );
                this.ctx.lineTo( x - 4, y + 1 );
                this.ctx.lineTo( x - 5, y + 5 );
                this.ctx.lineTo( x - 0, y + 4 );
                this.ctx.lineTo( x + 6, y - 3 );
                this.ctx.lineTo( x + 3, y - 6 );
                break;

            default:
                break;
        }

        this.ctx.stroke();
    }

    drawActions() {
        if( this.interacting() ) {
            this.drawIcon( 'X', this.x + this.w, this.y, '#f00' );
        }
    }
}


