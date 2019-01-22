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