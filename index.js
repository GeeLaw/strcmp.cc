function gotoState(state)
{
    rows = new Array();
    var pickersView = document.getElementById("pickers-view");
    var busyView = document.getElementById("busy-view");
    var resultView = document.getElementById("result-view");
    pickersView.className = "gl-hidden";
    busyView.className = "gl-hidden";
    resultView.className = "gl-hidden";
    switch (state)
    {
        case "pickers":
        {
            pickersView.className = "";
            break;
        }
        case "busy":
        {
            busyView.className = "";
            break;
        }
        case "result":
        {
            resultView.className = "";
            break;
        }
        default:
        {
            break;
        }
    }
}

function setFileNames(fileName1, fileName2)
{
    var picker1text = document.getElementById("file1-name");
    var picker2text = document.getElementById("file2-name");
    var picker1header = document.getElementById("file1-name-header");
    var picker2header = document.getElementById("file2-name-header");
    var pickerHeaders = document.getElementById("file-name-headers");
    picker1text.innerText = (fileName1 ? fileName1 : "");
    if (fileName1)
        picker1header.innerText = fileName1;
    picker2text.innerText = (fileName2 ? fileName2 : "");
    if (fileName2)
        picker2header.innerText = fileName2;
    if (fileName1 && fileName2)
        pickerHeaders.innerText = fileName1 + "\n<->\n" + fileName2;
}

function pickerChanged()
{
    var picker1 = document.getElementById("file1");
    var picker2 = document.getElementById("file2");
    var compareButton = document.getElementById("compare-button");
    var resetButton = document.getElementById("reset-button");
    compareButton.className = (picker1.value && picker2.value ? "" : "gl-hidden");
    resetButton.className = (picker1.value || picker2.value ? "" : "gl-hidden");
    setFileNames(
        picker1.value ? picker1.files[0].name : undefined,
        picker2.value ? picker2.files[0].name : undefined
    );
}
function resetPickers()
{
    var picker1 = document.getElementById("file1");
    var picker2 = document.getElementById("file2");
    picker1.value = null;
    picker2.value = null;
    pickerChanged();
}

function invokePicker(pickerName)
{
    var picker = document.getElementById(pickerName);
    picker.click();
}

function compareClick()
{
    const FileSizeWarning = 1024 * 1024;
    const FileSizeError = 3 * 1024 * 1024;
    gotoState("busy");
    var picker1 = document.getElementById("file1");
    var picker2 = document.getElementById("file2");
    var file1 = picker1.files[0];
    var file2 = picker2.files[0];
    if (file1.size > FileSizeError
        || file2.size > FileSizeError)
    {
        alert("You have chosen a file that is too large (more than " + FileSizeError.toString() + " bytes) to be compared.");
        gotoState("pickers");
        return;
    }
    if ((file1.size > FileSizeWarning
        || file2.size > FileSizeWarning)
        && !confirm("You have chosen a large file. It might take longer to compare the files, during which your browser might get slower.\n\nDo you still want to compare them?"))
    {
        gotoState("pickers");
        return;
    }
    resetPickers();
    var reader1 = new FileReader();
    var reader2 = new FileReader();
    var result1 = null, result2 = null;
    reader1.onload = function (e)
    {
        result1 = e.target.result;
        if (result1 != null && result2 != null)
            doCompare(result1, result2);
    };
    reader2.onload = function (e)
    {
        result2 = e.target.result;
        if (result1 != null && result2 != null)
            doCompare(result1, result2);
    };
    reader1.onerror = reader2.onerror = function ()
    {
        alert("Cannot read file.");
        gotoState("pickers");
    };
    reader1.readAsText(file1);
    reader2.readAsText(file2);
}

function animateCall(func)
{
    // Prevent blocking the UI thread.
    // The name comes from the original usage: animation.
    // The old name is here because at this
    // stage it is not necessary to refactor.
    window.setTimeout(func, 0);
}

