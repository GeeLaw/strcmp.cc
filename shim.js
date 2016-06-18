if (!Array.prototype.fill)
{
    Object.defineProperty(Array.prototype, "fill",
    {
        configurable: false,
        writable: false,
        enumerable: false,
        value: function (val, start, end)
        {
            if (this == null || this == undefined)
                return this;
            if (!(this.length instanceof Number || typeof this.length == "number"))
                return this;
            if (!(start instanceof Number || typeof start == "number"))
                start = 0;
            start = start >>> 0;
            if (!(end instanceof Number || typeof end == "number"))
                end = this.length;
            end = end >>> 0;
            for (var i = start; i < end; ++i)
                this[i] = val;
            return this;
        }
    });
}

reportScriptFinish();
