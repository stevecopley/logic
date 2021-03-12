var mouse = {
    x: 0,
    y: 0,

    down: false,
    dragging: false,

    connecting: false,
    connectFrom: null,

    startConnecting: function( from ) {
        this.connecting = true;
        this.connectFrom = from;
    },

    stopConnecting: function() {
        this.connecting = false;
        this.connectFrom = null;
    },

    overItem: function( rect ) {
        return this.x > (rect.x - 10) &&
               this.x < (rect.x + rect.w + 10) &&
               this.y > (rect.y - 10) &&
               this.y < (rect.y + rect.h + 10);
    },

    overIcon: function( x, y ) {
        return this.x > (x - 10) &&
               this.x < (x + 10) &&
               this.y > (y - 10) &&
               this.y < (y + 10);
    }
};