function runDPAndContinue(dp, lines1, lines2, continuation)
{
    dp.push(new Array(lines2.length + 1));
    dp[0][0] = { value: 0, src: null };
    for (var j = 1; j <= lines2.length; ++j)
        dp[0][j] = { value: 0, src: { i: 0, j: j - 1 } };
    var i = 1;
    var backupTitle = document.title;
    var recursivelyPerformForLoop = function ()
    {
        if (i > lines1.length)
        {
            document.title = backupTitle;
            animateCall(continuation);
            return;
        }
        dp.push(new Array(lines2.length + 1));
        dp[i][0] = { value: 0, src: { i: i - 1, j: 0 } };
        for (var j = 1; j <= lines2.length; ++j)
        {
            dp[i][j] = { value: dp[i][j - 1].value, src: { i: i, j: j - 1 } };
            if (dp[i][j].value < dp[i - 1][j].value)
            {
                dp[i][j].value = dp[i - 1][j].value;
                dp[i][j].src.i = i - 1;
                dp[i][j].src.j = j;
            }
            if (lines1[i - 1] == lines2[j - 1]
                && dp[i][j].value <= dp[i - 1][j - 1].value)
            {
                dp[i][j].value = dp[i - 1][j - 1].value + 1;
                dp[i][j].src.i = i - 1;
                dp[i][j].src.j = j - 1;
            }
        }
        // Note: do not use 100.0 here, which can confuse the user.
        document.title = Math.round(i++ * 99.0 / lines1.length).toString() + "%";
        animateCall(recursivelyPerformForLoop);
    };
    animateCall(recursivelyPerformForLoop);
}

function doCompare(str1, str2)
{
    const newlineRegex = /\r\n|\n|\r/g;
    var lines1 = str1.split(newlineRegex);
    var lines2 = str2.split(newlineRegex);
    var dp = new Array();
    runDPAndContinue(dp, lines1, lines2, function ()
    {
        var resultWide = document.getElementById("result-wide");
        while (resultWide.childElementCount > 1)
            resultWide.removeChild(resultWide.lastChild);
        var resultNarrow = document.getElementById("result-narrow");
        while (resultNarrow.childElementCount > 1)
            resultNarrow.removeChild(resultNarrow.lastChild);
        
        gotoState("result");
        
        var result = document.getElementById("result");
        var resultStrcmp0 = document.getElementById("result-strcmp-0");
        var resultTotDiff = document.getElementById("result-totally-different");
        result.className = "";
        resultStrcmp0.className = "gl-hidden";
        resultTotDiff.className = "gl-hidden";
        if (lines1.length == lines2.length && dp[lines1.length][lines2.length].value == lines1.length)
        {
            resultStrcmp0.className = "";
            result.className = "gl-hidden";
            return;
        }
        if (lines1.length > 10 && lines2.length > 10 && dp[lines1.length][lines2.length].value / Math.min(lines1.length, lines2.length) < 0.25)
        {
            resultTotDiff.className = "";
            result.className = "gl-hidden";
            return;
        }
        
        rows = new Array();
        renderResult(result, dp, lines1, lines2, lines1.length, lines2.length, 0);
        
        var renderer = function ()
        {
            if (rows.length == 0)
                return;
            for (var i = Math.min(10, rows.length); i > 0; --i)
            {
                var x = rows.pop();
                resultWide.appendChild(createWideRow(x));
                resultNarrow.appendChild(createNarrowRow(x));
            }
            animateCall(renderer);
        };
        animateCall(renderer);
    });
}

var renderThreshold = 3;
var rows;

function createWideRow(line)
{
    var c1, c2, c3, c4, class1, class2;
    switch (line.type)
    {
        case "insert":
        {
            c1 = "";
            c3 = "+" + line.line2;
            c2 = "";
            c4 = line.value;
            class1 = "gl-strcmp-lack";
            class2 = "gl-strcmp-insert";
            break;
        }
        case "remove":
        {
            c1 = "-" + line.line1;
            c3 = "";
            c2 = line.value;
            c4 = "";
            class1 = "gl-strcmp-remove";
            class2 = "gl-strcmp-lack";
            break;
        }
        case "same":
        {
            c1 = line.line1;
            c3 = line.line2;
            c2 = c4 = line.value;
            class1 = class2 = "gl-strcmp-same";
            break;
        }
        case "ellipsis":
        {
            c1 = c3 = "";
            c2 = c4 = "...";
            class1 = class2 = "gl-strcmp-ellipsis";
            break;
        }
        case "eof":
        {
            c1 = c3 = "";
            c2 = c4 = "EOF";
            class1 = class2 = "gl-strcmp-eof";
            break;
        }
        default:
        {
            c1 = c2 = c3 = c4 = "";
            class1 = class2 = "gl-strcmp-ellipsis";
            break;
        }
    }
    var newRow = document.createElement("tr");
    var border1 = document.createElement("td");
    var col1 = document.createElement("td");
    var border2 = document.createElement("td");
    var col2 = document.createElement("td");
    var border3 = document.createElement("td");
    var col3 = document.createElement("td");
    var border4 = document.createElement("td");
    var col4 = document.createElement("td");
    var border5 = document.createElement("td");
    col1.innerText = c1;
    col2.innerText = c2;
    col1.className = class1 + "-line-number";
    col2.className = class1 + "-content";
    border1.className = class1 + "-border";
    border2.className = class1 + "-border";
    col3.innerText = c3;
    col4.innerText = c4;
    col3.className = class2 + "-line-number";
    col4.className = class2 + "-content";
    border3.className = class2 + "-border";
    border4.className = class2 + "-border";
    border5.className = class2 + "-border";
    newRow.appendChild(border1);
    newRow.appendChild(col1);
    newRow.appendChild(border2);
    newRow.appendChild(col2);
    newRow.appendChild(border3);
    newRow.appendChild(col3);
    newRow.appendChild(border4);
    newRow.appendChild(col4);
    newRow.appendChild(border5);
    return newRow;
}

