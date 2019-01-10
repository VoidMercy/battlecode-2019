export var Compress8Bits = function(x, y) {
    var ans = (Math.floor(x/4) << 4) + Math.floor(y/4);
    return ans;
}

export var Decompress8Bits = function(num) {
    var x = num >> 4;
    var y = num % (1 << 4);
    return [4*x + 1, 4*y + 1];
}

export var Compress12Bits = function(x, y) {
    if(x < 0 || x >= 64) throw "Invalid x";
    if(y < 0 || y >= 64) throw "Invalid y";
    var ans = (x << 6) + y;
    return ans;
}

export var Decompress12Bits = function(num) {
    var x = num >> 6;
    var y = num % (1 << 6);
    return [x, y];
}
