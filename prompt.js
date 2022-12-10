
function placeprompt(){
    var mySpans = document.getElementsByTagName('p');
    for(var i=0;i<mySpans.length;i++){
        var sent = mySpans[i].innerHTML.split(' ')
        if (sent.length < 20){
            continue
        }
        mySpans[i].innerHTML = PROMPT+ mySpans[i].innerHTML;
        break
    }
}

function findNE() {
    var mySpans = document.getElementsByTagName('p');
    console.log(mySpans)
    var wrapper = document.createElement('mark');
    var firstsentend = 0;
    var firstsentstart = 0;
    var foundNE = -1;


    for(var i=2;i<mySpans.length;i++){
        var sent = mySpans[i].innerHTML.split(' ').filter(Boolean);
        if (sent.length < 20){
            continue
        }
        /*
        if (mySpans[i].firstChild.nodeType != 3){
            continue
        }
        */
        var wasPeriod = true;
        for (ii=0; ii<sent.length; ii++){
            if (!sent[ii] || sent[ii].length < 4){
                continue
            }
            if (wasPeriod){
                wasPeriod = false;
                firstsentstart = ii;
                continue
            }
            if (foundNE == -1 && sent[ii][0] === sent[ii][0].toUpperCase()) {
                console.log(sent[ii])
                console.log(sent)
                foundNE = ii;
            }
            if (sent[ii][sent[ii].length - 1] === '.' || sent[ii][sent[ii].length - 1] === '?' ){
                wasPeriod = true;
                firstsentend = ii + 1;
                break
            }
        }
        console.log("foundNE "+foundNE);
        if (foundNE){
            console.log(foundNE);
            console.log(firstsentstart);
            console.log(firstsentend);
            var words = mySpans[i].innerHTML.split(' ');
            mySpans[i].innerHTML = words.slice(0, firstsentstart).join(' ') + " <mark style=\"background-color:#ffffbb\">" + words.slice(firstsentstart, foundNE).join(' ') + " <mark id=\"FOUNDNE\" style=\"background-color:pink;\">" + words[foundNE] + "</mark> " + words.slice(foundNE+1, firstsentend).join(' ') + "</mark> " + words.slice(firstsentend).join(' ');
            break;
        }
    }
}





function switcher() {
    var s = document.getElementById('FOUNDNE').style;
    var f = 0;
    var c1 = 'lightgreen';
    var c2 = 'pink';
    var c3 = 'lightgray';

    return setInterval(function() {
        if (f == 0) {
            c = c1;
            f = 1;
        } else if (f == 1) {
            c = c2;
            f = 2;
        } else {
            c = c3;
            f = 0;
        }
        s.backgroundColor = c;
    }, 4000);
}


let PROMPT = `<div id=\"CSPROMPT\" style=\"padding:15px\">
            <div style=\"padding:15px; background-color: #fff4eb;  border: solid lightgray 1px;\">
                <table>
                    <tbody><tr><td>
                        <img src=\"` + chrome.extension.getURL('images/CSicon102.png') + "\" style=\" margin-left: auto; margin-right: auto; width:102px\">"+ `
                    </td>
                    <td style=\" padding:15px\">
                        <h2>Random Reminder: </h2>
                        <b>We see you\'re reading an article. Please consider annotating a few phrases! Just a few a day help.</b><br>
                        <small>P.S. Don\'t forget to send in your samples when you\'re all done. Thanks!</small>
                    </td>
                </tr></tbody></table>
            </div>
                </div>`
                +"<br><br>";

var mr = Math.random();
console.log(mr);
if (mr < 0.15) {
    // highlight 2nd sentence in article with a capitalized word
    findNE();
    //place banner reminder
    placeprompt();
    // turn on highlight color cycle
    swt = switcher();
    // turn off color cycle on user click
    document.addEventListener("click", function() {
        console.log('clicked');
        clearInterval(swt);
        // document.getElementById("CSPROMPT").outerHTML = "<div style=\"padding:132px\"></div>";
    }, false);
}