function createNarrowRow(line)
{
    var newRow = document.createElement("tr");
    var border1 = document.createElement("td");
    var lineNum1 = document.createElement("td");
    var border2 = document.createElement("td");
    border1.className = "gl-strcmp-" + line.type + "-border";
    lineNum1.className = "gl-strcmp-" + line.type + "-line-number";
    border2.className = "gl-strcmp-" + line.type + "-border";
    newRow.appendChild(border1);
    newRow.appendChild(lineNum1);
    newRow.appendChild(border2);
    if (line.type == "same")
    {
        lineNum1.innerText = line.line1;
        var lineNum2 = document.createElement("td");
        var border3 = document.createElement("td");
        lineNum2.className = "gl-strcmp-" + line.type + "-line-number";
        border3.className = "gl-strcmp-" + line.type + "-border";
        newRow.appendChild(lineNum2);
        newRow.appendChild(border3);
        lineNum2.innerText = line.line2;
    }
    else
    {
        lineNum1.colSpan = 3;
        if (line.type == "insert")
            lineNum1.innerText = "+" + line.line2;
        else if (line.type == "remove")
            lineNum1.innerText = "-" + line.line1;
    }
    var content = document.createElement("td");
    content.className = "gl-strcmp-" + line.type + "-content";
    newRow.appendChild(content);
    content.innerText =
        line.type == "ellipsis"
        ? "..."
        : line.type == "eof"
        ? "EOF"
        : line.value;
    var border4 = document.createElement("td");
    border4.className = "gl-strcmp-" + line.type + "-border";
    newRow.appendChild(border4);
    return newRow;
}

function renderResult(resultTable, dp, lines1, lines2, i, j, renderDowncount)
{
    while (true)
    {
        if (renderDowncount == 0)
        {
            var consecutiveSame = 0;
            var ii = i, jj = j;
            while (dp[ii][jj].src != null
                && dp[ii][jj].src.i == ii - 1
                && dp[ii][jj].src.j == jj - 1)
            {
                --ii;
                --jj;
                ++consecutiveSame;
            }
            if (consecutiveSame >= renderThreshold)
            {
                i = ii + renderThreshold;
                j = jj + renderThreshold;
                rows.push({ type: "ellipsis" });
                if (i == j && i == renderThreshold)
                    return;
            }
            else if (i == lines1.length && j == lines2.length)
            {
                rows.push({ type: "eof" });
            }
        }
        if (dp[i][j].src == null)
            return;
        if (dp[i][j].src.i == i - 1
            && dp[i][j].src.j == j - 1)
        {
            --renderDowncount;
            rows.push({ type: "same", line1: i, line2: j, value: lines1[i - 1] });
            --i;
            --j;
        }
        else if (dp[i][j].src.i == i - 1)
        {
            renderDowncount = renderThreshold;
            rows.push({ type: "remove", line1: i, value: lines1[i - 1] });
            --i;
        }
        else
        {
            renderDowncount = renderThreshold;
            rows.push({ type: "insert", line2: j, value: lines2[j - 1]});
            --j;
        }
    }
}

function printResult(type)
{
    var resultTable = document.getElementById("result-" + type);
    resultTable.parentElement.removeChild(resultTable);
    resultTable.className += "-print";
    var newBody = document.createElement("body");
    newBody.appendChild(resultTable);
    document.body = newBody;
    window.print();
}

function email()
{
    window.location.href = "mailto:"
        +  rsa(document.getElementById("email-me").getAttribute("data-gl-rsa")
            .split('|').map(function (x) { return Number(x); }), 883, 272123)
            .map(function (x) { return String.fromCharCode(x); }).join('');
}

function showMitLicense()
{
    document.getElementById("mit-license").className = "";
    document.getElementById("show-license").className = "gl-hidden";
    document.getElementById("show-license-placeholder").className = "";
}

reportScriptFinish();
