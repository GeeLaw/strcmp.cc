function fast_mod_power(base, exponent, modulo)
{
    var result = 1;
    base %= modulo;
    exponent = exponent >>> 0;
    while (exponent > 0)
    {
        if ((exponent & 1) == 1)
            result = result * base % modulo;
        base = base * base % modulo;
        exponent >>= 1;
    }
    return result;
}

function rsa(data, pk, N)
{
    return data.map(function (x)
    {
        return fast_mod_power(x, pk, N);
    });
}

reportScriptFinish();
